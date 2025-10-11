-- Fix user_activities RLS policy to allow anonymous users to insert
-- This allows posts to be created without authentication issues

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can insert their own activities" ON public.user_activities;

-- Create a new policy that allows both authenticated and anonymous users
CREATE POLICY "Anyone can insert activities"
  ON public.user_activities
  FOR INSERT
  WITH CHECK (true);

-- Update the policy to allow anonymous users to insert
-- This is needed for the activity logging system to work with anonymous posts
