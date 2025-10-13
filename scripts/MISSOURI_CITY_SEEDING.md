# Missouri City Cafe Seeding 🌟

This script seeds cafes specifically in the Missouri City area and surrounding neighborhoods.

## What it does:

- **Targets your exact location**: Centered on Missouri City (29.4649856, -95.5285504)
- **Comprehensive coverage**: 13 zones covering Missouri City, Sugar Land, Richmond, Stafford, Alief
- **Smart search**: 24 different search terms including chains and local coffee shops
- **Duplicate prevention**: Tracks processed places to avoid duplicates
- **Rich data**: Includes photos, ratings, phone numbers, websites, neighborhoods

## How to run:

### Option 1: Using npm script (Recommended)
```bash
npm run seed:missouri-city
```

### Option 2: Direct execution
```bash
npx tsx scripts/seedMissouriCityCafes.ts
```

### Option 3: Using the runner script
```bash
node scripts/runMissouriCitySeeding.js
```

## Coverage Areas:

1. **Missouri City Center** - Your exact location area
2. **Missouri City North/South/East/West** - Surrounding areas
3. **Sugar Land Central/North/South** - Major nearby area
4. **Richmond/Rosenberg** - Southwest coverage
5. **Southwest Houston** - Broader coverage
6. **Westchase/Bellaire** - North coverage
7. **Alief** - Northeast coverage
8. **Stafford** - South coverage

## Search Terms Used:

- Coffee shop, cafe, coffee house, coffee bar
- Espresso, latte, cappuccino
- Specialty coffee, third wave coffee
- Major chains: Starbucks, Dunkin, Caribou, Peet's, Tim Hortons, Dutch Bros
- Local terms: Local coffee, independent coffee
- Functional terms: Coffee and breakfast, study coffee shop, wifi coffee

## Expected Results:

- **~300 API calls** (13 zones × 24 search terms)
- **~$5.10 cost** (at $0.017 per call)
- **~2-3 minutes** execution time
- **50-200+ cafes** depending on area density

## Environment Requirements:

Make sure these are set in your `.env.local` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

## After Running:

1. Check your app - you should now see many more cafes near your location
2. The distance filtering should work much better
3. You'll have cafes within walking/driving distance of Missouri City

## Troubleshooting:

- **"API key not found"**: Check your `.env.local` file has `GOOGLE_PLACES_API_KEY`
- **"Missing Supabase variables"**: Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Rate limiting**: The script includes delays, but if you hit limits, wait a few minutes and retry
