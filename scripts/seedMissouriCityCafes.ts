import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Node.js compatible Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('💡 Make sure SUPABASE_SERVICE_ROLE_KEY is set in your .env.local file');
  process.exit(1);
}

// Use service role key for seeding (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

async function seedMissouriCityCafes() {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ Google Places API key not found in .env.local');
    console.error('💡 Make sure GOOGLE_PLACES_API_KEY is set in .env.local file');
    return { data: 0, success: false };
  }
  
  console.log('🚀 Starting targeted Missouri City area cafe seeding...');
  console.log(`🔑 API Key loaded: ${GOOGLE_PLACES_API_KEY.substring(0, 10)}...${GOOGLE_PLACES_API_KEY.substring(GOOGLE_PLACES_API_KEY.length - 4)}\n`);
  
  // Missouri City area coordinates with your location as center
  const missouriCityCoordinates = [
    // Your location area (Missouri City)
    { lat: 29.4649856, lng: -95.5285504, name: "Missouri City Center", radius: 8000 },
    { lat: 29.4700, lng: -95.5200, name: "Missouri City North", radius: 6000 },
    { lat: 29.4600, lng: -95.5400, name: "Missouri City South", radius: 6000 },
    { lat: 29.4800, lng: -95.5100, name: "Missouri City East", radius: 6000 },
    { lat: 29.4500, lng: -95.5300, name: "Missouri City West", radius: 6000 },
    
    // Surrounding areas
    { lat: 29.5900, lng: -95.6100, name: "Sugar Land Central", radius: 8000 },
    { lat: 29.6200, lng: -95.6300, name: "Sugar Land North", radius: 6000 },
    { lat: 29.5600, lng: -95.5900, name: "Sugar Land South", radius: 6000 },
    { lat: 29.5200, lng: -95.6700, name: "Richmond/Rosenberg", radius: 8000 },
    { lat: 29.5400, lng: -95.4500, name: "Southwest Houston", radius: 8000 },
    { lat: 29.6700, lng: -95.5600, name: "Westchase/Bellaire", radius: 8000 },
    { lat: 29.6900, lng: -95.5000, name: "Alief", radius: 6000 },
    { lat: 29.4100, lng: -95.6000, name: "Stafford", radius: 6000 }
  ];
  
  // Comprehensive search terms for coffee shops
  const searchTerms = [
    'coffee shop',
    'cafe', 
    'coffee house',
    'coffee bar',
    'espresso',
    'latte',
    'cappuccino',
    'specialty coffee',
    'third wave coffee',
    'coffee beans',
    'coffee roaster',
    'Starbucks',
    'Dunkin',
    'Dunkin Donuts',
    'Caribou Coffee',
    'Peet\'s Coffee',
    'Tim Hortons',
    'Dutch Bros',
    'Black Rifle Coffee',
    'Local coffee',
    'Independent coffee',
    'Coffee and breakfast',
    'Coffee and pastries',
    'Coffee shop with wifi',
    'Study coffee shop'
  ];
  
  let totalSynced = 0;
  let totalApiCalls = 0;
  const processedPlaceIds = new Set(); // Track duplicates
  const startTime = Date.now();
  
  console.log(`📍 Zones: ${missouriCityCoordinates.length}`);
  console.log(`🔍 Search terms: ${searchTerms.length}`);
  console.log(`🎯 Expected API calls: ~${missouriCityCoordinates.length * searchTerms.length}\n`);
  
  for (let i = 0; i < missouriCityCoordinates.length; i++) {
    const location = missouriCityCoordinates[i];
    console.log(`\n📍 Zone ${i + 1}/${missouriCityCoordinates.length}: ${location.name}`);
    
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
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.photos,places.types,places.businessStatus,places.websiteUri,places.nationalPhoneNumber'
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
        
        if (!data.places || data.places.length === 0) {
          console.log(`    📭 No results found`);
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
              
              // Extract neighborhood from address
              let neighborhood = location.name;
              if (place.formattedAddress) {
                const addressParts = place.formattedAddress.split(',');
                if (addressParts.length >= 2) {
                  const cityPart = addressParts[addressParts.length - 2].trim();
                  if (cityPart.includes('Missouri City')) {
                    neighborhood = 'Missouri City';
                  } else if (cityPart.includes('Sugar Land')) {
                    neighborhood = 'Sugar Land';
                  } else if (cityPart.includes('Richmond')) {
                    neighborhood = 'Richmond';
                  } else if (cityPart.includes('Stafford')) {
                    neighborhood = 'Stafford';
                  } else if (cityPart.includes('Alief')) {
                    neighborhood = 'Alief';
                  }
                }
              }
              
              const cafeData = {
                place_id: place.id,
                name: place.displayName?.text || 'Unknown Cafe',
                address: place.formattedAddress || '',
                latitude: place.location?.latitude || 0,
                longitude: place.location?.longitude || 0,
                google_rating: place.rating || null,
                price_level: place.priceLevel ? convertPriceLevel(place.priceLevel) : null,
                phone_number: place.nationalPhoneNumber || null,
                website: place.websiteUri || null,
                neighborhood: neighborhood,
                google_photo_reference: heroPhotoReference,
                photo_source: heroPhotoReference ? 'google' : null,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              const { error } = await supabase
                .from('cafes')
                .upsert(cafeData, { 
                  onConflict: 'place_id',
                  ignoreDuplicates: false 
                });
              
              if (error) {
                console.error(`    ❌ Database Error for ${cafeData.name}:`, error.message);
              } else {
                console.log(`    ✅ Synced: ${cafeData.name} (${neighborhood})`);
                totalSynced++;
              }
              
            } catch (error) {
              console.error(`    ❌ Processing Error for ${place.displayName?.text}:`, error);
            }
          }
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`    ❌ API Call Error:`, error);
      }
    }
    
    console.log(`  📈 Zone ${location.name} complete. Total synced so far: ${totalSynced}`);
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`\n🎉 Missouri City cafe seeding complete!`);
  console.log(`📊 Total cafes synced: ${totalSynced}`);
  console.log(`🔗 Total API calls made: ${totalApiCalls}`);
  console.log(`⏱️ Duration: ${duration.toFixed(1)} seconds`);
  console.log(`💰 Estimated API cost: $${(totalApiCalls * 0.017).toFixed(2)}`);
  
  return { data: totalSynced, success: true };
}

// Run the seeding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMissouriCityCafes()
    .then(result => {
      if (result.success) {
        console.log(`\n✅ Successfully seeded ${result.data} cafes in Missouri City area!`);
        process.exit(0);
      } else {
        console.log(`\n❌ Seeding failed`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`\n💥 Seeding error:`, error);
      process.exit(1);
    });
}

export { seedMissouriCityCafes };
