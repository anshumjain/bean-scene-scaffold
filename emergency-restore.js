const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with hardcoded values
const supabaseUrl = "https://hhdcequsdmosxzjebdyj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA";
const supabase = createClient(supabaseUrl, supabaseKey);

// You'll need to add your Google Places API key here
const GOOGLE_PLACES_API_KEY = "YOUR_GOOGLE_PLACES_API_KEY_HERE";

// Convert Google's price level strings to integers for database
function convertPriceLevel(priceLevel) {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE': return 0;
    case 'PRICE_LEVEL_INEXPENSIVE': return 1;
    case 'PRICE_LEVEL_MODERATE': return 2;
    case 'PRICE_LEVEL_EXPENSIVE': return 3;
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4;
    default: return null;
  }
}

async function seedBasicCafes() {
  console.log('🚀 Starting emergency cafe restoration...');
  
  if (GOOGLE_PLACES_API_KEY === "YOUR_GOOGLE_PLACES_API_KEY_HERE") {
    console.log('❌ Please add your Google Places API key to this script');
    console.log('💡 Replace YOUR_GOOGLE_PLACES_API_KEY_HERE with your actual API key');
    return;
  }
  
  // Houston coordinates for cafe seeding
  const houstonCoordinates = [
    { lat: 29.7604, lng: -95.3698, name: "Downtown Houston", radius: 5000 },
    { lat: 29.7755, lng: -95.4095, name: "Montrose/Museum District", radius: 5000 },
    { lat: 29.8016, lng: -95.3981, name: "Heights", radius: 5000 },
    { lat: 29.7604, lng: -95.4934, name: "West Houston/Galleria", radius: 5000 },
  ];
  
  const searchTerms = ['coffee shop', 'cafe', 'Starbucks', 'Dunkin'];
  
  let totalSynced = 0;
  let totalApiCalls = 0;
  const processedPlaceIds = new Set();
  
  for (const location of houstonCoordinates) {
    console.log(`\n📍 Zone: ${location.name}`);
    
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
            maxResultCount: 20
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
            if (processedPlaceIds.has(place.id)) {
              continue;
            }
            
            if (place.businessStatus === 'CLOSED_PERMANENTLY') {
              console.log(`    ⏭️ Skipping closed: ${place.displayName?.text}`);
              continue;
            }
            
            processedPlaceIds.add(place.id);
            
            try {
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
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1200));
        
      } catch (fetchError) {
        console.error(`    ❌ Error fetching "${query}":`, fetchError);
      }
    }
  }
  
  console.log('\n✅ Restoration Complete!');
  console.log(`📊 Final Stats:`);
  console.log(`  - Unique cafes restored: ${totalSynced}`);
  console.log(`  - Total API calls used: ${totalApiCalls}`);
  
  return { data: totalSynced, success: true, apiCalls: totalApiCalls };
}

// Run the restoration
(async () => {
  try {
    console.log('🎬 Starting emergency Houston cafe restoration...\n');
    const result = await seedBasicCafes();
    
    if (result.success && result.data > 0) {
      console.log(`\n🎉 SUCCESS: ${result.data} Houston coffee shops have been restored!`);
      console.log(`💰 API calls used: ${result.apiCalls}`);
    } else {
      console.log('\n⚠️ No cafes were restored. Check the logs above for errors.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  }
})();
