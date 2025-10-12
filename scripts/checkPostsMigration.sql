-- SQL script to check and migrate posts for moments feed
-- Run this directly in Supabase SQL editor

-- Check total posts count
SELECT COUNT(*) as total_posts FROM public.posts;

-- Check posts with NULL cafe_id
SELECT COUNT(*) as posts_without_cafe FROM public.posts WHERE cafe_id IS NULL;

-- Check posts with NULL place_id  
SELECT COUNT(*) as posts_without_place FROM public.posts WHERE place_id IS NULL;

-- Check posts that have place_id but no cafe_id (these need to be fixed)
SELECT COUNT(*) as posts_needing_cafe_association 
FROM public.posts 
WHERE cafe_id IS NULL AND place_id IS NOT NULL;

-- Show sample of posts needing cafe association
SELECT id, place_id, created_at, text_review 
FROM public.posts 
WHERE cafe_id IS NULL AND place_id IS NOT NULL 
LIMIT 5;

-- Update posts with NULL cafe_id to have cafe_id if they have a valid place_id
UPDATE public.posts 
SET cafe_id = (
  SELECT c.id 
  FROM public.cafes c 
  WHERE c.place_id = posts.place_id 
  LIMIT 1
)
WHERE posts.cafe_id IS NULL 
  AND posts.place_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cafes c 
    WHERE c.place_id = posts.place_id
  );

-- Check how many posts were updated
SELECT COUNT(*) as updated_posts FROM public.posts WHERE cafe_id IS NOT NULL;

-- Test the moments feed query
SELECT 
  p.id,
  p.created_at,
  p.text_review,
  p.rating,
  c.name as cafe_name,
  c.neighborhood
FROM public.posts p
LEFT JOIN public.cafes c ON p.cafe_id = c.id
ORDER BY p.created_at DESC
LIMIT 10;

-- Show final counts
SELECT 
  'Total Posts' as metric,
  COUNT(*) as count
FROM public.posts
UNION ALL
SELECT 
  'Posts with Cafe' as metric,
  COUNT(*) as count
FROM public.posts p
INNER JOIN public.cafes c ON p.cafe_id = c.id
UNION ALL
SELECT 
  'Quick Posts (no cafe)' as metric,
  COUNT(*) as count
FROM public.posts 
WHERE cafe_id IS NULL;
