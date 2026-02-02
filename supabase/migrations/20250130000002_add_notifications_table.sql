-- Add Notifications Table
-- Stores user notifications for activities like new followers, badges earned, etc.

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT,
  username TEXT,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Indexes for efficient queries
  CONSTRAINT valid_notification_type CHECK (notification_type IN (
    'new_follower',
    'badge_earned',
    'new_post_like',
    'level_up',
    'milestone_reached'
  ))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_device_id ON public.notifications(device_id);
CREATE INDEX IF NOT EXISTS idx_notifications_username ON public.notifications(username);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_device_read ON public.notifications(device_id, read) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_username_read ON public.notifications(username, read) WHERE username IS NOT NULL;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (
    (user_id IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE id = user_id LIMIT 1)) OR
    (device_id IS NOT NULL AND device_id = current_setting('request.device_id', true)) OR
    (username IS NOT NULL AND username = current_setting('request.username', true))
  );

-- Anyone can insert notifications (for system notifications)
CREATE POLICY "Anyone can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (
    (user_id IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE id = user_id LIMIT 1)) OR
    (device_id IS NOT NULL AND device_id = current_setting('request.device_id', true)) OR
    (username IS NOT NULL AND username = current_setting('request.username', true))
  );

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (
    (user_id IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE id = user_id LIMIT 1)) OR
    (device_id IS NOT NULL AND device_id = current_setting('request.device_id', true)) OR
    (username IS NOT NULL AND username = current_setting('request.username', true))
  );
