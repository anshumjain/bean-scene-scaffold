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

// Note: Google Places API calls should only be made server-side
// Client-side code should call API routes instead of directly accessing Google Places API

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
    heroPhotoUrl: cafe.hero_photo_url,
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

// Note: saveCafeToDatabase function moved to server-side API routes
// Client-side code should not directly save to database with Google Places data

/**
 * Sync Houston cafes from Google Places API - Server-side only
 * This function calls the server-side API route instead of making direct Google Places calls
 */
export async function syncGooglePlacesCafes(): Promise<ApiResponse<number>> {
  try {
    console.log('Starting Google Places sync via server API...');
    
    // Call the server-side API route
    const response = await fetch('/api/seed-cafes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'admin-key-placeholder' // This should be set by the admin
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to sync cafes');
    }
    
    console.log(`Sync completed via server API. Result:`, result);
    
    return {
      data: result.result?.totalSynced || 0,
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
/**
 * Migration function to fix existing cafes with broken photo URLs
 * This function calls the server-side API route instead of making direct database calls
 */
export async function fixExistingCafePhotos(): Promise<ApiResponse<number>> {
  try {
    console.log('🔍 Starting photo migration via server API...');
    
    // Call the server-side API route
    const response = await fetch('/api/fix-cafe-photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'admin-key-placeholder' // This should be set by the admin
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to fix cafe photos');
    }
    
    console.log(`🎉 Photo migration completed via server API. Result:`, result);
    
    return {
      data: result.fixedCount || 0,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Error fixing cafe photos:', error);
    return {
      data: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fix cafe photos'
    };
  }
}
