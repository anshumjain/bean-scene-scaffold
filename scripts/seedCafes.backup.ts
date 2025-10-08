import { createClient } from '@supabase/supabase-js';

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
    console.error('Google Places API key not found');
    return { data: 0, success: false };
  }
  
  console.log('Starting Google Places sync...');
  
  // Houston metro area coordinate grid for comprehensive coverage
  const houstonCoordinates = [
    { lat: 29.7604, lng: -95.3698, name: "Downtown Houston" },
    { lat: 29.8016, lng: -95.3981, name: "Heights/North Houston" },
    { lat: 29.7372, lng: -95.2891, name: "East Houston" },
    { lat: 29.7604, lng: -95.4934, name: "West Houston" },
    { lat: 29.6774, lng: -95.3698, name: "South Houston" },
    { lat: 29.7755, lng: -95.4095, name: "Montrose/River Oaks" },
    { lat: 29.7372, lng: -95.4147, name: "Southwest Houston" },
    { lat: 29.7982, lng: -95.2891, name: "Northeast Houston" },
    { lat: 29.6774, lng: -95.2891, name: "Southeast Houston" }
  ];
  
  const searchTerms = ['coffee shop', 'cafe', 'coffee house'];
  let totalSynced = 0;
  const processedPlaceIds = new Set(); // Track duplicates
  
  for (const location of houstonCoordinates) {
    for (const searchTerm of searchTerms) {
      const query = `${searchTerm} ${location.name}`;
      console.log(`Searching: ${query}`);
      
      try {
        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.photos'
          },
          body: JSON.stringify({
            textQuery: query,
            locationBias: {
              circle: {
                center: { latitude: location.lat, longitude: location.lng },
                radius: 25000 // 25km radius from each point
              }
            },
            maxResultCount: 60 // Google's maximum per query
          })
        });
        
        const data = await response.json();
        console.log(`API Response status: ${response.status}`);
        console.log(`Results found: ${data.places?.length || 0}`);
        
        if (data.error) {
          console.error('Google API Error:', data.error);
          continue;
        }
        
        if (data.places) {
          for (const place of data.places) {
            // Skip duplicates across different searches
            if (processedPlaceIds.has(place.id)) {
              console.log(`Skipping duplicate: ${place.displayName?.text || place.displayName}`);
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
                price_level: convertPriceLevel(place.priceLevel), // Convert string to integer
                google_photo_reference: heroPhotoReference,
                is_active: true
              };
              
              console.log(`Processing cafe: ${cafeData.name}`);
              
              const { error } = await supabase
                .from('cafes')
                .upsert(cafeData, { onConflict: 'place_id' });
              
              if (error) {
                console.error('Error saving cafe:', error);
              } else {
                console.log(`✅ Saved: ${cafeData.name}`);
                totalSynced++;
              }
            } catch (placeError) {
              console.error('Error processing place:', placeError);
            }
          }
        }
        
        // Rate limiting - wait between API calls to avoid hitting limits
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (fetchError) {
        console.error(`Error fetching data for "${query}":`, fetchError);
      }
    }
  }
  
  console.log(`Sync completed. Total cafes synced: ${totalSynced}`);
  return { data: totalSynced, success: true };
}

// Run the sync
(async () => {
  try {
    console.log('Starting cafe seeding...');
    const result = await syncGooglePlacesCafes();
    console.log('Seeding result:', result);
    
    if (result.success && result.data > 0) {
      console.log(`SUCCESS: ${result.data} Houston coffee shops have been seeded to your database!`);
    } else {
      console.log('No cafes were seeded. Check the logs above for any errors.');
    }
  } catch (err) {
    console.error('Fatal error:', err);
  }
})();
