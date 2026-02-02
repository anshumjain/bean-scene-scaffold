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
