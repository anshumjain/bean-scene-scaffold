import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Node.js compatible Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Node.js compatible Google Places sync
export async function syncGooglePlacesCafes() {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('Google Places API key not found');
    return { data: 0, success: false, error: 'API key missing' };
  }
  
  console.log('Starting Google Places sync...');
  
  try {
    const queries = ['coffee shop houston', 'cafe houston'];
    let totalSynced = 0;
    
    for (const query of queries) {
      console.log(`Searching for: ${query}`);
      
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=29.7604,-95.3698&radius=50000&key=${GOOGLE_PLACES_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`Results found:`, data.results?.length || 0);
      
      if (data.results) {
        for (const place of data.results) {
          await saveCafeToDatabase(place);
          totalSynced++;
        }
      }
    }
    
    return { data: totalSynced, success: true };
  } catch (error) {
    console.error('Sync error:', error);
    return { data: 0, success: false, error: 'Sync failed' };
  }
}

async function saveCafeToDatabase(place: any) {
  const cafeData = {
    place_id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    google_rating: place.rating,
    price_level: place.price_level,
    is_active: true
  };
  
  const { error } = await supabase
    .from('cafes')
    .upsert(cafeData, { onConflict: 'place_id' });
  
  if (error) {
    console.error('Error saving cafe:', error);
  } else {
    console.log(`Saved: ${cafeData.name}`);
  }
}
