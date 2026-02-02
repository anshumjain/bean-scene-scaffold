-- Add missing columns to user_stats table for post tracking
-- These columns are needed for badge calculations

ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS total_posts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_with_photos INTEGER NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.user_stats.total_posts IS 'Total number of social posts (not check-ins)';
COMMENT ON COLUMN public.user_stats.posts_with_photos IS 'Number of posts that include photos';
