import { supabase } from '@/lib/supabase';
import { 
  Cafe, 
  GooglePlacesResult, 
  SearchFilters, 
  ApiResponse 
} from './types';
import { calculateDistance, isWithinHoustonMetro, detectNeighborhood } from './utils';

// ✅ Use Vite env variables
const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

/**
 * Fetch cafes from Supabase with optional filters
 */
export async function fetchCafes(filters: SearchFilters = {}): Promise<ApiResponse<Cafe[]>> {
  try {
    const { data, error } = await supabase
      .from('cafes')
      .select('id, placeid, name, address, neighborhood, latitude, longitude, rating, google_rating, price_level, phone_number, website, opening_hours, photos, hero_photo_url, google_photo_reference, tags, is_active, created_at, updated_at')
      .eq('is_active', true);

    if (error) {
      console.error("Error fetching cafes:", error.message);
      return { data: [], success: false, error: error.message };
    }

    let filteredCafes = data || [];

    if (filters.query) {
      const query = filters.query.toLowerCase();
      filteredCafes = filteredCafes.filter(cafe =>
        cafe.name.toLowerCase().includes(query) ||
        cafe.neighborhood.toLowerCase().includes(query) ||
        cafe.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (filters.neighborhoods?.length) {
      filteredCafes = filteredCafes.filter(cafe =>
        filters.neighborhoods!.includes(cafe.neighborhood)
      );
    }

    if (filters.tags?.length) {
      filteredCafes = filteredCafes.filter(cafe =>
        cafe.tags.some(tag => filters.tags!.includes(tag))
      );
    }

    if (filters.rating) {
      filteredCafes = filteredCafes.filter(cafe =>
        (cafe.rating || 0) >= filters.rating!
      );
    }

    return { data: filteredCafes, success: true };
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
      .select('id, placeid, name, address, neighborhood, latitude, longitude, rating, google_rating, price_level, phone_number, website, opening_hours, photos, hero_photo_url, google_photo_reference, tags, is_active, created_at, updated_at')
      .eq('placeid', placeId)
      .single();

    if (error) {
      console.error("Error fetching cafe details:", error.message);
      return { data: null, success: false, error: error.message };
    }

    return { data, success: true };
  } catch (err) {
    return {
      data: null,
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch cafe details'
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
    const { data: allCafes, error } = await fetchCafes();
    if (error) throw new Error(error);

    const nearbyCafes = (allCafes || [])
      .map(cafe => ({
        ...cafe,
        distance: calculateDistance(latitude, longitude, cafe.latitude, cafe.longitude)
      }))
      .filter(cafe => cafe.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance);

    return { data: nearbyCafes, success: true };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch nearby cafes'
    };
  }
}

/**
 * Sync Houston cafes from Google Places API
 * Call this once at setup or monthly
 */
export async function syncGooglePlacesCafes(): Promise<ApiResponse<number>> {
  if (!GOOGLE_PLACES_API_KEY) {
    return { data: 0, success: false, error: 'Google Places API key not configured.' };
  }

  try {
    const houstonLat = 29.7604;
    const houstonLng = -95.3698;
    const radius = 10000; // 10 km

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${houstonLat},${houstonLng}&radius=${radius}&type=cafe&key=${GOOGLE_PLACES_API_KEY}`;

    console.log(`Syncing cafes from Google Places: ${url}`);

    const response = await fetch(url);
    const data = await response.json();

    let totalSynced = 0;
    if (data.results) {
      for (const place of data.results) {
        if (isWithinHoustonMetro(place.geometry.location.lat, place.geometry.location.lng)) {
          await saveCafeToDatabase(place);
          totalSynced++;
        }
      }
    }

    return { data: totalSynced, success: true };
  } catch (error) {
    return {
      data: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync cafes'
    };
  }
}

/**
 * Save Google Places result to Supabase
 */
async function saveCafeToDatabase(placeResult: GooglePlacesResult): Promise<void> {
  const cafe = {
    placeid: placeResult.place_id,
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
    hero_photo_url: placeResult.photos?.[0]
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${placeResult.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
      : null,
    google_photo_reference: placeResult.photos?.[0]?.photo_reference || null,
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true
  };

  const { error } = await supabase
    .from('cafes')
    .upsert(cafe, { onConflict: ['placeid'] });

  if (error) {
    console.error('Supabase error inserting cafe:', error.message);
  } else {
    console.log(`Saved cafe: ${cafe.name}`);
  }
}
