import { 
  Cafe, 
  GooglePlacesResult, 
  SearchFilters, 
  ApiResponse, 
  HOUSTON_BOUNDS 
} from './types';
import { calculateDistance, isWithinHoustonMetro, detectNeighborhood } from './utils';
import { GooglePlacesService } from './googlePlacesService';
import { ImageOptimizationService } from './imageOptimizationService';
import { MonitoringService } from './monitoringService';
import { supabase } from '@/integrations/supabase/client';

// Environment variables with graceful fallbacks for both Node.js and browser environments
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || import.meta.env?.VITE_GOOGLE_PLACES_API_KEY;

// Check if environment variables are available
const hasGooglePlacesKey = GOOGLE_PLACES_API_KEY && GOOGLE_PLACES_API_KEY !== 'undefined';

function apiErrorResponse<T>(defaultValue: T): ApiResponse<T> {
  return {
    data: defaultValue,
    success: false,
    error: 'Failed to call API'
  };
}

/**
 * Transform database format to app format
 */
function transformCafeData(cafe: any): Cafe {
  return {
    id: cafe.id,
    placeId: cafe.place_id,
    name: cafe.name,
    address: cafe.address,
    neighborhood: cafe.neighborhood,
    latitude: typeof cafe.latitude === 'number' ? cafe.latitude : parseFloat(cafe.latitude),
    longitude: typeof cafe.longitude === 'number' ? cafe.longitude : parseFloat(cafe.longitude),
    rating: cafe.rating ? (typeof cafe.rating === 'number' ? cafe.rating : parseFloat(cafe.rating)) : undefined,
    googleRating: cafe.google_rating ? (typeof cafe.google_rating === 'number' ? cafe.google_rating : parseFloat(cafe.google_rating)) : undefined,
    priceLevel: cafe.price_level,
    phoneNumber: cafe.phone_number,
    website: cafe.website,
    openingHours: cafe.opening_hours,
    // Use hero_photo_url as the primary photo, fallback to photos array
    photos: cafe.hero_photo_url ? [cafe.hero_photo_url, ...(cafe.photos || [])] : (cafe.photos || []),
    tags: cafe.tags || [],
    createdAt: cafe.created_at,
    updatedAt: cafe.updated_at,
    isActive: cafe.is_active
  };
}

/**
 * Fetch cafes from database with optional filters
 */
export async function fetchCafes(filters: SearchFilters = {}): Promise<ApiResponse<Cafe[]>> {
  try {
    let query = supabase
      .from('cafes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.query) {
      query = query.or(`name.ilike.%${filters.query}%,neighborhood.ilike.%${filters.query}%,tags.cs.{${filters.query}}`);
    }
    
    if (filters.neighborhoods && filters.neighborhoods.length > 0) {
      query = query.in('neighborhood', filters.neighborhoods);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }
    
    if (filters.rating) {
      query = query.gte('rating', filters.rating);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Transform database format to app format
    const cafes: Cafe[] = (data || []).map(transformCafeData);

    return {
      data: cafes,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cafes'
    };
  }
}

/**
 * Fetch specific cafe details by place ID
 */
export async function fetchCafeDetails(placeId: string): Promise<ApiResponse<Cafe | null>> {
  try {
    const { data, error } = await supabase
      .from('cafes')
      .select('*')
      .eq('place_id', placeId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return { data: null, success: true };
      }
      throw new Error(error.message);
    }

    // Transform database format to app format
    const cafe: Cafe = transformCafeData(data);
    
    return {
      data: cafe,
      success: true
    };
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cafe details'
    };
  }
}

/**
 * Search cafes with advanced filtering
 */
export async function searchCafes(query: string, filters: SearchFilters = {}): Promise<ApiResponse<Cafe[]>> {
  return await fetchCafes({ ...filters, query });
}

/**
 * Get nearby cafes based on user location
 */
export async function fetchNearbyCafes(
  latitude: number, 
  longitude: number, 
  radiusMiles: number = 10
): Promise<ApiResponse<Cafe[]>> {
  try {
    const { data: allCafes } = await fetchCafes();
    
    const nearbyCafes = allCafes
      .map(cafe => ({
        ...cafe,
        distance: calculateDistance(latitude, longitude, cafe.latitude, cafe.longitude)
      }))
      .filter(cafe => cafe.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance);
    
    return {
      data: nearbyCafes,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch nearby cafes'
    };
  }
}

/**
 * Save Google Places result to database - OPTIMIZED FOR SINGLE PHOTO
 */
