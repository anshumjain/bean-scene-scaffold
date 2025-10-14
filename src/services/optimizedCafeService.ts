import { supabase } from "@/integrations/supabase/client";
import { Cafe, SearchFilters, ApiResponse } from "@/services/types";
import { getCafeTagsWithCounts } from "@/services/tagService";

interface PaginatedCafeResponse {
  cafes: Cafe[];
  hasMore: boolean;
  total: number;
  currentPage: number;
}

interface LocationBasedFilters extends SearchFilters {
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  activeTagFilter?: string; // For sorting by specific tag count
}

/**
 * Smart cafe loading with multiple fallback strategies
 */
export class OptimizedCafeService {
  private static readonly DEFAULT_PAGE_SIZE = 50;
  private static readonly MAX_FALLBACK_DISTANCE = 25; // miles

  /**
   * Main entry point - tries multiple strategies to get cafes
   */
  static async fetchCafes(
    filters: LocationBasedFilters = {},
    page: number = 0
  ): Promise<ApiResponse<PaginatedCafeResponse>> {
    try {
      // Strategy 0: If user is searching by name, prioritize search results over distance filters
      if (filters.query && filters.query.trim()) {
        console.log('Search query detected, prioritizing search results over distance filters:', filters.query);
        return await this.fetchSearchResults(filters, page);
      }

      // Strategy 1: If location available, use location-based loading (even without distance filter)
      if (filters.userLocation) {
        console.log('Using location-based loading for userLocation:', filters.userLocation);
        return await this.fetchNearbyCafes(filters, page);
      } else {
        console.log('NOT using location-based loading - no user location available');
      }

      // Strategy 2: If filters applied, try exact match
      if (this.hasActiveFilters(filters)) {
        const result = await this.fetchWithFilters(filters, page);
        if (result.data.cafes.length >= 10 || page > 0) {
          return result;
        }
        
        // Fallback: relax filters if not enough results
        return await this.fetchWithFallback(filters, page);
      }

      // Strategy 3: No filters - load popular cafes
      return await this.fetchPopularCafes(page);
    } catch (error) {
      console.error('Error fetching cafes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cafes',
        data: { cafes: [], hasMore: false, total: 0, currentPage: page }
      };
    }
  }

  /**
   * Load cafes based on search query - prioritizes search intent over distance filters
   */
  private static async fetchSearchResults(
    filters: LocationBasedFilters,
    page: number
  ): Promise<ApiResponse<PaginatedCafeResponse>> {
    const offset = page * this.DEFAULT_PAGE_SIZE;

    // For search queries, we fetch more results and then sort by relevance + distance
    const searchPageSize = this.DEFAULT_PAGE_SIZE * 2; // Get more results for better sorting

    let query = supabase
      .from('cafes')
      .select('*, hero_photo_url')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + searchPageSize - 1);

    // Apply search query (this is the key filter)
    if (filters.query) {
      query = query.or(`name.ilike.%${filters.query}%,address.ilike.%${filters.query}%,neighborhood.ilike.%${filters.query}%`);
    }

    // Apply other filters but NOT distance filter for search
    if (filters.selectedTags?.length > 0) {
      query = query.overlaps('tags', filters.selectedTags);
    }
    if (filters.neighborhoods?.length > 0) {
      query = query.in('neighborhood', filters.neighborhoods);
    }
    if (filters.rating > 0) {
      query = query.gte('google_rating', filters.rating);
    }
    if (filters.priceLevel?.length > 0) {
      query = query.in('price_level', filters.priceLevel);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    console.log(`Search results: Found ${data?.length || 0} cafes matching "${filters.query}"`);

    // Sort by relevance first, then by distance if location is available
    let sortedCafes = data || [];
    
    if (filters.userLocation) {
      // Add distance calculation and sort by relevance + distance
      const cafesWithDistance = sortedCafes.map(cafe => ({
        ...cafe,
        distance_miles: this.calculateDistance(
          filters.userLocation!.latitude,
          filters.userLocation!.longitude,
          cafe.latitude,
          cafe.longitude
        )
      }));

      // Sort by name relevance first, then by distance
      sortedCafes = cafesWithDistance.sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().includes(filters.query!.toLowerCase());
        const bNameMatch = b.name.toLowerCase().includes(filters.query!.toLowerCase());
        
        // Exact name matches first
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        // Then by distance
        return a.distance_miles - b.distance_miles;
      });

