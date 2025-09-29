import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Node.js compatible Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Convert Google's price level strings to integers for database
function convertPriceLevel(priceLevel: string): number | null {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE': return 0;
    case 'PRICE_LEVEL_INEXPENSIVE': return 1;
    case 'PRICE_LEVEL_MODERATE': return 2;
    case 'PRICE_LEVEL_EXPENSIVE': return 3;
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4;
    default: return null;
  }
}

async function syncGooglePlacesCafes() {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ Google Places API key not found in .env.local');
    console.error('💡 Make sure GOOGLE_PLACES_API_KEY is set in .env.local file');
    return { data: 0, success: false };
  }
  
  console.log('🚀 Starting comprehensive Houston metro cafe seeding...');
  console.log(`🔑 API Key loaded: ${GOOGLE_PLACES_API_KEY.substring(0, 10)}...${GOOGLE_PLACES_API_KEY.substring(GOOGLE_PLACES_API_KEY.length - 4)}\n`);
  
  // EXPANDED: 25 Houston metro area zones for complete coverage
  const houstonCoordinates = [
    // Inner Loop (5km radius)
    { lat: 29.7604, lng: -95.3698, name: "Downtown Houston", radius: 5000 },
    { lat: 29.7755, lng: -95.4095, name: "Montrose/Museum District", radius: 5000 },
    { lat: 29.8016, lng: -95.3981, name: "Heights", radius: 5000 },
    { lat: 29.7372, lng: -95.2891, name: "East End/EaDo", radius: 5000 },
    { lat: 29.6774, lng: -95.3698, name: "Medical Center", radius: 5000 },
    { lat: 29.7982, lng: -95.2891, name: "Near Northside", radius: 5000 },
    { lat: 29.6774, lng: -95.2891, name: "Southeast Houston", radius: 5000 },
    { lat: 29.7604, lng: -95.4934, name: "West Houston/Galleria", radius: 5000 },
    { lat: 29.8200, lng: -95.4000, name: "North Heights", radius: 5000 },
    
    // Inner Suburbs (8km radius)
    { lat: 29.5600, lng: -95.0890, name: "Clear Lake/NASA", radius: 8000 },
    { lat: 29.9600, lng: -95.3400, name: "North Houston/Intercontinental", radius: 8000 },
    { lat: 29.7200, lng: -95.6500, name: "West Houston/Katy Edge", radius: 8000 },
    { lat: 29.5400, lng: -95.4500, name: "Southwest Houston", radius: 8000 },
    { lat: 30.0600, lng: -95.5500, name: "The Woodlands South", radius: 8000 },
    { lat: 29.6900, lng: -95.5600, name: "Westchase/Bellaire", radius: 8000 },
    
    // Outer Metro (10km radius)
    { lat: 30.1587, lng: -95.4969, name: "The Woodlands", radius: 10000 },
    { lat: 29.8197, lng: -95.6404, name: "Northwest Houston/Cypress", radius: 10000 },
    { lat: 29.6200, lng: -95.2000, name: "Pasadena/Deer Park", radius: 10000 },
    { lat: 29.5500, lng: -95.1000, name: "League City/Webster", radius: 10000 },
    { lat: 29.7800, lng: -95.8200, name: "Katy", radius: 10000 },
    { lat: 30.0200, lng: -95.1400, name: "Humble/Atascocita", radius: 10000 },
    { lat: 29.6100, lng: -95.6300, name: "Sugar Land/Missouri City", radius: 10000 },
    { lat: 29.5200, lng: -95.6700, name: "Richmond/Rosenberg", radius: 10000 },
    { lat: 30.3200, lng: -95.4600, name: "Conroe/Montgomery County", radius: 10000 },
    { lat: 29.4600, lng: -95.0400, name: "Galveston County North", radius: 10000 }
  ];
  
  // EXPANDED: Comprehensive search terms including chains
  const searchTerms = [
    'coffee shop',
    'cafe', 
    'coffee house',
    'espresso bar',
    'coffee roaster',
    'Starbucks',
    'Dunkin',
    'specialty coffee',
    'third wave coffee',
    'coffee bar',
    'breakfast coffee',
    'coffee beans'
  ];
  
  let totalSynced = 0;
  let totalApiCalls = 0;
  const processedPlaceIds = new Set(); // Track duplicates
  const startTime = Date.now();
  
  console.log(`📍 Zones: ${houstonCoordinates.length}`);
  console.log(`🔍 Search terms: ${searchTerms.length}`);
  console.log(`🎯 Expected API calls: ~${houstonCoordinates.length * searchTerms.length}\n`);
  
  for (let i = 0; i < houstonCoordinates.length; i++) {
    const location = houstonCoordinates[i];
    console.log(`\n📍 Zone ${i + 1}/${houstonCoordinates.length}: ${location.name}`);
    
    for (const searchTerm of searchTerms) {
      const query = `${searchTerm} ${location.name}`;
      console.log(`  🔍 Searching: "${searchTerm}"`);
      
      try {
        totalApiCalls++;
        
        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.photos,places.types,places.businessStatus'
          },
          body: JSON.stringify({
            textQuery: query,
            locationBias: {
              circle: {
                center: { latitude: location.lat, longitude: location.lng },
                radius: location.radius
              }
            },
            maxResultCount: 20 // Reduced to save API calls
          })
        });
        
        const data = await response.json();
        
        if (data.error) {
          console.error(`    ❌ Google API Error:`, data.error);
          continue;
        }
        
        if (response.status === 429) {
          console.error(`    ⚠️ Rate limit hit! Waiting 60 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 60000));
          continue;
        }
        
        const resultsCount = data.places?.length || 0;
        console.log(`    📊 Found ${resultsCount} results`);
        
        if (data.places) {
          for (const place of data.places) {
            // Skip duplicates across different searches
            if (processedPlaceIds.has(place.id)) {
              continue;
            }
            
            // Skip permanently closed businesses
            if (place.businessStatus === 'CLOSED_PERMANENTLY') {
              console.log(`    ⏭️ Skipping closed: ${place.displayName?.text}`);
              continue;
            }
            
            processedPlaceIds.add(place.id);
            
            try {
              // Get the first photo reference if available
              let heroPhotoReference = null;
              if (place.photos && place.photos.length > 0) {
                heroPhotoReference = place.photos[0].name;
              }
              
              const cafeData = {
                place_id: place.id,
                name: place.displayName?.text || place.displayName,
                address: place.formattedAddress,
                latitude: place.location.latitude,
                longitude: place.location.longitude,
                google_rating: place.rating,
                price_level: convertPriceLevel(place.priceLevel),
                google_photo_reference: heroPhotoReference,
                is_active: true,
                tags: []
              };
              
              const { error } = await supabase
                .from('cafes')
                .upsert(cafeData, { onConflict: 'place_id' });
              
              if (error) {
                console.error(`    ❌ Error saving ${cafeData.name}:`, error.message);
              } else {
                totalSynced++;
                console.log(`    ✅ Saved: ${cafeData.name}`);
              }
            } catch (placeError) {
              console.error('    ❌ Error processing place:', placeError);
            }
          }
        }
        
        // Rate limiting - wait between API calls
        await new Promise(resolve => setTimeout(resolve, 1200));
        
      } catch (fetchError) {
        console.error(`    ❌ Error fetching "${query}":`, fetchError);
      }
    }
    
    // Progress update after each zone
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`  📊 Progress: ${totalSynced} cafes saved | ${totalApiCalls} API calls | ${elapsed} min elapsed`);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);
  
  console.log('\n✅ Seeding Complete!');
  console.log(`📊 Final Stats:`);
  console.log(`  - Unique cafes saved: ${totalSynced}`);
  console.log(`  - Total API calls used: ${totalApiCalls}`);
  console.log(`  - Total duration: ${duration} minutes`);
  console.log(`  - Average: ${(totalApiCalls / parseFloat(duration)).toFixed(1)} calls/minute`);
  
  return { data: totalSynced, success: true, apiCalls: totalApiCalls };
}

// Run the sync
(async () => {
  try {
    console.log('🎬 Starting comprehensive Houston metro cafe seeding...\n');
    const result = await syncGooglePlacesCafes();
    
    if (result.success && result.data > 0) {
      console.log(`\n🎉 SUCCESS: ${result.data} Houston coffee shops have been seeded to your database!`);
      console.log(`💰 API calls used: ${result.apiCalls}`);
    } else {
      console.log('\n⚠️ No cafes were seeded. Check the logs above for errors.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  }
})();