-- Test script to verify our duplicate prevention and unified reviews fixes
-- Run this in Supabase SQL editor or via CLI

-- 1. Test duplicate prevention function exists
SELECT 'Testing duplicate prevention function...' as test;
SELECT proname, prosrc FROM pg_proc WHERE proname = 'check_duplicate_checkin';

-- 2. Test trigger exists
SELECT 'Testing duplicate prevention trigger...' as test;
SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname = 'prevent_duplicate_checkins';

-- 3. Test unified reviews view exists
SELECT 'Testing unified reviews view...' as test;
SELECT COUNT(*) as total_unified_reviews FROM public.cafe_reviews_unified;

-- 4. Test unified reviews function exists
SELECT 'Testing unified reviews function...' as test;
SELECT proname FROM pg_proc WHERE proname = 'get_cafe_reviews_unified';

-- 5. Show current database state
SELECT 'Current database state:' as info;
SELECT 
  'Total Posts' as metric,
  COUNT(*) as count
FROM public.posts
UNION ALL
SELECT 
  'Posts with Reviews' as metric,
  COUNT(*) as count
FROM public.posts
WHERE text_review IS NOT NULL AND text_review != ''
UNION ALL
SELECT 
  'Cafe Reviews' as metric,
  COUNT(*) as count
FROM public.cafe_reviews
UNION ALL
SELECT 
  'Unified Reviews' as metric,
  COUNT(*) as count
FROM public.cafe_reviews_unified;

-- 6. Test the unified reviews function with a sample cafe
DO $$
DECLARE
    sample_cafe_id UUID;
    review_count INTEGER;
BEGIN
    -- Get the first cafe with any reviews
    SELECT cafe_id INTO sample_cafe_id 
    FROM public.cafe_reviews_unified 
    LIMIT 1;
    
    IF sample_cafe_id IS NOT NULL THEN
        RAISE NOTICE 'Testing unified reviews function with cafe_id: %', sample_cafe_id;
        
        -- Test the function
        SELECT COUNT(*) INTO review_count 
        FROM public.get_cafe_reviews_unified(sample_cafe_id, 5);
        
        RAISE NOTICE 'Function returned % reviews', review_count;
    ELSE
        RAISE NOTICE 'No cafes with reviews found for testing';
    END IF;
END $$;

-- 7. Show sample unified reviews
SELECT 
  'Sample Unified Reviews:' as info,
  review_type,
  reviewer_name,
  rating,
  LEFT(text_review, 50) as review_preview,
  created_at
FROM public.cafe_reviews_unified
ORDER BY created_at DESC
LIMIT 3;
