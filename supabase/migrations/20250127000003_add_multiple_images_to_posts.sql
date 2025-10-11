-- Add support for multiple images in posts (max 3 images per post)
-- This migration adds a new image_urls column alongside the existing image_url column

-- Add the new image_urls column
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Add constraint to limit max 3 images per post
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'posts_max_3_images'
    ) THEN
        ALTER TABLE public.posts ADD CONSTRAINT posts_max_3_images 
        CHECK (array_length(image_urls, 1) <= 3);
    END IF;
END $$;

-- Add index for better performance on image_urls queries
CREATE INDEX IF NOT EXISTS idx_posts_image_urls ON public.posts USING GIN(image_urls);

-- Update the posts table comment to reflect the change
COMMENT ON COLUMN public.posts.image_urls IS 'Array of image URLs (max 3) for the post';

-- Note: The existing image_url column will remain for backward compatibility
-- Future migrations can migrate data and drop the old column when ready
