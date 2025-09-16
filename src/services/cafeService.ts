import { 
  Cafe, 
  GooglePlacesResult, 
  SearchFilters, 
  ApiResponse, 
  HOUSTON_BOUNDS 
} from './types';
import { calculateDistance, isWithinHoustonMetro, detectNeighborhood } from './utils';

// NOTE: Insert your Google Places API key here when ready to go live
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'INSERT_YOUR_GOOGLE_PLACES_API_KEY_HERE';

/**
 * Fetch cafes from database with optional filters
 * Once Supabase is connected, this will query the database
 */
export async function fetchCafes(filters: SearchFilters = {}): Promise<ApiResponse<Cafe[]>> {
  try {
    // TODO: Replace with Supabase query when connected
    // const { data, error } = await supabase
    //   .from('cafes')
    //   .select('*')
    //   .eq('isActive', true);
    
    // For now, return mock data that matches Houston cafes
    const mockCafes: Cafe[] = [
      {
        id: "1",
        placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
        name: "Blacksmith Coffee",
        address: "1018 Westheimer Rd, Houston, TX 77006",
        neighborhood: "Montrose",
        latitude: 29.7421,
        longitude: -95.3914,
        rating: 4.8,
        googleRating: 4.6,
        priceLevel: 2,
        phoneNumber: "(713) 999-2811",
        website: "https://blacksmithhouston.com",
        openingHours: ["Monday: 6:00 AM – 9:00 PM", "Tuesday: 6:00 AM – 9:00 PM"],
        photos: ["/placeholder.svg"],
        tags: ["latte-art", "cozy-vibes", "laptop-friendly"],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        updatedAt: new Date().toISOString(),
        isActive: true
      },
      {
        id: "2",
        placeId: "ChIJd8BlQ2u5EmsRxjaOBJUaYmQ",
        name: "Greenway Coffee",
        address: "2240 Richmond Ave, Houston, TX 77098",
        neighborhood: "Heights", 
        latitude: 29.7755,
        longitude: -95.4089,
        rating: 4.6,
        googleRating: 4.4,
        priceLevel: 2,
        phoneNumber: "(713) 942-7444",
        photos: ["/placeholder.svg"],
        tags: ["third-wave", "cold-brew", "rooftop"],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
        updatedAt: new Date().toISOString(),
        isActive: true
      },
      {
        id: "3",
        placeId: "ChIJKa7wl2u2EmsRQypMbycKUJo",
        name: "Hugo's Coffee",
        address: "1600 Westheimer Rd, Houston, TX 77006",
        neighborhood: "Downtown",
        latitude: 29.7460,
        longitude: -95.3892,
        rating: 4.4,
        googleRating: 4.2,
        priceLevel: 2,
        phoneNumber: "(713) 524-7744",
        photos: ["/placeholder.svg"],
        tags: ["pastries", "instagram-worthy", "busy"],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
        updatedAt: new Date().toISOString(),
        isActive: true
      }
    ];
    
    // Apply filters
    let filteredCafes = mockCafes;
    
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filteredCafes = filteredCafes.filter(cafe => 
        cafe.name.toLowerCase().includes(query) ||
        cafe.neighborhood.toLowerCase().includes(query) ||
        cafe.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    if (filters.neighborhoods && filters.neighborhoods.length > 0) {
      filteredCafes = filteredCafes.filter(cafe =>
        filters.neighborhoods!.includes(cafe.neighborhood)
      );
    }
    
    if (filters.tags && filters.tags.length > 0) {
      filteredCafes = filteredCafes.filter(cafe =>
        cafe.tags.some(tag => filters.tags!.includes(tag))
      );
    }
    
    if (filters.rating) {
      filteredCafes = filteredCafes.filter(cafe =>
        (cafe.rating || 0) >= filters.rating!
      );
    }
    
    return {
      data: filteredCafes,
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
    // TODO: Replace with Supabase query when connected
    // const { data, error } = await supabase
    //   .from('cafes')
    //   .select('*')
    //   .eq('placeId', placeId)
    //   .single();
    
    const { data: cafes } = await fetchCafes();
    const cafe = cafes.find(c => c.placeId === placeId || c.id === placeId);
    
    return {
      data: cafe || null,
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
 * Sync Houston cafes from Google Places API
 * This function should be called when API key is first added and monthly thereafter
 */
export async function syncGooglePlacesCafes(): Promise<ApiResponse<number>> {
  if (GOOGLE_PLACES_API_KEY === 'INSERT_YOUR_GOOGLE_PLACES_API_KEY_HERE') {
    return {
      data: 0,
      success: false,
      error: 'Google Places API key not configured. Please add your API key to environment variables.'
    };
  }
  
  try {
    const queries = [
      'coffee shop houston',
      'cafe houston', 
      'espresso bar houston',
      'coffee house houston'
    ];
    
    let totalSynced = 0;
    
    for (const query of queries) {
      // TODO: Implement Google Places Text Search API call
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=29.7604,-95.3698&radius=50000&key=${GOOGLE_PLACES_API_KEY}`;
      
      console.log(`Syncing cafes for query: ${query}`);
      console.log(`API URL: ${url}`);
      
      // TODO: Uncomment when ready to use Google Places API
      // const response = await fetch(url);
      // const data = await response.json();
      
      // if (data.results) {
      //   for (const place of data.results) {
      //     if (isWithinHoustonMetro(place.geometry.location.lat, place.geometry.location.lng)) {
      //       await saveCafeToDatabase(place);
      //       totalSynced++;
      //     }
      //   }
      // }
    }
    
    return {
      data: totalSynced,
      success: true
    };
  } catch (error) {
    return {
      data: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync cafes from Google Places'
    };
  }
}

/**
 * Save Google Places result to database
 * TODO: Implement when Supabase is connected
 */
async function saveCafeToDatabase(placeResult: GooglePlacesResult): Promise<void> {
  const cafe: Omit<Cafe, 'id'> = {
    placeId: placeResult.place_id,
    name: placeResult.name,
    address: placeResult.formatted_address,
    neighborhood: detectNeighborhood(
      placeResult.geometry.location.lat, 
      placeResult.geometry.location.lng
    ),
    latitude: placeResult.geometry.location.lat,
    longitude: placeResult.geometry.location.lng,
    googleRating: placeResult.rating,
    priceLevel: placeResult.price_level,
    phoneNumber: placeResult.formatted_phone_number,
    website: placeResult.website,
    openingHours: placeResult.opening_hours?.weekday_text,
    photos: placeResult.photos?.map(photo => 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
    ),
    tags: [], // Will be populated by user posts
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true
  };
  
  // TODO: Insert into Supabase
  // const { error } = await supabase
  //   .from('cafes')
  //   .upsert(cafe, { onConflict: 'placeId' });
  
  console.log('Would save cafe:', cafe.name);
}