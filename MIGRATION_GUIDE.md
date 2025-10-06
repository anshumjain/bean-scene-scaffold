# BeanScene Database Migration Guide

This guide explains how to apply the complete database migration for all BeanScene features.

## 🚨 Important: Before You Start

**The migration includes ALL features from the implementation plan:**
- User identity & authentication (username, device ID)
- Favorites system
- User activity tracking
- Admin analytics functions
- Enhanced cafe data (amenities, parking)

## 📋 Prerequisites

1. **Supabase CLI**: Install if not already installed
   ```bash
   npm install -g supabase
   ```

2. **Environment Setup**: Ensure your `.env` file contains:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Backup**: Consider backing up your database before applying migrations

## 🚀 Quick Migration (Recommended)

### Option 1: Using npm script (Cross-platform)
```bash
npm run migrate
```

### Option 2: Using platform-specific scripts

**Windows:**
```bash
scripts\apply-migrations.bat
```

**Linux/Mac:**
```bash
chmod +x scripts/apply-migrations.sh
./scripts/apply-migrations.sh
```

### Option 3: Manual steps
```bash
# 1. Apply migrations
supabase db push

# 2. Regenerate TypeScript types
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## 📊 What the Migration Does

### Database Schema Changes
1. **Users Table**:
   - Adds `username` column (unique)
   - Updates RLS policies for public username access

2. **Posts Table**:
   - Adds `username` column (for display)
   - Adds `device_id` column (for anonymous posts)
   - Makes `user_id` nullable (for anonymous posts)

3. **New Tables**:
   - `favorites` - User cafe favorites with device ID support
   - `user_activities` - Activity log for all user actions

4. **Cafes Table**:
   - Adds `amenities` JSONB column
   - Adds `parking_info` TEXT column

### Database Functions
- `get_user_by_username()` - Public profile lookup
- `get_user_activity_feed()` - Activity feed
- `get_user_favorites()` - User favorites
- `is_cafe_favorited()` - Favorite status check
- `get_daily_active_users()` - Analytics
- `get_monthly_active_users()` - Analytics
- `get_engagement_metrics()` - Analytics

### Security & Performance
- Row Level Security (RLS) policies
- Proper indexes for performance
- Function permissions
- Anonymous user support

## ✅ Verification Steps

After migration, verify these work:

1. **Username Selection**:
   - Go to Profile page
   - Should prompt for username if not set

2. **Favorites**:
   - Visit any cafe detail page
   - Heart icon should toggle favorites

3. **Activity Tracking**:
   - Create a post or favorite a cafe
   - Check Profile page activity feed

4. **Admin Dashboard**:
   - Visit `/admin/dashboard`
   - Should show analytics with real data

5. **Public Profiles**:
   - Visit `/user/[username]`
   - Should show user profile

## 🐛 Troubleshooting

### Common Issues

1. **Migration Fails**:
   ```bash
   # Check Supabase status
   supabase status
   
   # Reset local database if needed
   supabase db reset
   ```

2. **TypeScript Errors**:
   ```bash
   # Regenerate types manually
   supabase gen types typescript --local > src/integrations/supabase/types.ts
   
   # Restart TypeScript server in your IDE
   ```

3. **RLS Policy Errors**:
   - Check if you're authenticated
   - Verify RLS policies in Supabase dashboard

4. **Function Permission Errors**:
   - Ensure functions are created with proper permissions
   - Check Supabase logs for detailed errors

### Rollback (If Needed)

If you need to rollback:
```bash
# Reset to previous migration
supabase db reset

# Or manually drop new tables (NOT RECOMMENDED)
# Only do this if you understand the consequences
```

## 📈 Post-Migration Steps

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Seed Sample Data** (Optional):
   ```bash
   npm run seed:reviews
   npm run seed:posts
   ```

3. **Test Features**:
   - Create a test user account
   - Test username selection
   - Test favorites functionality
   - Test activity tracking
   - Check admin dashboard

4. **Deploy**:
   - Push to your repository
   - Deploy to production
   - Run migration on production database

## 🔍 Migration File Details

The main migration file is:
- `supabase/migrations/20251006_complete_feature_implementation.sql`

This single file contains all the changes needed for the complete feature implementation.

## 📞 Support

If you encounter issues:
1. Check the Supabase logs: `supabase logs`
2. Verify your environment variables
3. Ensure Supabase CLI is up to date
4. Check the migration file for syntax errors

## 🎉 Success!

Once migration is complete, you'll have:
- ✅ Complete user identity system
- ✅ Favorites functionality
- ✅ Activity tracking
- ✅ Admin analytics dashboard
- ✅ Public user profiles
- ✅ Enhanced cafe data
- ✅ Proper TypeScript types
- ✅ Security policies
- ✅ Performance optimizations

Your BeanScene app is now ready for production! 🚀
