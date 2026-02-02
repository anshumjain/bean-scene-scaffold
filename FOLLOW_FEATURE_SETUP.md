# Follow Feature Setup - REQUIRED

## Issue
The follow feature is not working because the `user_follows` table doesn't exist in your database.

## Solution
You need to run the migration SQL in Supabase Dashboard.

## Steps to Fix

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**
   - Copy the SQL below
   - Paste it into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

## SQL to Run

```sql
-- Create user_follows table
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
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
```

## Alternative: Use the Migration File

You can also use the migration file directly:
- File: `supabase/migrations/20250129000001_add_user_following.sql`
- Or: `MIGRATION_TO_RUN.sql` (contains this plus city column migration)

## Verify It Works

After running the migration, you can test it:
```bash
npx tsx scripts/testFollowFeature.ts
```

You should see:
- ✅ user_follows table exists
- ✅ Found X users
- ✅ Found 0 follow relationships (initially)

## After Migration

Once the table is created, the follow feature will work:
- Follow buttons will appear on feed posts and profile pages
- Users can follow/unfollow each other
- Follow status will be saved and displayed correctly
