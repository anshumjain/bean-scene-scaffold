-- Complete database setup - all tables, indexes, and RLS policies
-- This ensures the database structure is correct before any data seeding

-- Drop existing views and functions that might be broken
DROP VIEW IF EXISTS public.cafe_reviews_unified CASCADE;
DROP FUNCTION IF EXISTS public.get_cafe_reviews_unified(UUID, INTEGER) CASCADE;

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS prevent_duplicate_checkins ON public.posts;
DROP FUNCTION IF EXISTS public.check_duplicate_checkin() CASCADE;

-- Create cafes table
CREATE TABLE IF NOT EXISTS public.cafes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  latitude DECIMAL NOT NULL,
  longitude DECIMAL NOT NULL,
  rating DECIMAL,
  google_rating DECIMAL,
  price_level INTEGER,
  phone_number TEXT,
  website TEXT,
  opening_hours TEXT[],
  photos TEXT[],
  hero_photo_url TEXT,
  google_photo_reference TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_rating DECIMAL,
  photo_source TEXT DEFAULT 'google'
);

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  username TEXT UNIQUE,
  device_id TEXT
);

-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE,
  place_id TEXT,
  image_url TEXT,
  image_urls TEXT[] DEFAULT '{}',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  text_review TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  username TEXT,
  device_id TEXT,
  source TEXT DEFAULT 'user',
  photo_source TEXT DEFAULT 'user'
);

-- Create cafe_reviews table
CREATE TABLE IF NOT EXISTS public.cafe_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  profile_photo_url TEXT,
  time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'google'
);

-- Create cafe_photos table
CREATE TABLE IF NOT EXISTS public.cafe_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  uploaded_by TEXT,
  is_hero BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  photo_source TEXT DEFAULT 'user'
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cafe_id, user_id),
  UNIQUE(cafe_id, device_id)
);

-- Create user_activities table
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('check_in', 'review', 'photo', 'favorite')),
  device_id TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tag_reports table
CREATE TABLE IF NOT EXISTS public.tag_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  device_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cafe_id, tag, device_id)
);

-- Create api_usage_logs table (if referenced elsewhere)
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  device_id TEXT,
  ip_address INET,
  user_agent TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback table (if referenced elsewhere)
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  device_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'general')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tips table (if referenced elsewhere)
CREATE TABLE IF NOT EXISTS public.tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT,
  tip_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create all indexes for performance
