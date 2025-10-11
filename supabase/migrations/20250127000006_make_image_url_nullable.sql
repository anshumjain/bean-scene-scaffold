-- Make image_url column nullable to allow posts without images
-- This migration allows posts to exist without requiring an image_url

-- Make image_url nullable
ALTER TABLE public.posts ALTER COLUMN image_url DROP NOT NULL;

-- Also ensure image_urls can be null (it should already be nullable)
ALTER TABLE public.posts ALTER COLUMN image_urls DROP NOT NULL;
