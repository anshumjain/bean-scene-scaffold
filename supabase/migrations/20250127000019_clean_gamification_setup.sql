-- Clean Gamification System Setup
-- This migration adds the gamification tables and functions with proper RLS policies

-- Drop existing gamification tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS public.cafe_visits CASCADE;
DROP TABLE IF EXISTS public.user_badges CASCADE;
DROP TABLE IF EXISTS public.user_stats CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.calculate_level_from_xp(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_user_stats(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.award_xp(UUID, TEXT, TEXT, INTEGER, TEXT) CASCADE;

-- Create user_stats table to track XP, levels, and basic metrics
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT,
  username TEXT,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  total_checkins INTEGER NOT NULL DEFAULT 0,
  total_photos INTEGER NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  total_cafes_visited INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one record per user/device
  UNIQUE(user_id),
  UNIQUE(device_id),
  UNIQUE(username)
);

-- Create user_badges table to track earned achievements
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT,
  username TEXT,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate badges
  UNIQUE(user_id, badge_type),
  UNIQUE(device_id, badge_type),
  UNIQUE(username, badge_type)
);

-- Create cafe_visits table to track which cafes a user has visited
CREATE TABLE public.cafe_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT,
  username TEXT,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  visit_count INTEGER NOT NULL DEFAULT 1,
  first_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One record per user-cafe combination
  UNIQUE(user_id, cafe_id),
  UNIQUE(device_id, cafe_id),
  UNIQUE(username, cafe_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_stats_user_id ON public.user_stats(user_id);
CREATE INDEX idx_user_stats_device_id ON public.user_stats(device_id);
CREATE INDEX idx_user_stats_username ON public.user_stats(username);
CREATE INDEX idx_user_stats_total_xp ON public.user_stats(total_xp DESC);

CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_device_id ON public.user_badges(device_id);
CREATE INDEX idx_user_badges_username ON public.user_badges(username);
CREATE INDEX idx_user_badges_badge_type ON public.user_badges(badge_type);

CREATE INDEX idx_cafe_visits_user_id ON public.cafe_visits(user_id);
CREATE INDEX idx_cafe_visits_device_id ON public.cafe_visits(device_id);
CREATE INDEX idx_cafe_visits_username ON public.cafe_visits(username);
CREATE INDEX idx_cafe_visits_cafe_id ON public.cafe_visits(cafe_id);

-- Enable RLS on all gamification tables
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_stats
-- Anyone can view user stats (for social features)
CREATE POLICY "Anyone can view user stats" ON public.user_stats FOR SELECT USING (true);

-- Anyone can insert user stats (for new users)
CREATE POLICY "Anyone can insert user stats" ON public.user_stats FOR INSERT WITH CHECK (true);

-- Anyone can update user stats (for XP tracking)
CREATE POLICY "Anyone can update user stats" ON public.user_stats FOR UPDATE USING (true);

-- RLS Policies for user_badges
-- Anyone can view user badges (for social features)
CREATE POLICY "Anyone can view user badges" ON public.user_badges FOR SELECT USING (true);

-- Anyone can insert user badges (for achievement tracking)
CREATE POLICY "Anyone can insert user badges" ON public.user_badges FOR INSERT WITH CHECK (true);

-- RLS Policies for cafe_visits
-- Anyone can view cafe visits (for analytics)
CREATE POLICY "Anyone can view cafe visits" ON public.cafe_visits FOR SELECT USING (true);

-- Anyone can insert cafe visits (for tracking)
CREATE POLICY "Anyone can insert cafe visits" ON public.cafe_visits FOR INSERT WITH CHECK (true);

-- Anyone can update cafe visits (for visit counting)
CREATE POLICY "Anyone can update cafe visits" ON public.cafe_visits FOR UPDATE USING (true);

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON public.user_stats TO anon, authenticated;
GRANT SELECT, INSERT ON public.user_badges TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cafe_visits TO anon, authenticated;

-- Function to calculate level from XP (simple: every 100 XP = new level)
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Simple level calculation: Level 1 at 0 XP, Level 2 at 100 XP, etc.
  RETURN GREATEST(1, FLOOR(xp / 100) + 1);
END;
$$ LANGUAGE plpgsql;

-- Function to get or create user stats
CREATE OR REPLACE FUNCTION public.get_or_create_user_stats(
  p_user_id UUID DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS public.user_stats AS $$
DECLARE
  result public.user_stats;
BEGIN
  -- Try to find existing stats
  SELECT * INTO result FROM public.user_stats 
  WHERE (p_user_id IS NOT NULL AND user_id = p_user_id)
     OR (p_device_id IS NOT NULL AND device_id = p_device_id)
     OR (p_username IS NOT NULL AND username = p_username)
  LIMIT 1;
  
  -- If not found, create new stats
  IF NOT FOUND THEN
    INSERT INTO public.user_stats (user_id, device_id, username)
    VALUES (p_user_id, p_device_id, p_username)
    RETURNING * INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to award XP and update stats
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL,
  p_xp_amount INTEGER DEFAULT 0,
  p_action_type TEXT DEFAULT 'checkin'
)
RETURNS public.user_stats AS $$
DECLARE
  current_stats public.user_stats;
  new_level INTEGER;
BEGIN
  -- Get or create user stats
  SELECT * INTO current_stats FROM public.get_or_create_user_stats(p_user_id, p_device_id, p_username);
  
  -- Update XP and related counters
  UPDATE public.user_stats 
  SET 
    total_xp = total_xp + p_xp_amount,
    total_checkins = CASE WHEN p_action_type = 'checkin' THEN total_checkins + 1 ELSE total_checkins END,
    total_photos = CASE WHEN p_action_type = 'photo' THEN total_photos + 1 ELSE total_photos END,
    total_reviews = CASE WHEN p_action_type = 'review' THEN total_reviews + 1 ELSE total_reviews END,
    updated_at = now()
  WHERE id = current_stats.id
  RETURNING * INTO current_stats;
  
  -- Calculate new level
  new_level := public.calculate_level_from_xp(current_stats.total_xp);
  
  -- Update level if it changed
  IF new_level > current_stats.current_level THEN
    UPDATE public.user_stats 
    SET current_level = new_level
    WHERE id = current_stats.id
    RETURNING * INTO current_stats;
  END IF;
  
  RETURN current_stats;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.calculate_level_from_xp(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_user_stats(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp(UUID, TEXT, TEXT, INTEGER, TEXT) TO anon, authenticated;