CREATE INDEX IF NOT EXISTS idx_cafes_place_id ON public.cafes(place_id);
CREATE INDEX IF NOT EXISTS idx_cafes_neighborhood ON public.cafes(neighborhood);
CREATE INDEX IF NOT EXISTS idx_cafes_photo_source ON public.cafes(photo_source);
CREATE INDEX IF NOT EXISTS idx_cafes_is_active ON public.cafes(is_active);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_device_id ON public.users(device_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_cafe_id ON public.posts(cafe_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_device_id ON public.posts(device_id);
CREATE INDEX IF NOT EXISTS idx_posts_username ON public.posts(username);
CREATE INDEX IF NOT EXISTS idx_cafe_reviews_cafe_id ON public.cafe_reviews(cafe_id);
CREATE INDEX IF NOT EXISTS idx_cafe_reviews_time ON public.cafe_reviews(time DESC);
CREATE INDEX IF NOT EXISTS idx_cafe_photos_cafe_id ON public.cafe_photos(cafe_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_cafe_id ON public.favorites(cafe_id);
CREATE INDEX IF NOT EXISTS idx_favorites_device_id ON public.favorites(device_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_cafe_id ON public.user_activities(cafe_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_device_id ON public.user_activities(device_id);
CREATE INDEX IF NOT EXISTS idx_tag_reports_cafe_tag ON public.tag_reports(cafe_id, tag);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON public.api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_tips_cafe_id ON public.tips(cafe_id);

-- Enable RLS on all tables
ALTER TABLE public.cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view cafes" ON public.cafes;
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can view cafe_reviews" ON public.cafe_reviews;
DROP POLICY IF EXISTS "Anyone can insert cafe_reviews" ON public.cafe_reviews;
DROP POLICY IF EXISTS "Anyone can view cafe_photos" ON public.cafe_photos;
DROP POLICY IF EXISTS "Anyone can insert cafe_photos" ON public.cafe_photos;
DROP POLICY IF EXISTS "Users can delete their own cafe_photos" ON public.cafe_photos;
DROP POLICY IF EXISTS "Anyone can view favorites" ON public.favorites;
DROP POLICY IF EXISTS "Anyone can insert favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Anyone can view user_activities" ON public.user_activities;
DROP POLICY IF EXISTS "Anyone can insert user_activities" ON public.user_activities;
DROP POLICY IF EXISTS "Anyone can view tag_reports" ON public.tag_reports;
DROP POLICY IF EXISTS "Anyone can insert tag_reports" ON public.tag_reports;
DROP POLICY IF EXISTS "Anyone can view api_usage_logs" ON public.api_usage_logs;
DROP POLICY IF EXISTS "Anyone can insert api_usage_logs" ON public.api_usage_logs;
DROP POLICY IF EXISTS "Anyone can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Anyone can view tips" ON public.tips;
DROP POLICY IF EXISTS "Anyone can insert tips" ON public.tips;
DROP POLICY IF EXISTS "Users can update their own tips" ON public.tips;

-- Create comprehensive RLS policies
-- Cafes policies
CREATE POLICY "Anyone can view cafes" ON public.cafes FOR SELECT USING (true);
CREATE POLICY "Anyone can update cafes" ON public.cafes FOR UPDATE USING (true);

-- Users policies  
CREATE POLICY "Anyone can view users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (
  auth.uid() IS NOT NULL AND auth_user_id = auth.uid()
);

-- Posts policies
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert posts" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  OR (auth.uid() IS NULL AND device_id IS NOT NULL)
);
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (
  (auth.uid() IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  OR (auth.uid() IS NULL AND device_id IS NOT NULL)
);

-- Cafe reviews policies
CREATE POLICY "Anyone can view cafe_reviews" ON public.cafe_reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cafe_reviews" ON public.cafe_reviews FOR INSERT WITH CHECK (true);

-- Cafe photos policies
CREATE POLICY "Anyone can view cafe_photos" ON public.cafe_photos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cafe_photos" ON public.cafe_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete their own cafe_photos" ON public.cafe_photos FOR DELETE USING (
  (auth.uid() IS NOT NULL AND uploaded_by = (SELECT email FROM public.users WHERE auth_user_id = auth.uid()))
  OR (auth.uid() IS NULL)
);

-- Favorites policies
CREATE POLICY "Anyone can view favorites" ON public.favorites FOR SELECT USING (true);
CREATE POLICY "Anyone can insert favorites" ON public.favorites FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete their own favorites" ON public.favorites FOR DELETE USING (
  (auth.uid() IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  OR (auth.uid() IS NULL AND device_id IS NOT NULL)
);

-- User activities policies
CREATE POLICY "Anyone can view user_activities" ON public.user_activities FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user_activities" ON public.user_activities FOR INSERT WITH CHECK (true);

-- Tag reports policies
CREATE POLICY "Anyone can view tag_reports" ON public.tag_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tag_reports" ON public.tag_reports FOR INSERT WITH CHECK (true);

-- API usage logs policies
CREATE POLICY "Anyone can view api_usage_logs" ON public.api_usage_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert api_usage_logs" ON public.api_usage_logs FOR INSERT WITH CHECK (true);

-- Feedback policies
CREATE POLICY "Anyone can view feedback" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "Anyone can insert feedback" ON public.feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own feedback" ON public.feedback FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  OR (auth.uid() IS NULL AND device_id IS NOT NULL)
);

-- Tips policies
CREATE POLICY "Anyone can view tips" ON public.tips FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tips" ON public.tips FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own tips" ON public.tips FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  OR (auth.uid() IS NULL AND device_id IS NOT NULL)
);

-- Grant comprehensive permissions
GRANT SELECT ON public.cafes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO anon, authenticated;
GRANT SELECT, INSERT ON public.cafe_reviews TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.cafe_photos TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.favorites TO anon, authenticated;
GRANT SELECT, INSERT ON public.user_activities TO anon, authenticated;
GRANT SELECT, INSERT ON public.tag_reports TO anon, authenticated;
GRANT SELECT, INSERT ON public.api_usage_logs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.feedback TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tips TO anon, authenticated;

-- Recreate duplicate prevention system
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_duplicate_checkins
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_duplicate_checkin();

-- Recreate unified reviews system
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