      console.log(`Search results sorted: First 5 cafes`, sortedCafes.slice(0, 5).map(cafe => ({
        name: cafe.name,
        distance: cafe.distance_miles?.toFixed(2),
        neighborhood: cafe.neighborhood
      })));
    }

    // Return only the requested page size
    const pageCafes = sortedCafes.slice(0, this.DEFAULT_PAGE_SIZE);
    const hasMore = sortedCafes.length > this.DEFAULT_PAGE_SIZE;

    return {
      success: true,
      data: {
        cafes: await this.transformCafeData(pageCafes),
        hasMore,
        total: sortedCafes.length,
        currentPage: page
      }
    };
  }

  /**
   * Find optimal radius to get 50 closest cafes
   */
  private static findOptimalRadius(userLocation: { latitude: number; longitude: number }, page: number): number {
    // For first page, start with 5 miles and progressively expand
    // For subsequent pages, use larger radius to ensure we have enough cafes
    if (page === 0) {
      return 5; // Start with 5 miles for first page
    } else if (page === 1) {
      return 10; // 10 miles for second page
    } else if (page === 2) {
      return 15; // 15 miles for third page
    } else if (page === 3) {
      return 20; // 20 miles for fourth page
    } else {
      return 30; // 30 miles for remaining pages to ensure we have enough cafes
    }
  }

  /**
   * Load cafes near user location with distance-based pagination
   */
  private static async fetchNearbyCafes(
    filters: LocationBasedFilters,
    page: number
  ): Promise<ApiResponse<PaginatedCafeResponse>> {
    const { userLocation, distance } = filters;
    if (!userLocation) throw new Error('User location required');
    
    // If no distance filter is set, progressively expand radius to find 50 closest cafes
    const targetDistance = distance || this.findOptimalRadius(userLocation, page);

    // Load more cafes initially to account for distance filtering and ensure we have enough for sorting
    const loadSize = Math.max(this.DEFAULT_PAGE_SIZE * 5, 250); // Load more initially for better sorting
    const offset = page * loadSize;

    // Use a tighter bounding box for better performance
    const latRange = (targetDistance / 69) * 1.5; // Slightly larger for safety
    const lngRange = (targetDistance / (69 * Math.cos(userLocation.latitude * Math.PI / 180))) * 1.5;

    console.log(`Location-based query bounds:`, {
      userLocation: `${userLocation.latitude}, ${userLocation.longitude}`,
      latRange,
      lngRange,
      bounds: {
        latMin: userLocation.latitude - latRange,
        latMax: userLocation.latitude + latRange,
        lngMin: userLocation.longitude - lngRange,
        lngMax: userLocation.longitude + lngRange
      }
    });

    let query = supabase
      .from('cafes')
      .select('*, hero_photo_url')
      .eq('is_active', true)
      // Use database-level location filtering with the location index
      .gte('latitude', userLocation.latitude - latRange)
      .lte('latitude', userLocation.latitude + latRange)
      .gte('longitude', userLocation.longitude - lngRange)
      .lte('longitude', userLocation.longitude + lngRange)
      // Order by location index for better performance
      .order('latitude', { ascending: true })
      .order('longitude', { ascending: true })
      .range(offset, offset + loadSize - 1);

    // Apply additional filters
    query = this.applyFilters(query, filters);

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    console.log(`Raw database results: ${data?.length || 0} cafes found in bounding box`);

    // Calculate distances client-side using correct column names
    const cafesWithDistance = data?.map(cafe => ({
      ...cafe,
      distance_miles: this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        cafe.latitude, // Use correct column name from database
        cafe.longitude
      )
    })) || [];

    // Filter by actual distance and sort by distance, then rating
    const cafesInRange = cafesWithDistance
      .filter(cafe => cafe.distance_miles <= targetDistance)
      .sort((a, b) => {
        // Primary sort: by distance
        const distanceDiff = a.distance_miles - b.distance_miles;
        if (Math.abs(distanceDiff) > 0.1) {
          return distanceDiff;
        }
        // Secondary sort: by rating for cafes at similar distances
        const aRating = a.google_rating || 0;
        const bRating = b.google_rating || 0;
        return bRating - aRating;
      });

    // Return only the requested page size with proper pagination
    const startIndex = page * this.DEFAULT_PAGE_SIZE;
    const endIndex = Math.min(startIndex + this.DEFAULT_PAGE_SIZE, cafesInRange.length);
    const pageCafes = cafesInRange.slice(startIndex, endIndex);

    const hasMore = cafesInRange.length > endIndex;

    console.log(`Location-based loading: Found ${cafesInRange.length} cafes within ${targetDistance} miles, returning ${pageCafes.length}`);
    console.log(`User location: ${userLocation.latitude}, ${userLocation.longitude}`);
    console.log(`Sample cafe distances:`, pageCafes.slice(0, 5).map(cafe => ({
      name: cafe.name,
      location: `${cafe.latitude}, ${cafe.longitude}`,
      distance: cafe.distance_miles?.toFixed(2),
      neighborhood: cafe.neighborhood
    })));

    return {
      success: true,
      data: {
        cafes: await this.transformCafeData(pageCafes),
        hasMore,
        total: cafesInRange.length,
        currentPage: page
      }
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Load cafes with exact filter matching
   */
  private static async fetchWithFilters(
    filters: SearchFilters,
    page: number
  ): Promise<ApiResponse<PaginatedCafeResponse>> {
    const offset = page * this.DEFAULT_PAGE_SIZE;

    let query = supabase
      .from('cafes')
      .select('*, hero_photo_url')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + this.DEFAULT_PAGE_SIZE - 1);

    query = this.applyFilters(query, filters);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const hasMore = data?.length === this.DEFAULT_PAGE_SIZE;

    return {
      success: true,
      data: {
        cafes: await this.transformCafeData(data || []),
        hasMore,
        total: data?.length || 0,
        currentPage: page
      }
    };
  }

  /**
   * Fallback loading when exact filters don't return enough results
   */
  private static async fetchWithFallback(
    filters: SearchFilters,
    page: number
  ): Promise<ApiResponse<PaginatedCafeResponse>> {
    // Fallback 1: Remove tag filters
    if (filters.selectedTags?.length > 0) {
      const relaxedFilters = { ...filters, selectedTags: [] };
      const result = await this.fetchWithFilters(relaxedFilters, 0);
      if (result.data.cafes.length >= 10) {
        return result;
      }
    }

    // Fallback 2: Remove rating filter
    if (filters.rating > 0) {
      const relaxedFilters = { ...filters, rating: 0 };
      const result = await this.fetchWithFilters(relaxedFilters, 0);
      if (result.data.cafes.length >= 10) {
        return result;
      }
    }

    // Fallback 3: Load popular cafes
    return await this.fetchPopularCafes(0);
  }

  /**
   * Load popular cafes when no specific filters
   */
  private static async fetchPopularCafes(page: number): Promise<ApiResponse<PaginatedCafeResponse>> {
    const offset = page * this.DEFAULT_PAGE_SIZE;

    // Load by neighborhood popularity + rating
    const neighborhoodOrder = [
      "Montrose", "Heights", "Downtown", "Midtown", "Rice Village",
      "West University", "River Oaks", "Memorial", "Galleria", "East End"
    ];

    const { data, error } = await supabase
      .from('cafes')
      .select('*, hero_photo_url')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + this.DEFAULT_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    // Sort by neighborhood priority client-side
    const sortedCafes = (data || []).sort((a, b) => {
      const aIndex = neighborhoodOrder.indexOf(a.neighborhood || '');
      const bIndex = neighborhoodOrder.indexOf(b.neighborhood || '');
      
      // Prioritize known neighborhoods
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      } else if (aIndex !== -1) {
        return -1;
      } else if (bIndex !== -1) {
        return 1;
      }
      
      // Then by rating
      const aRating = a.google_rating || 0;
      const bRating = b.google_rating || 0;
      return bRating - aRating;
    });

    const hasMore = sortedCafes.length === this.DEFAULT_PAGE_SIZE;

    return {
      success: true,
      data: {
        cafes: await this.transformCafeData(sortedCafes),
        hasMore,
        total: sortedCafes.length,
        currentPage: page
      }
    };
  }

  /**
   * Apply filters to Supabase query
   */
  private static applyFilters(query: any, filters: SearchFilters) {
    if (filters.selectedTags?.length > 0) {
      query = query.overlaps('tags', filters.selectedTags);
    }

    if (filters.neighborhoods?.length > 0) {
      query = query.in('neighborhood', filters.neighborhoods);
    }

    if (filters.rating > 0) {
      query = query.gte('google_rating', filters.rating);
    }

    if (filters.priceLevel?.length > 0) {
      query = query.in('price_level', filters.priceLevel);
    }

    if (filters.query) {
      query = query.or(`name.ilike.%${filters.query}%,address.ilike.%${filters.query}%,neighborhood.ilike.%${filters.query}%`);
    }

    // Note: Open now filter is handled client-side after fetching data
    // because we need to parse opening hours and check current time

    return query;
  }

  /**
   * Check if any filters are active
   */
  private static hasActiveFilters(filters: SearchFilters): boolean {
    return !!(
      filters.selectedTags?.length ||
      filters.neighborhoods?.length ||
      filters.rating > 0 ||
      filters.priceLevel?.length ||
      filters.query
    );
  }

  /**
   * Sort cafes by tag count when a tag filter is active
   */
  private static sortCafesByTagCount(cafes: Cafe[], activeTagFilter?: string): Cafe[] {
    if (!activeTagFilter) {
      return cafes;
    }

    return cafes.sort((a, b) => {
      const aTagCount = a.tagCounts?.[activeTagFilter] || 0;
      const bTagCount = b.tagCounts?.[activeTagFilter] || 0;
      
      // Sort by tag count (descending), then by existing sort criteria
      if (aTagCount !== bTagCount) {
        return bTagCount - aTagCount;
      }
      
      // If tag counts are equal, maintain existing sort order (distance/rating)
      return 0;
    });
  }

  /**
   * Transform database data to app format
   */
  private static async transformCafeData(data: any[], filters?: LocationBasedFilters): Promise<Cafe[]> {
    // Transform basic cafe data first
    const basicCafes = data.map(cafe => ({
      id: cafe.id,
      placeId: cafe.place_id,
      name: cafe.name,
      address: cafe.address,
      neighborhood: cafe.neighborhood,
      latitude: cafe.latitude, // Use correct column name from database
      longitude: cafe.longitude,
      rating: cafe.rating,
      googleRating: cafe.google_rating,
      priceLevel: cafe.price_level,
      phoneNumber: cafe.phone_number,
      website: cafe.website,
      openingHours: cafe.opening_hours,
      parkingInfo: cafe.parking_info,
      photos: cafe.hero_photo_url ? [cafe.hero_photo_url, ...(cafe.photos || [])] : (cafe.photos || []),
      heroPhotoUrl: cafe.hero_photo_url,
      photoSource: cafe.photo_source,
      googlePhotoReference: cafe.google_photo_reference,
      tags: cafe.tags || [],
      createdAt: cafe.created_at,
      updatedAt: cafe.updated_at,
      isActive: cafe.is_active,
      // Add distance if calculated
      ...(typeof cafe.distance_miles === 'number' && { distance: cafe.distance_miles })
    }));

    // Enrich with tag counts (do this in parallel for better performance)
    const cafesWithTagCounts = await Promise.all(
      basicCafes.map(async (cafe) => {
        try {
          const tagCounts = await getCafeTagsWithCounts(cafe.id, cafe.placeId);
          return {
            ...cafe,
            tagCounts
          };
        } catch (error) {
          console.error(`Error getting tag counts for cafe ${cafe.name}:`, error);
          return cafe; // Return cafe without tag counts if there's an error
        }
      })
    );

    // Apply tag-based sorting if activeTagFilter is specified
    return this.sortCafesByTagCount(cafesWithTagCounts, filters?.activeTagFilter);
  }
}

/**
 * Hook for using optimized cafe loading
 */
export function useOptimizedCafes(filters: LocationBasedFilters, page: number = 0) {
  const [data, setData] = useState<PaginatedCafeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCafes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await OptimizedCafeService.fetchCafes(filters, page);
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load cafes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadCafes();
  }, [loadCafes]);

  return { data, loading, error, refetch: loadCafes };
}
