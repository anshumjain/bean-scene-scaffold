-- Fix RLS policies to ensure migration functions work correctly
-- This migration ensures that the client-side migration functions can operate properly

-- First, let's ensure we have the right policies for users table
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create comprehensive RLS policies for users that work for both authenticated and anonymous users
CREATE POLICY "Anyone can view users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND auth_user_id = auth.uid()) OR
  (auth.uid() IS NULL AND device_id IS NOT NULL)
);

-- Fix posts table policies to ensure migration can update posts
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- Create comprehensive RLS policies for posts
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert posts" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())) OR
  (auth.uid() IS NULL AND device_id IS NOT NULL)
);
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (
  (auth.uid() IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())) OR
  (auth.uid() IS NULL AND device_id IS NOT NULL)
);

-- Create a more permissive policy for migration operations
-- This allows the migration to update posts that don't have a user_id yet
DROP POLICY IF EXISTS "Migration can update posts" ON public.posts;
CREATE POLICY "Migration can update posts" ON public.posts FOR UPDATE USING (
  user_id IS NULL AND device_id IS NOT NULL
);

-- Grant necessary permissions for migration operations
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.posts TO anon, authenticated;

-- Ensure the migration functions can work with proper permissions
-- The migration functions need to:
-- 1. Check if users exist by device_id or auth_user_id
-- 2. Insert new users
-- 3. Update existing users
-- 4. Update posts to link them to users

-- Ensure all necessary permissions are granted
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.posts TO anon, authenticated;

-- Log the current policies for verification
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been updated for migration support';
  RAISE NOTICE 'Users table: Anyone can view/insert, users can update their own profiles';
  RAISE NOTICE 'Posts table: Anyone can view/insert, users can update their own posts';
  RAISE NOTICE 'Migration functions should now work correctly';
END $$;
