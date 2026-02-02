-- Schema optimizations for city-based filtering and location queries
-- This migration adds indexes and optimizations WITHOUT deleting any data

-- Add city column if it doesn't exist (from previous migration)
ALTER TABLE public.cafes ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'houston';

-- Create composite index for city + location queries (for IP-based city filtering)
CREATE INDEX IF NOT EXISTS idx_cafes_city_location ON public.cafes(city, latitude, longitude) 
WHERE is_active = true;

-- Create index for city + is_active (for filtering active cafes by city)
CREATE INDEX IF NOT EXISTS idx_cafes_city_active ON public.cafes(city, is_active) 
WHERE is_active = true;

-- Create GIN index for tags array (for tag-based filtering)
CREATE INDEX IF NOT EXISTS idx_cafes_tags_gin ON public.cafes USING GIN(tags);

-- Create index for city + tags (for city-specific tag filtering)
CREATE INDEX IF NOT EXISTS idx_cafes_city_tags ON public.cafes(city) 
WHERE array_length(tags, 1) > 0;

-- Create index for rating queries (for rating filters)
CREATE INDEX IF NOT EXISTS idx_cafes_rating ON public.cafes(google_rating DESC NULLS LAST) 
WHERE is_active = true;

-- Create index for city + rating (for city-specific rating filters)
CREATE INDEX IF NOT EXISTS idx_cafes_city_rating ON public.cafes(city, google_rating DESC NULLS LAST) 
WHERE is_active = true AND google_rating IS NOT NULL;

-- Optimize location queries with spatial index (PostGIS-style using btree)
-- This helps with distance-based queries
CREATE INDEX IF NOT EXISTS idx_cafes_lat_lng ON public.cafes(latitude, longitude) 
WHERE is_active = true;

-- Add index for posts by city (through cafe relationship)
-- This will help with city-specific feed queries
CREATE INDEX IF NOT EXISTS idx_posts_place_id_created ON public.posts(place_id, created_at DESC);

-- Add index for cafe_reviews by source (for filtering Google vs user reviews)
CREATE INDEX IF NOT EXISTS idx_cafe_reviews_source_time ON public.cafe_reviews(source, time DESC);

-- Update existing Houston cafes to have city = 'houston' (if not already set)
UPDATE public.cafes 
SET city = 'houston' 
WHERE city IS NULL 
  AND (latitude BETWEEN 29.0 AND 30.5) 
  AND (longitude BETWEEN -96.0 AND -94.5);

-- Add comment for documentation
COMMENT ON COLUMN public.cafes.city IS 'City where cafe is located: houston or austin. Used for IP-based filtering.';
