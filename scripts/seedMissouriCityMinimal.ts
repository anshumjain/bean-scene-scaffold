import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Node.js compatible Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('💡 Make sure SUPABASE_SERVICE_ROLE_KEY is set in your .env.local file');
  process.exit(1);
}

// Use service role key for seeding (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

async function seedMissouriCityMinimal() {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  
  console.log('🔍 Environment check:');
  console.log('  - GOOGLE_PLACES_API_KEY exists:', !!GOOGLE_PLACES_API_KEY);
  console.log('  - SUPABASE_URL exists:', !!process.env.VITE_SUPABASE_URL);
  console.log('  - SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ Google Places API key not found in environment variables');
    console.error('💡 Make sure GOOGLE_PLACES_API_KEY is set in your .env.local file');
    return { data: 0, success: false };
  }
  
  console.log('🎯 Starting MINIMAL Missouri City cafe seeding (hyper-local)...\n');
  
  // MINIMAL: Just 3 focused zones around Missouri City
  const missouriCityZones = [
    // Your exact location area
    { lat: 29.4649856, lng: -95.5285504, name: "Missouri City Center", radius: 5000 },
    // North Missouri City
    { lat: 29.4800, lng: -95.5200, name: "Missouri City North", radius: 3000 },
    // South Missouri City  
    { lat: 29.4500, lng: -95.5300, name: "Missouri City South", radius: 3000 }
  ];
  
  // MINIMAL: Only 8 most effective search terms
  const searchTerms = [
    'coffee shop Missouri City',
    'cafe Missouri City', 
    'Starbucks Missouri City',
    'Dunkin Missouri City',
    'coffee Missouri City',
    'espresso Missouri City',
    'specialty coffee Missouri City',
    'coffee house Missouri City'
  ];
  
  let totalSynced = 0;
  let totalApiCalls = 0;
  const processedPlaceIds = new Set();
  const startTime = Date.now();
  
  console.log(`📍 Zones: ${missouriCityZones.length}`);
  console.log(`🔍 Search terms: ${searchTerms.length}`);
  console.log(`🎯 Expected API calls: ${missouriCityZones.length * searchTerms.length} (MINIMAL!)\n`);
  
  for (let i = 0; i < missouriCityZones.length; i++) {
    const location = missouriCityZones[i];
    console.log(`\n📍 Zone ${i + 1}/${missouriCityZones.length}: ${location.name}`);
    
    for (const searchTerm of searchTerms) {
      console.log(`  🔍 Searching: "${searchTerm}"`);
      
      try {
        totalApiCalls++;
        
        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.photos,places.businessStatus,places.websiteUri,places.nationalPhoneNumber'
          },
          body: JSON.stringify({
            textQuery: searchTerm,
            locationBias: {
              circle: {
                center: { latitude: location.lat, longitude: location.lng },
                radius: location.radius
              }
            },
            maxResultCount: 20 // Get more results per call
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
              
              // Extract neighborhood from address
              let neighborhood = 'Missouri City';
              if (place.formattedAddress) {
                if (place.formattedAddress.includes('Sugar Land')) {
                  neighborhood = 'Sugar Land';
                } else if (place.formattedAddress.includes('Richmond')) {
                  neighborhood = 'Richmond';
                } else if (place.formattedAddress.includes('Stafford')) {
                  neighborhood = 'Stafford';
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
        
        // Minimal delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`    ❌ API Call Error:`, error);
      }
    }
    
    console.log(`  📈 Zone ${location.name} complete. Total synced so far: ${totalSynced}`);
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`\n🎉 MINIMAL Missouri City seeding complete!`);
  console.log(`📊 Total cafes synced: ${totalSynced}`);
  console.log(`🔗 Total API calls made: ${totalApiCalls}`);
  console.log(`⏱️ Duration: ${duration.toFixed(1)} seconds`);
  console.log(`💰 API cost: $${(totalApiCalls * 0.017).toFixed(2)} (MINIMAL!)`);
  
  return { data: totalSynced, success: true };
}

// Run the seeding script
seedMissouriCityMinimal()
  .then(result => {
    if (result.success) {
      console.log(`\n✅ Successfully seeded ${result.data} cafes with MINIMAL API calls!`);
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

export { seedMissouriCityMinimal };
