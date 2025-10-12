-- Final migration to fix duplicate posts and unified reviews
-- This replaces all previous attempts with a clean implementation

-- 1. Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS prevent_duplicate_checkins ON public.posts;
DROP FUNCTION IF EXISTS public.check_duplicate_checkin();

-- 2. Create the duplicate prevention function
CREATE OR REPLACE FUNCTION public.check_duplicate_checkin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for duplicates based on user_id (for authenticated users)
  IF NEW.user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.posts 
    WHERE user_id = NEW.user_id 
    AND cafe_id = NEW.cafe_id 
    AND DATE(created_at) = DATE(NEW.created_at)
  ) THEN
    RAISE EXCEPTION 'Duplicate check-in: User has already checked in to this cafe today';
  END IF;
  
  -- Check for duplicates based on device_id (for anonymous users)
  IF NEW.device_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.posts 
    WHERE device_id = NEW.device_id 
    AND cafe_id = NEW.cafe_id 
    AND DATE(created_at) = DATE(NEW.created_at)
  ) THEN
    RAISE EXCEPTION 'Duplicate check-in: Device has already checked in to this cafe today';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. Create the trigger
CREATE TRIGGER prevent_duplicate_checkins
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_duplicate_checkin();

-- 4. Drop existing view and function if they exist
DROP VIEW IF EXISTS public.cafe_reviews_unified;
DROP FUNCTION IF EXISTS public.get_cafe_reviews_unified(UUID, INTEGER);

-- 5. Create the unified reviews view
CREATE OR REPLACE VIEW public.cafe_reviews_unified AS
SELECT 
  'cafe_review' as review_type,
  id,
  cafe_id,
  reviewer_name,
  rating,
  review_text as text_review,
  profile_photo_url,
  time as created_at,
  source,
  NULL as username,
  NULL as device_id,
  NULL as image_url,
  NULL as tags
FROM public.cafe_reviews
WHERE cafe_id IS NOT NULL

UNION ALL

SELECT 
  'post_review' as review_type,
  id,
  cafe_id,
  COALESCE(username, 'Anonymous') as reviewer_name,
  rating,
  text_review,
  NULL as profile_photo_url,
  created_at,
  'user' as source,
  username,
  device_id,
  image_url,
  tags
FROM public.posts
WHERE cafe_id IS NOT NULL 
  AND text_review IS NOT NULL 
  AND text_review != '';

-- 6. Create the unified reviews function
CREATE OR REPLACE FUNCTION public.get_cafe_reviews_unified(p_cafe_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  review_type TEXT,
  id UUID,
  cafe_id UUID,
  reviewer_name TEXT,
  rating INTEGER,
  text_review TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ,
  source TEXT,
  username TEXT,
  device_id TEXT,
  image_url TEXT,
  tags TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.review_type,
    cr.id,
    cr.cafe_id,
    cr.reviewer_name,
    cr.rating,
    cr.text_review,
    cr.profile_photo_url,
    cr.created_at,
    cr.source,
    cr.username,
    cr.device_id,
    cr.image_url,
    cr.tags
  FROM public.cafe_reviews_unified cr
  WHERE cr.cafe_id = p_cafe_id
  ORDER BY cr.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_device_cafe ON public.posts(device_id, cafe_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_user_cafe ON public.posts(user_id, cafe_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_cafe_review ON public.posts(cafe_id) WHERE text_review IS NOT NULL AND text_review != '';

-- Add comments
COMMENT ON VIEW public.cafe_reviews_unified IS 'Unified view combining cafe_reviews and check-in reviews from posts';
COMMENT ON FUNCTION public.get_cafe_reviews_unified IS 'Function to get unified reviews for a cafe including both traditional reviews and check-in reviews';
