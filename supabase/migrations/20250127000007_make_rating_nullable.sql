-- Make rating column nullable to support tag-only posts
-- This fixes the constraint error when adding tags without ratings

-- Remove the NOT NULL constraint from rating column
ALTER TABLE public.posts ALTER COLUMN rating DROP NOT NULL;

-- Drop the existing check constraint
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_rating_check;

-- Add the updated check constraint to allow NULL values
ALTER TABLE public.posts ADD CONSTRAINT posts_rating_check 
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
