# Follow Feature Fix & Badge Progress Updates

## Issues Fixed

### 1. Follow Button Error - `user_follows` table missing
**Problem:** Error "could not find public.user_follows in schema" when clicking follow button.

**Solution:** The migration file exists but hasn't been run yet. You need to run the migration in Supabase Dashboard.

**Action Required:**
1. Go to Supabase Dashboard > SQL Editor
2. Run the SQL from `MIGRATION_TO_RUN.sql` (or `supabase/migrations/20250129000001_add_user_following.sql`)
3. This will create the `user_follows` table with proper RLS policies

### 2. Follow Button Location
**Changes Made:**
- ✅ Follow button now shows in **both** locations:
  - Feed posts (PostCard component) - already implemented
  - User profile pages (Profile component) - **NEW**

**Profile Page Follow Button:**
- Shows next to username when viewing another user's profile
- Only shows if you're viewing someone else (not your own profile)
- Handles loading states and errors gracefully

### 3. Badge Progress Bars
**Changes Made:**
- ✅ Progress bars now show for **ALL badges**, not just hardcoded ones
- Progress calculated dynamically based on badge type:
  - `first_sip`: Shows check-ins progress (current/1)
  - `first_post`: Shows posts progress (current/1)
  - `early_adopter`: Shows posts progress (current/3)
  - `social_sharer`: Shows posts progress (current/10)
  - `coffee_explorer`: Shows cafes visited (current/5)
  - `cafe_expert`: Shows cafes visited (current/15)
  - `photographer`: Shows photos (current/10)
  - `reviewer`: Shows reviews (current/5)
  - `detailed_reviewer`: Shows reviews (current/10)
  - `content_creator`: Shows posts with photos (current/25)
  - `pioneer`: Shows pioneer count (current/1)

**Visual Improvements:**
- Progress bar shows current/target (e.g., "3/10 reviews")
- Progress percentage calculated and displayed
- All badges now have proper icons and colors

### 4. Retroactive Badge & XP Update Script
**Created:** `scripts/retroactiveBadgeAndXPUpdate.ts`

**Purpose:** 
- Goes through all existing users
- Calculates XP based on their actual posts, check-ins, and reviews
- Awards badges retroactively for existing activity
- Updates user stats to match actual database activity

**To Run:**
```bash
npx tsx scripts/retroactiveBadgeAndXPUpdate.ts
```

**What it does:**
1. Finds all unique users from posts table
2. For each user:
   - Counts posts, check-ins, photos, cafes visited
   - Calculates total XP based on activity
   - Updates user_stats table
   - Checks and awards all eligible badges
3. Shows progress and logs awarded badges

## Files Modified

1. **src/pages/Profile.tsx**
   - Added follow button next to username
   - Added follow status checking when viewing other users
   - Imported follow service functions

2. **src/pages/Badges.tsx**
   - Updated progress calculation to work for all badges dynamically
   - Added icons and colors for all badge types
   - Improved progress bar display

3. **src/components/Feed/PostCard.tsx**
   - Already had follow button (no changes needed)

4. **scripts/retroactiveBadgeAndXPUpdate.ts** (NEW)
   - Script to retroactively update badges and XP

## Next Steps

1. **CRITICAL:** Run the migration to create `user_follows` table:
   - Open Supabase Dashboard
   - Go to SQL Editor
   - Run the SQL from `MIGRATION_TO_RUN.sql`

2. **Optional:** Run retroactive badge update script:
   ```bash
   npx tsx scripts/retroactiveBadgeAndXPUpdate.ts
   ```

3. Test the follow feature:
   - View another user's profile
   - Click follow button
   - Check feed posts for follow buttons
   - Verify follow/unfollow works correctly

## Notes

- Follow button will only show if:
  - You have a username set
  - You're viewing someone else's profile (not your own)
  - The target user exists in the database

- Badge progress bars show:
  - Current progress (e.g., "3/10")
  - Progress percentage bar
  - Only for badges not yet earned
