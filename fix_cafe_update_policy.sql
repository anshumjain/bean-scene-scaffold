-- Fix: Add missing UPDATE policy for cafes table
-- This allows anonymous users to update cafe records (needed for hero photo uploads)

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can update cafes" ON public.cafes;

-- Create the UPDATE policy
CREATE POLICY "Anyone can update cafes" ON public.cafes FOR UPDATE USING (true);

-- Grant UPDATE permission to anonymous and authenticated users
GRANT UPDATE ON public.cafes TO anon, authenticated;
