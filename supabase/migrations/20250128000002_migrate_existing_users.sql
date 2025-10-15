-- Migration to handle existing users and localStorage data
-- This ensures all existing usernames and device data are properly stored in the database

-- Create a function to safely migrate existing anonymous users
CREATE OR REPLACE FUNCTION public.migrate_existing_anonymous_users()
RETURNS TABLE (
  migrated_count INTEGER,
  skipped_count INTEGER,
  error_count INTEGER
) AS $$
DECLARE
  v_migrated INTEGER := 0;
  v_skipped INTEGER := 0;
  v_errors INTEGER := 0;
  v_post RECORD;
BEGIN
  -- Migrate posts that have device_id but no corresponding user record
  FOR v_post IN 
    SELECT DISTINCT device_id, username 
    FROM public.posts 
    WHERE device_id IS NOT NULL 
      AND device_id NOT IN (SELECT device_id FROM public.users WHERE device_id IS NOT NULL)
      AND username IS NOT NULL
  LOOP
    BEGIN
      -- Check if username already exists
      IF EXISTS (SELECT 1 FROM public.users WHERE username = v_post.username) THEN
        -- Skip this user as username already exists
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;
      
      -- Create user record
      INSERT INTO public.users (
        device_id,
        username,
        name,
        email,
        created_at,
        updated_at
      ) VALUES (
        v_post.device_id,
        v_post.username,
        v_post.username,
        'migrated-' || v_post.device_id || '@beanscene.local',
        NOW(),
        NOW()
      );
      
      v_migrated := v_migrated + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      -- Log error but continue
      RAISE NOTICE 'Error migrating user %: %', v_post.device_id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_migrated, v_skipped, v_errors;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT * FROM public.migrate_existing_anonymous_users();

-- Clean up the function
DROP FUNCTION public.migrate_existing_anonymous_users();

-- Update posts table to ensure all posts are properly linked to users
-- This will help ensure posts are visible to all users
UPDATE public.posts 
SET user_id = (
  SELECT id FROM public.users 
  WHERE public.users.device_id = public.posts.device_id 
  LIMIT 1
)
WHERE user_id IS NULL 
  AND device_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.device_id = public.posts.device_id
  );

-- Create index to improve performance for device_id lookups
CREATE INDEX IF NOT EXISTS idx_users_device_id ON public.users(device_id);
CREATE INDEX IF NOT EXISTS idx_posts_device_id ON public.posts(device_id);

-- Ensure all posts are publicly readable (fix RLS for posts)
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can insert posts" ON public.posts;

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
