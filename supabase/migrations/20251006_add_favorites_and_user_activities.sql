-- Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, cafe_id),
  UNIQUE(device_id, cafe_id)
);

-- User Activities table
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  username TEXT,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('check-in', 'review', 'photo-upload', 'favorite')),
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_device_id ON public.favorites(device_id);
CREATE INDEX IF NOT EXISTS idx_favorites_cafe_id ON public.favorites(cafe_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_cafe_id ON public.user_activities(cafe_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON public.user_activities(activity_type);

-- RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Favorites are viewable by everyone"
  ON public.favorites
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own favorites"
  ON public.favorites
  FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "User activities are viewable by everyone"
  ON public.user_activities
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own activities"
  ON public.user_activities
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
