-- Script to clean up duplicate posts and ensure data integrity
-- Run this in Supabase SQL editor

-- 1. Find and show duplicate posts (same user/device, same cafe, same day)
SELECT 
  'User-based duplicates' as duplicate_type,
  user_id,
  cafe_id,
  DATE(created_at) as checkin_date,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY created_at) as post_ids
FROM public.posts 
WHERE user_id IS NOT NULL
GROUP BY user_id, cafe_id, DATE(created_at)
HAVING COUNT(*) > 1

UNION ALL

SELECT 
  'Device-based duplicates' as duplicate_type,
  NULL as user_id,
  cafe_id,
  DATE(created_at) as checkin_date,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY created_at) as post_ids
FROM public.posts 
WHERE device_id IS NOT NULL
GROUP BY device_id, cafe_id, DATE(created_at)
HAVING COUNT(*) > 1;

-- 2. Delete duplicate posts (keep the oldest one)
-- First, let's see what we would delete
WITH duplicates_to_delete AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        COALESCE(user_id::text, device_id), 
        cafe_id, 
        DATE(created_at)
      ORDER BY created_at ASC
    ) as rn
  FROM public.posts
  WHERE cafe_id IS NOT NULL
)
SELECT 
  'Posts to delete' as action,
  COUNT(*) as count
FROM duplicates_to_delete 
WHERE rn > 1;

-- 3. Actually delete the duplicates (uncomment to run)
/*
WITH duplicates_to_delete AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        COALESCE(user_id::text, device_id), 
        cafe_id, 
        DATE(created_at)
      ORDER BY created_at ASC
    ) as rn
  FROM public.posts
  WHERE cafe_id IS NOT NULL
)
DELETE FROM public.posts 
WHERE id IN (
  SELECT id FROM duplicates_to_delete WHERE rn > 1
);
*/

-- 4. Show final counts
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
FROM public.cafe_reviews;

-- 5. Test the unified reviews function
SELECT 
  'Testing unified reviews' as test,
  COUNT(*) as review_count
FROM public.cafe_reviews_unified
LIMIT 1;
