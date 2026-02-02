-- Combined Migration SQL
-- Run this in Supabase Dashboard > SQL Editor

-- Add user following system
-- Simplified: Since all users (authenticated and anonymous) are in public.users table,
-- we only need to reference user IDs - much simpler than the original design!

-- Create user_follows table (simplified)
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  -- Ensure user doesn't follow themselves
  CHECK (follower_id != following_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON public.user_follows(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
CREATE POLICY "Anyone can view follows" ON public.user_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
CREATE POLICY "Users can follow others" ON public.user_follows FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;
CREATE POLICY "Users can unfollow" ON public.user_follows FOR DELETE USING (
  follower_id IN (
    SELECT id FROM public.users 
    WHERE auth_user_id = auth.uid() OR device_id IS NOT NULL
  )
);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.user_follows TO anon, authenticated;

-- Add city column to cafes table for filtering
ALTER TABLE public.cafes ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'houston';
CREATE INDEX IF NOT EXISTS idx_cafes_city ON public.cafes(city);

-- Update existing cafes to have city = 'houston'
UPDATE public.cafes SET city = 'houston' WHERE city IS NULL;


-- Migration 2: Schema Optimization

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
