-- Debug: Check what tags exist in the database
-- Run this to see what cafes have tags and what tags exist

-- Check cafes with tags
SELECT 
  name, 
  neighborhood,
  tags,
  CASE 
    WHEN array_length(tags, 1) > 0 THEN 'Has tags'
    ELSE 'No tags'
  END as tag_status
FROM public.cafes 
WHERE is_active = true 
ORDER BY array_length(tags, 1) DESC NULLS LAST
LIMIT 20;

-- Check specific cafes that might have "cozy" tag
SELECT 
  name, 
  neighborhood,
  tags
FROM public.cafes 
WHERE is_active = true 
  AND tags @> ARRAY['cozy']
LIMIT 10;

-- Check all unique tags in the database
SELECT DISTINCT unnest(tags) as tag_name
FROM public.cafes 
WHERE is_active = true 
  AND array_length(tags, 1) > 0
ORDER BY tag_name;

-- Check if any cafes have "cozy" in their tags (case-insensitive)
SELECT 
  name, 
  neighborhood,
  tags
FROM public.cafes 
WHERE is_active = true 
  AND EXISTS (
    SELECT 1 FROM unnest(tags) as tag 
    WHERE LOWER(tag) LIKE '%cozy%'
  )
LIMIT 10;
