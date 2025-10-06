-- Add username and device_id to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Create index for device_id lookups
CREATE INDEX IF NOT EXISTS idx_posts_device_id ON public.posts(device_id);
CREATE INDEX IF NOT EXISTS idx_posts_username ON public.posts(username);
