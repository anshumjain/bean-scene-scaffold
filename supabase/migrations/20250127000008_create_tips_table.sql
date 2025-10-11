-- Create tips table for community sharing
-- Tips are shared with the community, not stored locally

CREATE TABLE IF NOT EXISTS public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  device_id TEXT, -- For anonymous users
  username TEXT,
  tip_text TEXT NOT NULL CHECK (length(tip_text) >= 5 AND length(tip_text) <= 200),
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cafe_id, device_id), -- One tip per device per cafe
  UNIQUE(cafe_id, user_id) -- One tip per user per cafe
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tips_cafe_id ON public.tips(cafe_id);
CREATE INDEX IF NOT EXISTS idx_tips_user_id ON public.tips(user_id);
CREATE INDEX IF NOT EXISTS idx_tips_device_id ON public.tips(device_id);
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON public.tips(created_at DESC);

-- Enable RLS
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tips
CREATE POLICY "Anyone can view tips"
  ON public.tips
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tips"
  ON public.tips
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_id IS NOT NULL AND
    auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = user_id)
  );

CREATE POLICY "Anonymous users can create tips"
  ON public.tips
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL AND 
    device_id IS NOT NULL
  );

CREATE POLICY "Users can update their own tips"
  ON public.tips
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = user_id))
    OR
    (auth.uid() IS NULL AND device_id IS NOT NULL)
  );

CREATE POLICY "Users can delete their own tips"
  ON public.tips
  FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = user_id))
    OR
    (auth.uid() IS NULL AND device_id IS NOT NULL)
  );

-- Grant permissions
GRANT INSERT ON public.tips TO anon;
GRANT SELECT ON public.tips TO anon;
