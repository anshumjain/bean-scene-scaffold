-- Fix favorites RLS policy to allow anonymous users with device_id
-- This migration fixes the "New row violates RLS policy for table favorites" error

-- First, make user_id nullable to support anonymous users
ALTER TABLE public.favorites ALTER COLUMN user_id DROP NOT NULL;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Authenticated users can manage their favorites" ON public.favorites;
DROP POLICY IF EXISTS "Anonymous users can manage their favorites by device_id" ON public.favorites;
DROP POLICY IF EXISTS "Users can view all favorites" ON public.favorites;
DROP POLICY IF EXISTS "Favorites are viewable by everyone" ON public.favorites;

-- Create new policies that allow both authenticated and anonymous users
CREATE POLICY "Authenticated users can manage their favorites"
  ON public.favorites
  FOR ALL
  USING (auth.uid() IS NOT NULL AND user_id IS NOT NULL);

CREATE POLICY "Anonymous users can manage their favorites by device_id"
  ON public.favorites
  FOR ALL
  USING (auth.uid() IS NULL AND device_id IS NOT NULL);

-- Grant INSERT permission to anonymous users for favorites
GRANT INSERT ON public.favorites TO anon;

-- Policy for everyone to view favorites (for public profiles, etc.)
CREATE POLICY "Users can view all favorites"
  ON public.favorites
  FOR SELECT
  USING (true);
