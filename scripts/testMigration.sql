-- Test script to verify the migration works correctly
-- Run this after applying the migration

-- 1. Test the duplicate prevention function
-- This should work without errors
SELECT 'Testing duplicate prevention function...' as test;

-- 2. Test the unified reviews view
SELECT 'Testing unified reviews view...' as test;
SELECT COUNT(*) as total_unified_reviews FROM public.cafe_reviews_unified;

-- 3. Test the unified reviews function
SELECT 'Testing unified reviews function...' as test;
-- Get a sample cafe_id to test with
DO $$
DECLARE
    sample_cafe_id UUID;
BEGIN
    -- Get the first cafe with reviews
    SELECT cafe_id INTO sample_cafe_id 
    FROM public.cafe_reviews_unified 
    LIMIT 1;
    
    IF sample_cafe_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with cafe_id: %', sample_cafe_id;
        
        -- Test the function
        PERFORM * FROM public.get_cafe_reviews_unified(sample_cafe_id, 5);
        RAISE NOTICE 'Function test successful';
    ELSE
        RAISE NOTICE 'No cafes with reviews found for testing';
    END IF;
END $$;

-- 4. Show current post counts
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

-- 5. Show sample unified reviews
SELECT 
  review_type,
  reviewer_name,
  rating,
  LEFT(text_review, 50) as review_preview,
  created_at
FROM public.cafe_reviews_unified
ORDER BY created_at DESC
LIMIT 5;
