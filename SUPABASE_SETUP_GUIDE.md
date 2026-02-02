# Supabase Connection Setup Guide

This guide will help you connect to your Supabase database using scripts and set up the environment properly.

## 🚀 Quick Start

### 1. Create Environment File

Create a `.env.local` file in your project root with the following content:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://hhdcequsdmosxzjebdyj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA

# Service Role Key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Google Places API Key (for cafe seeding)
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

### 2. Test Your Connection

Run the connection test script:

```bash
npx ts-node scripts/testSupabaseConnection.ts
```

This will verify:
- ✅ Basic Supabase connection
- ✅ Table structure validation
- ✅ Data count checks
- ✅ Admin operations (if service key provided)
- ✅ Sample data fetching

## 🔧 Available Scripts

### Connection & Testing
```bash
# Test Supabase connection
npx ts-node scripts/testSupabaseConnection.ts

# Test with existing node client
npx ts-node scripts/nodeSupabaseClient.ts
```

### Database Management
```bash
# Restore database schema (if accidentally purged)
npx ts-node scripts/restore-database.ts

# Seed all cafe data
npx ts-node scripts/seedAllData.ts

# Seed individual components
npx ts-node scripts/seedCafes.ts
npx ts-node scripts/seedReviewsAmenities.ts
```

### Data Operations
```bash
# Update cafe tags
npm run update:cafe-tags

# Mark Google content
npm run mark-google-content

# Generate sitemap
npm run generate:sitemap
```

## 🗄️ Database Schema

Your Supabase database includes these main tables:

- **cafes** - Coffee shop data from Google Places
- **users** - User accounts and profiles
- **posts** - User-generated content and memories
- **cafe_reviews** - Reviews and ratings
- **favorites** - User's favorite cafes
- **feedback** - User feedback and reports
- **tag_reports** - Tag reporting system

## 🔑 Getting API Keys

### Supabase Keys
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `hhdcequsdmosxzjebdyj`
3. Go to **Settings** > **API**
4. Copy the following:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### Google Places API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Places API**
3. Create credentials → API Key
4. Add the key to your `.env.local` file

## 🚨 Troubleshooting

### Connection Issues
```bash
# Check if environment variables are loaded
npx ts-node -e "console.log(process.env.VITE_SUPABASE_URL)"

# Verify Supabase project is active
# Go to https://app.supabase.com and check project status
```

### Database Issues
```bash
# If database was accidentally purged, restore schema:
npx ts-node scripts/restore-database.ts

# Then seed with data:
npx ts-node scripts/seedAllData.ts
```

### Permission Issues
- Ensure your API keys have the correct permissions
- Check Row Level Security (RLS) policies in Supabase
- Verify service role key for admin operations

## 📊 Monitoring

### Check Database Health
```bash
# Run comprehensive connection test
npx ts-node scripts/testSupabaseConnection.ts

# Check specific table counts
npx ts-node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supabase.from('cafes').select('*', { count: 'exact', head: true }).then(r => console.log('Cafes:', r.count));
"
```

### Admin Dashboard
1. Go to `/admin/login` in your app
2. Login with: `admin` / `beanscene2024`
3. Use the dashboard to:
   - Monitor database health
   - Seed data
   - View analytics

## 🔄 Common Workflows

### Fresh Setup
```bash
# 1. Create .env.local with your keys
# 2. Test connection
npx ts-node scripts/testSupabaseConnection.ts

# 3. Restore schema if needed
npx ts-node scripts/restore-database.ts

# 4. Seed data
npx ts-node scripts/seedAllData.ts
```

### Daily Development
```bash
# Start development server
npm run dev

# Test changes
npx ts-node scripts/testSupabaseConnection.ts
```

### Data Updates
```bash
# Update cafe information
npm run update:cafe-tags

# Sync with Google Places
npx ts-node scripts/seedCafes.ts
```

## 🆘 Need Help?

If you encounter issues:

1. **Check the logs** - Most scripts provide detailed error messages
2. **Verify API keys** - Ensure all keys are correctly set in `.env.local`
3. **Test connection** - Run `testSupabaseConnection.ts` to diagnose issues
4. **Check Supabase dashboard** - Verify your project is active and accessible

## 📝 Notes

- The project ID `hhdcequsdmosxzjebdyj` is already configured
- All scripts use the existing `nodeSupabaseClient.ts` for consistency
- Environment variables are loaded from `.env.local` for security
- Scripts include proper error handling and logging



