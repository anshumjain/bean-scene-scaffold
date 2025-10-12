-- Add test tags to cafes for testing
-- This will add some sample tags to cafes so we can test the filtering

-- Add "cozy" tag to a few cafes
UPDATE public.cafes 
SET tags = tags || ARRAY['cozy']
WHERE name ILIKE '%haraz%' 
   OR name ILIKE '%coffee%'
   OR name ILIKE '%cafe%'
LIMIT 3;

-- Add "great-coffee" tag to cafes with high ratings
UPDATE public.cafes 
SET tags = tags || ARRAY['great-coffee']
WHERE (google_rating >= 4.5 OR rating >= 4.5)
  AND NOT (tags @> ARRAY['great-coffee'])
LIMIT 5;

-- Add "study-spot" tag to cafes
UPDATE public.cafes 
SET tags = tags || ARRAY['study-spot']
WHERE name ILIKE '%library%' 
   OR name ILIKE '%study%'
   OR neighborhood ILIKE '%university%'
   OR neighborhood ILIKE '%downtown%'
LIMIT 3;

-- Add "vibe" tag to cafes
UPDATE public.cafes 
SET tags = tags || ARRAY['vibe']
WHERE tags IS NOT NULL 
  AND array_length(tags, 1) > 0
LIMIT 2;

-- Add "date-spot" tag to cafes with good ratings
UPDATE public.cafes 
SET tags = tags || ARRAY['date-spot']
WHERE (google_rating >= 4.3 OR rating >= 4.3)
  AND NOT (tags @> ARRAY['date-spot'])
LIMIT 3;

-- Verify the updates
SELECT 
  name,
  neighborhood,
  tags,
  array_length(tags, 1) as tag_count
FROM public.cafes 
WHERE tags IS NOT NULL 
  AND array_length(tags, 1) > 0
ORDER BY array_length(tags, 1) DESC, name
LIMIT 10;

-- Check specifically for "cozy" tag
SELECT 
  name,
  neighborhood,
  tags
FROM public.cafes 
WHERE tags @> ARRAY['cozy']
ORDER BY name;
