# Database Seeding Scripts

This directory contains scripts to populate the Bean Scene database with initial data.

## Prerequisites

1. Make sure you have a `.env.local` file with the following environment variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_PLACES_API_KEY=your_google_places_api_key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Scripts

### 1. Seed Cafes (`seedCafes.ts`)
Populates the database with cafe information from Google Places API.

```bash
npx ts-node scripts/seedCafes.ts
```

### 2. Seed Posts (`seedPosts.ts`) - **Updated with Google Reviews**
Creates mock posts for the memories/moments feed using **real Google reviews** from each cafe.

**Features:**
- Fetches actual Google reviews for each cafe
- Uses Google reviews as post captions for authentic content
- Falls back to generic templates if Google reviews are unavailable
- Creates Instagram-like feed experience for users

```bash
npx ts-node scripts/seedPosts.ts
```

**Note:** This script will make API calls to Google Places API to fetch reviews. Make sure you have sufficient API quota.

### 3. Seed Reviews & Amenities (`seedReviewsAmenities.ts`)
Adds additional review data and cafe amenities.

```bash
npx ts-node scripts/seedReviewsAmenities.ts
```

## Running All Scripts

To seed the entire database:

```bash
# 1. First, seed cafes
npx ts-node scripts/seedCafes.ts

# 2. Then, seed posts with Google reviews
npx ts-node scripts/seedPosts.ts

# 3. Finally, add reviews and amenities
npx ts-node scripts/seedReviewsAmenities.ts
```

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