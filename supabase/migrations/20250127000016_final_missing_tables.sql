-- Add only the missing tables that are causing 404 errors
-- This should fix the favorites and user_activities issues

-- Create favorites table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cafe_id, user_id),
  UNIQUE(cafe_id, device_id)
);

-- Create user_activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('check_in', 'review', 'photo', 'favorite')),
  device_id TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_cafe_id ON public.favorites(cafe_id);
CREATE INDEX IF NOT EXISTS idx_favorites_device_id ON public.favorites(device_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_cafe_id ON public.user_activities(cafe_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_device_id ON public.user_activities(device_id);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for the new tables (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'Anyone can view favorites') THEN
        CREATE POLICY "Anyone can view favorites" ON public.favorites FOR SELECT USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'Anyone can insert favorites') THEN
        CREATE POLICY "Anyone can insert favorites" ON public.favorites FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'Users can delete their own favorites') THEN
        CREATE POLICY "Users can delete their own favorites" ON public.favorites FOR DELETE USING (
          (auth.uid() IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
          OR (auth.uid() IS NULL AND device_id IS NOT NULL)
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_activities' AND policyname = 'Anyone can view user_activities') THEN
        CREATE POLICY "Anyone can view user_activities" ON public.user_activities FOR SELECT USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_activities' AND policyname = 'Anyone can insert user_activities') THEN
        CREATE POLICY "Anyone can insert user_activities" ON public.user_activities FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.favorites TO anon, authenticated;
GRANT SELECT, INSERT ON public.user_activities TO anon, authenticated;
