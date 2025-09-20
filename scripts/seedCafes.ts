import { createClient } from '@supabase/supabase-js';

// Node.js compatible Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function syncGooglePlacesCafes() {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('Google Places API key not found');
    return { data: 0, success: false };
  }
  
  console.log('Starting Google Places sync...');
  
  const queries = ['coffee shop houston', 'cafe houston', 'espresso bar houston', 'coffee house houston'];
  let totalSynced = 0;
  
  for (const query of queries) {
    console.log(`Searching for: ${query}`);
    
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
              center: { latitude: 29.7604, longitude: -95.3698 },
              radius: 50000
            }
          },
          maxResultCount: 20
        })
      });
      
      const data = await response.json();
      console.log(`API Response status:`, response.status);
      console.log(`Results found:`, data.places?.length || 0);
      
      if (data.error) {
        console.error('Google API Error:', data.error);
        continue;
      }
      
      if (data.places) {
        for (const place of data.places) {
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
              price_level: place.priceLevel,
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
              console.log(`Saved: ${cafeData.name}`);
              totalSynced++;
            }
          } catch (placeError) {
            console.error('Error processing place:', placeError);
          }
        }
      }
      
      // Rate limiting - wait between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (fetchError) {
      console.error(`Error fetching data for query "${query}":`, fetchError);
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
