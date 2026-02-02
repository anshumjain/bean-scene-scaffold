/**
 * Seed Austin cafes from Google Places API
 * Similar to Houston seeding but for Austin metro area
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  console.error('❌ Google Places API key not found in .env.local');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Austin metro area zones - more compact than Houston
const austinCoordinates = [
  // Central Austin (5km radius)
  { lat: 30.2672, lng: -97.7431, name: "Downtown Austin", radius: 5000 },
  { lat: 30.2849, lng: -97.7341, name: "East Austin", radius: 5000 },
  { lat: 30.2747, lng: -97.7404, name: "South Austin", radius: 5000 },
  { lat: 30.2500, lng: -97.7500, name: "South Lamar", radius: 5000 },
  { lat: 30.2800, lng: -97.7300, name: "Rainey Street", radius: 5000 },
  { lat: 30.2600, lng: -97.7200, name: "South Congress", radius: 5000 },
  
  // University & North (5km radius)
  { lat: 30.2864, lng: -97.7394, name: "University of Texas", radius: 5000 },
  { lat: 30.3000, lng: -97.7500, name: "North Austin", radius: 5000 },
  { lat: 30.3200, lng: -97.7600, name: "Domain/Arboretum", radius: 5000 },
  
  // West & Outlying (8km radius)
  { lat: 30.2700, lng: -97.8000, name: "West Austin", radius: 8000 },
  { lat: 30.2400, lng: -97.7800, name: "Zilker/Barton Springs", radius: 8000 },
  { lat: 30.3100, lng: -97.7000, name: "Mueller", radius: 8000 },
];

const searchTerms = [
  'coffee shop',
  'cafe',
  'coffee house',
  'espresso bar',
  'coffee roaster',
  'specialty coffee',
  'third wave coffee',
  'coffee bar',
  'breakfast coffee',
  'coffee beans',
  'local coffee',
  'roastery',
];

function convertPriceLevel(priceLevel: string): number | null {
  if (priceLevel === 'PRICE_LEVEL_FREE' || priceLevel === '0') return 0;
  if (priceLevel === 'PRICE_LEVEL_INEXPENSIVE' || priceLevel === '1') return 1;
  if (priceLevel === 'PRICE_LEVEL_MODERATE' || priceLevel === '2') return 2;
  if (priceLevel === 'PRICE_LEVEL_EXPENSIVE' || priceLevel === '3') return 3;
  if (priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE' || priceLevel === '4') return 4;
  return null;
}

async function seedAustinCafes() {
  console.log('🌆 Starting Austin cafe seeding...\n');
  console.log(`🔑 API Key: ${GOOGLE_PLACES_API_KEY.substring(0, 10)}...${GOOGLE_PLACES_API_KEY.substring(GOOGLE_PLACES_API_KEY.length - 4)}\n`);
  
  let totalSynced = 0;
  let totalApiCalls = 0;
  const processedPlaceIds = new Set<string>();
  const startTime = Date.now();
  
  console.log(`📍 Zones: ${austinCoordinates.length}`);
  console.log(`🔍 Search terms: ${searchTerms.length}`);
  console.log(`🎯 Expected API calls: ~${austinCoordinates.length * searchTerms.length}\n`);
  
  for (let i = 0; i < austinCoordinates.length; i++) {
    const location = austinCoordinates[i];
    console.log(`\n📍 Zone ${i + 1}/${austinCoordinates.length}: ${location.name}`);
    
    for (const searchTerm of searchTerms) {
      const query = `${searchTerm} ${location.name} Austin TX`;
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
              continue; // Skip duplicates
            }
            
            // Only process cafes (filter out other business types)
            const types = place.types || [];
            const isCafe = types.some((t: string) => 
              t.includes('cafe') || 
              t.includes('coffee') || 
              t === 'restaurant' ||
              t === 'food'
            );
            
            if (!isCafe && !place.displayName?.toLowerCase().includes('coffee') && 
                !place.displayName?.toLowerCase().includes('cafe')) {
              continue;
            }
            
            processedPlaceIds.add(place.id);
            
            // Extract neighborhood from address (simple heuristic)
            const address = place.formattedAddress || '';
            let neighborhood = 'Austin';
            if (address.includes('South Austin') || address.includes('South Lamar') || address.includes('SoCo')) {
              neighborhood = 'South Austin';
            } else if (address.includes('East Austin') || address.includes('Eastside')) {
              neighborhood = 'East Austin';
            } else if (address.includes('North Austin') || address.includes('Domain') || address.includes('Arboretum')) {
              neighborhood = 'North Austin';
            } else if (address.includes('West Austin') || address.includes('Westlake')) {
              neighborhood = 'West Austin';
            } else if (address.includes('Downtown')) {
              neighborhood = 'Downtown';
            } else if (address.includes('University') || address.includes('UT')) {
              neighborhood = 'University';
            }
            
            // Handle displayName which can be string or object
            let cafeName = 'Unknown Cafe';
            if (place.displayName) {
              if (typeof place.displayName === 'string') {
                cafeName = place.displayName;
              } else if (place.displayName.text) {
                cafeName = place.displayName.text;
              }
            }
            
            const cafeData = {
              place_id: place.id,
              name: cafeName,
              address: address,
              neighborhood: neighborhood,
              latitude: place.location?.latitude || 0,
              longitude: place.location?.longitude || 0,
              google_rating: place.rating || null,
              price_level: place.priceLevel ? convertPriceLevel(place.priceLevel.toString()) : null,
              google_photo_reference: place.photos?.[0]?.name || null,
              is_active: true,
              tags: [],
              photo_source: 'google',
            };
            
            // Upsert cafe
            const { error: upsertError } = await supabase
              .from('cafes')
              .upsert(cafeData, { onConflict: 'place_id' });
            
            if (upsertError) {
              console.error(`    ❌ Error saving ${cafeData.name}:`, upsertError.message);
            } else {
              totalSynced++;
              console.log(`    ✅ ${cafeData.name} (${neighborhood})`);
            }
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error: any) {
        console.error(`    ❌ Error:`, error.message);
      }
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log('🎉 Austin Seeding Complete!');
  console.log('='.repeat(60));
  console.log(`✅ Cafes synced: ${totalSynced}`);
  console.log(`💰 API calls used: ${totalApiCalls}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`💵 Estimated cost: $${(totalApiCalls * 0.032).toFixed(2)}`);
  console.log('='.repeat(60) + '\n');
  
  return { success: true, data: totalSynced, apiCalls: totalApiCalls };
}

(async () => {
  try {
    await seedAustinCafes();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
})();
