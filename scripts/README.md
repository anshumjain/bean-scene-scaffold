# BeanScene Database Seeding Scripts

This directory contains scripts to populate the BeanScene database with realistic sample data.

## Prerequisites

1. **Environment Variables**: Ensure your `.env` file contains:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Dependencies**: Install required packages:
   ```bash
   npm install @faker-js/faker tsx
   ```

3. **Database Setup**: Run all migrations first:
   ```bash
   supabase db push
   ```

## Available Scripts

### 1. Seed Reviews and Amenities (`seedReviewsAmenities.ts`)

Fetches real data from Google Places API to populate:
- Cafe reviews from Google Places
- Opening hours
- Phone numbers
- Websites
- Price levels

**Usage:**
```bash
npm run seed:reviews
```

**Features:**
- Processes 50 cafes per batch
- Skips cafes that already have reviews (idempotent)
- Respects API rate limits with delays
- Logs progress and success/failure rates
- Updates cafe details with missing information

**Estimated Cost:** ~$0.85 for 50 cafes (Google Places API pricing)

### 2. Seed Posts (`seedPosts.ts`)

Generates realistic user posts with:
- Random usernames
- Realistic review text
- Coffee-related tags
- Unsplash coffee images
- Ratings between 3-5 stars
- Timestamps over the past 2-3 weeks

**Usage:**
```bash
npm run seed:posts
```

**Features:**
- Creates 50 diverse posts
- Uses realistic Houston coffee shop names
- Generates authentic review content
- Includes proper tagging system
- Distributes posts across different cafes

## Running the Scripts

### Option 1: Individual Scripts
```bash
# Seed reviews and amenities first
npm run seed:reviews

# Then seed posts
npm run seed:posts
```

### Option 2: All at Once
```bash
npm run seed:reviews && npm run seed:posts
```

## Expected Results

After running both scripts, you should have:

- **Reviews**: 3-5 Google reviews per cafe (for cafes with available data)
- **Posts**: 50 user-generated posts with images and reviews
- **User Activities**: Activity logs for all generated posts
- **Analytics Data**: Real metrics for the admin dashboard

## Troubleshooting

### Common Issues

1. **Google Places API Errors**
   - Ensure API key is configured
   - Check API quotas and billing
   - Verify place IDs are valid

2. **Supabase Connection Issues**
   - Verify environment variables
   - Check Supabase project status
   - Ensure RLS policies allow inserts

3. **Rate Limiting**
   - Scripts include built-in delays
   - Reduce batch sizes if needed
   - Check API usage in Google Cloud Console

### Monitoring Progress

Both scripts provide detailed logging:
- Progress indicators
- Success/failure counts
- Error details for failed operations
- Final summary statistics

## Data Quality

The seeded data includes:
- **Realistic usernames**: Coffee-themed usernames
- **Authentic reviews**: Human-written review templates
- **Proper tagging**: Coffee-related tags from the app's tag system
- **Realistic ratings**: 3-5 star ratings (no perfect scores)
- **Diverse content**: Mix of check-ins, reviews, and photo posts

## Next Steps

After seeding:
1. Verify data in Supabase dashboard
2. Test the app with populated data
3. Check admin analytics dashboard
4. Validate user profiles and activity feeds

## Cost Considerations

- **Google Places API**: ~$0.017 per place details request
- **Supabase**: Minimal cost for database operations
- **Unsplash**: Free for development use

Total estimated cost for full seeding: ~$1-2
