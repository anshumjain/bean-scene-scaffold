-- Add source tracking columns for Google Content Attribution System
-- This migration ensures compliance with Google Places API Terms of Service Section 3.2.3

-- Add photo_source column to cafes table
ALTER TABLE public.cafes 
ADD COLUMN IF NOT EXISTS photo_source VARCHAR(20) DEFAULT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cafes_photo_source ON public.cafes(photo_source);

-- Add source column to cafe_reviews table  
ALTER TABLE public.cafe_reviews 
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'google';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cafe_reviews_source ON public.cafe_reviews(source);

-- Add source columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS photo_source VARCHAR(20) DEFAULT 'user';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_source ON public.posts(source);
CREATE INDEX IF NOT EXISTS idx_posts_photo_source ON public.posts(photo_source);

-- Update existing cafes with Google photos
UPDATE public.cafes 
SET photo_source = 'google' 
WHERE google_photo_reference IS NOT NULL;

-- Update cafes with migrated Google photos (check Cloudinary path)
UPDATE public.cafes 
SET photo_source = 'google' 
WHERE hero_photo_url LIKE '%bean-scene/google-places%'
   OR hero_photo_url LIKE '%cloudinary%'
   OR hero_photo_url LIKE '%google%';

-- Update existing reviews to be Google-sourced (they were seeded from Google)
UPDATE public.cafe_reviews 
SET source = 'google' 
WHERE source IS NULL;

-- Mark existing seeded posts as Google-sourced (they use Google reviews and photos)
UPDATE public.posts 
SET source = 'google', photo_source = 'google'
WHERE source IS NULL OR photo_source IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.cafes.photo_source IS 'Source of cafe photos: google, user, or null';
COMMENT ON COLUMN public.cafe_reviews.source IS 'Source of review: google or user';
COMMENT ON COLUMN public.posts.source IS 'Source of post content: google or user';
COMMENT ON COLUMN public.posts.photo_source IS 'Source of post photo: google or user';
