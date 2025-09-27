// /api/seed-cafes.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Houston metro area bounds
const HOUSTON_BOUNDS = {
  north: 30.5,
  south: 29.0,
  east: -94.5,
  west: -96.0
};

function isWithinHoustonMetro(lat: number, lng: number): boolean {
  return lat >= HOUSTON_BOUNDS.south && lat <= HOUSTON_BOUNDS.north &&
         lng >= HOUSTON_BOUNDS.west && lng <= HOUSTON_BOUNDS.east;
}

function detectNeighborhood(lat: number, lng: number): string {
  // Simple neighborhood detection based on coordinates
  if (lat > 29.7 && lng > -95.4) return 'Downtown';
  if (lat > 29.8 && lng < -95.4) return 'Heights';
  if (lat < 29.7 && lng > -95.3) return 'Midtown';
  if (lat < 29.6 && lng < -95.4) return 'West University';
  return 'Houston';
}

async function saveCafeToDatabase(place: any, supabase: any): Promise<void> {
  try {
    // Get only the first (hero) photo if available
    let heroPhotoUrl: string | null = null;
    let photoReference: string | null = null;
    
    if (place.photos && place.photos.length > 0 && GOOGLE_PLACES_API_KEY) {
      // Extract the actual photo reference from the places API result
      const photoRef = place.photos[0].photo_reference;
      photoReference = photoRef;
      
      // Generate the proper Google Photos API URL
      heroPhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=600&photoreference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;
      
      console.log(`Generated photo URL for ${place.name}:`, heroPhotoUrl);
    }

    const cafeData = {
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      neighborhood: detectNeighborhood(
        place.geometry.location.lat, 
        place.geometry.location.lng
      ),
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      google_rating: place.rating,
      price_level: place.price_level,
      phone_number: place.formatted_phone_number,
      website: place.website,
      opening_hours: place.opening_hours?.weekday_text,
      hero_photo_url: heroPhotoUrl,
      google_photo_reference: photoReference,
      photos: [], // Keep empty for user-uploaded photos only
      tags: [], // Will be populated by user posts
      is_active: true
    };
    
    console.log(`Saving cafe to database: ${cafeData.name}`, {
      has_photo: !!heroPhotoUrl,
      photo_ref: photoReference
    });
    
    const { error } = await supabase
      .from('cafes')
      .upsert(cafeData, { onConflict: 'place_id' });
    
    if (error) {
      console.error('Error saving cafe:', error);
    } else {
      console.log(`Successfully saved: ${cafeData.name}`);
    }
  } catch (error) {
    console.error('Error processing cafe data:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = req.headers["x-admin-key"];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Database configuration missing" });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return res.status(500).json({ 
      error: "Google Places API key not found",
      note: "Add GOOGLE_PLACES_API_KEY to your .env.local file"
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('Starting Google Places sync...');
    
    const queries = [
      'coffee shop houston',
      'cafe houston', 
      'espresso bar houston',
      'coffee house houston'
    ];
    
    let totalSynced = 0;
    
    for (const query of queries) {
      console.log(`Searching for: ${query}`);
      
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=29.7604,-95.3698&radius=50000&key=${GOOGLE_PLACES_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`Google API response status:`, response.status);
      console.log(`Results found:`, data.results?.length || 0);
      
      if (data.error_message) {
        console.error('Google API Error:', data.error_message);
        continue;
      }
      
      if (data.results) {
        for (const place of data.results) {
          if (isWithinHoustonMetro(place.geometry.location.lat, place.geometry.location.lng)) {
            console.log(`Processing cafe: ${place.name}`);
            await saveCafeToDatabase(place, supabase);
            totalSynced++;
          }
        }
      }
      
      // Rate limiting - wait between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Sync completed. Total cafes synced: ${totalSynced}`);
    
    return res.status(200).json({ 
      success: true, 
      result: { totalSynced }
    });
  } catch (err) {
    console.error("Error seeding cafes:", err);
    return res.status(500).json({ 
      success: false, 
      error: err instanceof Error ? err.message : String(err) 
    });
  }
}
