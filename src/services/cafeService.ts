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

// Environment variables with graceful fallbacks
const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

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
    const cafes: Cafe[] = (data || []).map(cafe => ({
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
      photos: cafe.photos || [],
      tags: cafe.tags || [],
      createdAt: cafe.created_at,
      updatedAt: cafe.updated_at,
      isActive: cafe.is_active
    }));

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
      .or(`place_id.eq.${placeId},id.eq.${placeId}`)
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
    const cafe: Cafe = {
      id: data.id,
      placeId: data.place_id,
      name: data.name,
      address: data.address,
      neighborhood: data.neighborhood,
      latitude: typeof data.latitude === 'number' ? data.latitude : parseFloat(data.latitude),
      longitude: typeof data.longitude === 'number' ? data.longitude : parseFloat(data.longitude),
      rating: data.rating ? (typeof data.rating === 'number' ? data.rating : parseFloat(data.rating)) : undefined,
      googleRating: data.google_rating ? (typeof data.google_rating === 'number' ? data.google_rating : parseFloat(data.google_rating)) : undefined,
      priceLevel: data.price_level,
      phoneNumber: data.phone_number,
      website: data.website,
      openingHours: data.opening_hours,
      photos: data.photos || [],
      tags: data.tags || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isActive: data.is_active
    };
    
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
 * Sync Houston cafes from Google Places API - Optimized for single photos
 * This function should be called when API key is first added and monthly thereafter
 */
export async function syncGooglePlacesCafes(): Promise<ApiResponse<number>> {
  if (!hasGooglePlacesKey) {
    return apiErrorResponse(0);
  }
  
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
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=29.7604,-95.3698&radius=50000&key=${GOOGLE_PLACES_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results) {
        for (const place of data.results) {
          if (isWithinHoustonMetro(place.geometry.location.lat, place.geometry.location.lng)) {
            await saveCafeToDatabase(place);
            totalSynced++;
          }
        }
      }
    }
    
    return {
      data: totalSynced,
      success: true
    };
  } catch (error) {
    return apiErrorResponse(0);
  }
}

/**
 * Save Google Places result to database - OPTIMIZED FOR SINGLE PHOTO
 */
async function saveCafeToDatabase(placeResult: GooglePlacesResult): Promise<void> {
  try {
    // Get only the first (hero) photo if available
    let heroPhotoUrl: string | null = null;
    if (placeResult.photos && placeResult.photos.length > 0 && hasGooglePlacesKey) {
      const photoRef = placeResult.photos[0].photo_reference;
      heroPhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=600&photoreference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;
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
      hero_photo_url: heroPhotoUrl, // Store single optimized photo
      google_photo_reference: placeResult.photos?.[0]?.photo_reference,
      photos: [], // Keep empty for user-uploaded photos only
      tags: [], // Will be populated by user posts
      is_active: true
    };
    
    const { error } = await supabase
      .from('cafes')
      .upsert(cafeData, { onConflict: 'place_id' });
    
    if (error) {
      console.error('Error saving cafe:', error);
    }
  } catch (error) {
    console.error('Error processing cafe data:', error);
  }
}