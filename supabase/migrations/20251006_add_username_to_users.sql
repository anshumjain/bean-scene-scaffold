-- Add username column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Update RLS policy to allow username lookups
CREATE POLICY "Usernames are viewable by everyone"
ON public.users
FOR SELECT
USING (true);
