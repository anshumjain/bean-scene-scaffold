-- Add Push Subscriptions Table
-- Stores Web Push Protocol subscriptions for sending push notifications

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT,
  username TEXT,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one subscription per user/device/username
  UNIQUE(user_id, device_id, username)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_device_id ON public.push_subscriptions(device_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_username ON public.push_subscriptions(username);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions
  FOR SELECT USING (
    (user_id IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE id = user_id LIMIT 1)) OR
    (device_id IS NOT NULL AND device_id = current_setting('request.device_id', true)) OR
    (username IS NOT NULL AND username = current_setting('request.username', true))
  );

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert their own subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (true);

-- Users can update their own subscriptions
CREATE POLICY "Users can update their own subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (
    (user_id IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE id = user_id LIMIT 1)) OR
    (device_id IS NOT NULL AND device_id = current_setting('request.device_id', true)) OR
    (username IS NOT NULL AND username = current_setting('request.username', true))
  );

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions
  FOR DELETE USING (
    (user_id IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE id = user_id LIMIT 1)) OR
    (device_id IS NOT NULL AND device_id = current_setting('request.device_id', true)) OR
    (username IS NOT NULL AND username = current_setting('request.username', true))
  );
