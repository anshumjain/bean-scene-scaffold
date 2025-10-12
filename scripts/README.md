# Database Seeding Scripts

This directory contains scripts to populate the Bean Scene database with initial data and restore the database schema.

## Prerequisites

1. Make sure you have a `.env.local` file with the following environment variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_PLACES_API_KEY=your_google_places_api_key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Database Restoration

### 1. Restore Database Schema (`restore-database.ts`)
**⚠️ IMPORTANT: Run this first if your database was accidentally purged**

This script restores the core database schema including all tables, indexes, and RLS policies.

```bash
npx ts-node scripts/restore-database.ts
```

**What it does:**
- Creates all essential tables (cafes, users, posts, cafe_reviews, favorites, feedback, tag_reports)
- Sets up proper indexes for performance
- Configures Row Level Security (RLS) policies
- Verifies the database structure

## Seeding Scripts

### 2. Comprehensive Seeding (`seedAllData.ts`)
**🌱 NEW: Complete seeding solution**

Populates the database with comprehensive cafe data from Google Places API.

```bash
npx ts-node scripts/seedAllData.ts
```

**Features:**
- Searches 15 Houston areas with 14 different search terms
- Fetches cafe details, hours, contact info, and basic information
- Handles rate limiting and error recovery
- Comprehensive coverage of Houston coffee scene

### 3. Individual Cafe Seeding (`seedCafes.ts`)
Original cafe seeding script for basic cafe data.

```bash
npx ts-node scripts/seedCafes.ts
```

### 4. Reviews & Amenities (`seedReviewsAmenities.ts`)
Adds additional review data and cafe amenities to existing cafes.

```bash
npx ts-node scripts/seedReviewsAmenities.ts
```

## Quick Recovery Process

If your database was accidentally purged, follow these steps:

```bash
# 1. First, restore the database schema
npx ts-node scripts/restore-database.ts

# 2. Then, seed all cafe data (recommended)
npx ts-node scripts/seedAllData.ts

# OR use individual scripts:
npx ts-node scripts/seedCafes.ts
npx ts-node scripts/seedReviewsAmenities.ts
```

## Admin Dashboard

You can also use the admin dashboard to seed data:

1. Go to `/admin/login`
2. Login with: `admin` / `beanscene2024`
3. Use the "🌱 Seed All Cafe Data" button
4. Monitor progress and results

## Expected Results

After successful seeding, you should have:
- 200-500+ cafes across Houston
- Complete cafe details (hours, phone, website, basic info)
- Proper database structure with all relationships

## Important Notes

- **Google Reviews Integration**: The `seedPosts.ts` script now uses real Google reviews to create authentic post captions, making the memories page feel like a real Instagram feed.
- **API Rate Limits**: The script includes delays between API calls to respect Google Places API rate limits.
- **Fallback Support**: If Google reviews are unavailable, the script falls back to generic review templates.
- **Cafe Clickability**: All posts now include proper `placeId` data, making cafe names clickable in the UI.

## Troubleshooting

1. **API Key Issues**: Ensure your Google Places API key has the following APIs enabled:
   - Places API
   - Places API (New)

2. **Rate Limit Errors**: If you encounter rate limit errors, increase the delay between API calls in the script.

3. **No Reviews Found**: Some cafes may not have Google reviews. The script will automatically use fallback templates for these cases.