async function saveCafeToDatabase(placeResult: GooglePlacesResult): Promise<void> {
  try {
    // Get only the first (hero) photo if available
    let heroPhotoUrl: string | null = null;
    let photoReference: string | null = null;
    
    if (placeResult.photos && placeResult.photos.length > 0 && hasGooglePlacesKey) {
      // Extract the actual photo reference from the places API result
      const photoRef = placeResult.photos[0].photo_reference;
      photoReference = photoRef;
      
      // Generate the proper Google Photos API URL
      heroPhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=600&photoreference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;
      
      console.log(`Generated photo URL for ${placeResult.name}:`, heroPhotoUrl);
    }

    const cafeData = {
      place_id: placeResult.place_id,
      name: placeResult.name,
      address: placeResult.formatted_address,
      neighborhood: detectNeighborhood(
        placeResult.geometry.location.lat, 
        placeResult.geometry.location.lng
      ),
      latitude: placeResult.geometry.location.lat,
      longitude: placeResult.geometry.location.lng,
      google_rating: placeResult.rating,
      price_level: placeResult.price_level,
      phone_number: placeResult.formatted_phone_number,
      website: placeResult.website,
      opening_hours: placeResult.opening_hours?.weekday_text,
      hero_photo_url: heroPhotoUrl, // Now properly generated
      google_photo_reference: photoReference, // Store clean reference
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

/**
 * Sync Houston cafes from Google Places API - Optimized for single photos
 * This function should be called when API key is first added and monthly thereafter
 */
export async function syncGooglePlacesCafes(): Promise<ApiResponse<number>> {
  if (!hasGooglePlacesKey) {
    console.error('Google Places API key not found');
    return apiErrorResponse(0);
  }
  
  console.log('Starting Google Places sync with API key:', GOOGLE_PLACES_API_KEY ? 'Found' : 'Missing');
  
  try {
    await MonitoringService.logApiUsage('google_places', 'sync_cafes');
    
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
            await saveCafeToDatabase(place);
            totalSynced++;
          }
        }
      }
      
      // Rate limiting - wait between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Sync completed. Total cafes synced: ${totalSynced}`);
    
    return {
      data: totalSynced,
      success: true
    };
  } catch (error) {
    console.error('Sync error:', error);
    return {
      data: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed'
    };
  }
}

/**
 * Migration function to fix existing cafes with broken photo URLs
 * Run this once to fix your existing 165 cafes
 */
export async function fixExistingCafePhotos(): Promise<ApiResponse<number>> {
  if (!hasGooglePlacesKey) {
    console.error('Google Places API key not found');
    return apiErrorResponse(0);
  }

  try {
    // Get all cafes that have google_photo_reference but no hero_photo_url
    const { data: cafesNeedingFix, error } = await supabase
      .from('cafes')
      .select('id, name, google_photo_reference')
      .not('google_photo_reference', 'is', null)
      .is('hero_photo_url', null);

    if (error) {
      throw new Error(error.message);
    }

    console.log(`Found ${cafesNeedingFix?.length || 0} cafes needing photo fixes`);
    let fixedCount = 0;

    for (const cafe of cafesNeedingFix || []) {
      if (cafe.google_photo_reference) {
        // Extract photo reference from the Places API path format
        // Format: "places/ChIJpYkGUYS_QIYRTCRbrtFuf8/photos/AciIO2dmewa21DG_vQrNMGziA"
        let photoRef = cafe.google_photo_reference;
        
        if (photoRef.includes('/photos/')) {
          // Extract just the photo reference ID after '/photos/'
          photoRef = photoRef.split('/photos/')[1];
          // Remove any query parameters if present
          if (photoRef.includes('?')) {
            photoRef = photoRef.split('?')[0];
          }
        }

        // Generate proper Google Photos API URL
        const heroPhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=600&photoreference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;

        // Update the cafe record
        const { error: updateError } = await supabase
          .from('cafes')
          .update({ 
            hero_photo_url: heroPhotoUrl,
            google_photo_reference: photoRef // Store clean reference for future use
          })
          .eq('id', cafe.id);

        if (updateError) {
          console.error(`Error updating cafe ${cafe.name}:`, updateError);
        } else {
          console.log(`Fixed photo for: ${cafe.name}`);
          fixedCount++;
        }

        // Rate limiting - small delay between updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Successfully fixed photos for ${fixedCount} cafes`);
    
    return {
      data: fixedCount,
      success: true
    };
    
  } catch (error) {
    console.error('Error fixing cafe photos:', error);
    return {
      data: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fix cafe photos'
    };
  }
}
