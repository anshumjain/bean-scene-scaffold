-- Allow null place_id in posts table for posts without cafes
-- This migration drops the NOT NULL constraint from place_id column

-- Drop the NOT NULL constraint from place_id column
ALTER TABLE public.posts ALTER COLUMN place_id DROP NOT NULL;

-- Update the comment to reflect the change
COMMENT ON COLUMN public.posts.place_id IS 'Google Places ID - can be null for posts without cafe association';
