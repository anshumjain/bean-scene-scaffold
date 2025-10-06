-- Complete Feature Implementation Migration
-- This migration implements all the features from the BeanScene implementation plan

-- 1. Add username column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 2. Add username and device_id to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 3. Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, cafe_id),
  UNIQUE(device_id, cafe_id)
);

-- 4. Create user_activities table
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  username TEXT,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('check-in', 'review', 'photo-upload', 'favorite')),
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_posts_device_id ON public.posts(device_id);
CREATE INDEX IF NOT EXISTS idx_posts_username ON public.posts(username);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_device_id ON public.favorites(device_id);
CREATE INDEX IF NOT EXISTS idx_favorites_cafe_id ON public.favorites(cafe_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_cafe_id ON public.user_activities(cafe_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON public.user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);

-- 6. Enable Row Level Security
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for favorites
DROP POLICY IF EXISTS "Favorites are viewable by everyone" ON public.favorites;
CREATE POLICY "Favorites are viewable by everyone"
  ON public.favorites
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.favorites
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- 8. Create RLS policies for user_activities
DROP POLICY IF EXISTS "User activities are viewable by everyone" ON public.user_activities;
CREATE POLICY "User activities are viewable by everyone"
  ON public.user_activities
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own activities" ON public.user_activities;
CREATE POLICY "Users can insert their own activities"
  ON public.user_activities
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 9. Update existing RLS policies for users to allow username lookups
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- 10. Add public read policy for usernames (for public profiles)
DROP POLICY IF EXISTS "Usernames are viewable by everyone" ON public.users;
CREATE POLICY "Usernames are viewable by everyone"
  ON public.users
  FOR SELECT
  USING (true);

-- 11. Add amenities and parking_info columns to cafes table (for seeding)
ALTER TABLE public.cafes ADD COLUMN IF NOT EXISTS amenities JSONB;
ALTER TABLE public.cafes ADD COLUMN IF NOT EXISTS parking_info TEXT;

-- 12. Create indexes for new cafe columns
CREATE INDEX IF NOT EXISTS idx_cafes_amenities ON public.cafes USING GIN (amenities);

-- 13. Update the posts table to allow null user_id (for anonymous posts)
ALTER TABLE public.posts ALTER COLUMN user_id DROP NOT NULL;

-- 14. Create function to get user by username
DROP FUNCTION IF EXISTS public.get_user_by_username(TEXT);
CREATE OR REPLACE FUNCTION public.get_user_by_username(username_param TEXT)
RETURNS TABLE (
  id UUID,
  auth_user_id UUID,
  name TEXT,
  email TEXT,
  username TEXT,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.auth_user_id, u.name, u.email, u.username, u.avatar, u.created_at, u.updated_at
  FROM public.users u
  WHERE u.username = username_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create function to get user activity feed
DROP FUNCTION IF EXISTS public.get_user_activity_feed(INTEGER);
CREATE OR REPLACE FUNCTION public.get_user_activity_feed(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  activity_type TEXT,
  cafe_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT ua.id, ua.user_id, ua.username, ua.activity_type, ua.cafe_id, ua.created_at, ua.metadata
  FROM public.user_activities ua
  ORDER BY ua.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Create function to get user favorites
DROP FUNCTION IF EXISTS public.get_user_favorites(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.get_user_favorites(user_id_param UUID, device_id_param TEXT)
RETURNS TABLE (
  id UUID,
  cafe_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.cafe_id, f.created_at
  FROM public.favorites f
  WHERE (f.user_id = user_id_param OR f.device_id = device_id_param)
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Create function to check if cafe is favorited
DROP FUNCTION IF EXISTS public.is_cafe_favorited(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.is_cafe_favorited(cafe_id_param UUID, user_id_param UUID, device_id_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  favorite_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO favorite_count
  FROM public.favorites f
  WHERE f.cafe_id = cafe_id_param 
    AND (f.user_id = user_id_param OR f.device_id = device_id_param);
  
  RETURN favorite_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Create analytics functions for admin dashboard
DROP FUNCTION IF EXISTS public.get_daily_active_users(INTEGER);
CREATE OR REPLACE FUNCTION public.get_daily_active_users(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  active_users INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(ua.created_at) as date,
    COUNT(DISTINCT COALESCE(ua.user_id::TEXT, ua.username)) as active_users
  FROM public.user_activities ua
  WHERE ua.created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
  GROUP BY DATE(ua.created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.get_monthly_active_users();
CREATE OR REPLACE FUNCTION public.get_monthly_active_users()
RETURNS INTEGER AS $$
DECLARE
  mau_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT COALESCE(ua.user_id::TEXT, ua.username)) INTO mau_count
  FROM public.user_activities ua
  WHERE ua.created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  RETURN COALESCE(mau_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.get_engagement_metrics();
CREATE OR REPLACE FUNCTION public.get_engagement_metrics()
RETURNS TABLE (
  total_users INTEGER,
  total_posts INTEGER,
  total_checkins INTEGER,
  total_reviews INTEGER,
  average_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.users)::INTEGER as total_users,
    (SELECT COUNT(*) FROM public.posts)::INTEGER as total_posts,
    (SELECT COUNT(*) FROM public.user_activities WHERE activity_type = 'check-in')::INTEGER as total_checkins,
    (SELECT COUNT(*) FROM public.cafe_reviews)::INTEGER as total_reviews,
    COALESCE(
      (SELECT AVG(rating) FROM (
        SELECT rating FROM public.posts
        UNION ALL
        SELECT rating FROM public.cafe_reviews
      ) all_ratings), 0
    ) as average_rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.favorites TO anon, authenticated;
GRANT SELECT ON public.user_activities TO anon, authenticated;
GRANT SELECT ON public.users TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT INSERT ON public.user_activities TO authenticated;
GRANT UPDATE ON public.users TO authenticated;

-- 20. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_by_username(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_activity_feed(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_favorites(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_cafe_favorited(UUID, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_active_users(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_active_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_engagement_metrics() TO authenticated;

-- 21. Add comments for documentation
COMMENT ON TABLE public.favorites IS 'User favorites for cafes, supports both authenticated users and anonymous device IDs';
COMMENT ON TABLE public.user_activities IS 'Activity log for user actions including check-ins, reviews, photo uploads, and favorites';
COMMENT ON COLUMN public.users.username IS 'Unique username for public profiles';
COMMENT ON COLUMN public.posts.username IS 'Username of the post author (for display purposes)';
COMMENT ON COLUMN public.posts.device_id IS 'Device ID for anonymous posts';
COMMENT ON COLUMN public.cafes.amenities IS 'JSON array of cafe amenities from Google Places';
COMMENT ON COLUMN public.cafes.parking_info IS 'Parking information for the cafe';

-- 22. Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_favorites_updated_at ON public.favorites;
CREATE TRIGGER update_favorites_updated_at
  BEFORE UPDATE ON public.favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_activities_updated_at ON public.user_activities;
CREATE TRIGGER update_user_activities_updated_at
  BEFORE UPDATE ON public.user_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
