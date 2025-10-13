import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { OptimizedCafeService } from '@/services/optimizedCafeService';
import { SearchFilters } from '@/services/types';

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface UseOptimizedCafesOptions {
  filters: SearchFilters;
  userLocation?: UserLocation | null;
  enabled?: boolean;
}

/**
 * Hook for single page cafe loading with React Query caching
 */
export function useOptimizedCafes({ 
  filters, 
  userLocation, 
  enabled = true 
}: UseOptimizedCafesOptions) {
  return useQuery({
    queryKey: ['cafes', 'single', filters, userLocation],
    queryFn: async () => {
      const result = await OptimizedCafeService.fetchCafes({
        ...filters,
        userLocation: userLocation || undefined
      }, 0);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch cafes');
      }
      
      return result.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for infinite scroll cafe loading with React Query
 */
export function useInfiniteCafes({ 
  filters, 
  userLocation, 
  enabled = true 
}: UseOptimizedCafesOptions) {
  return useInfiniteQuery({
    queryKey: ['cafes', 'infinite', filters, userLocation],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const result = await OptimizedCafeService.fetchCafes({
          ...filters,
          userLocation: userLocation || undefined
        }, pageParam);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch cafes');
        }
        
        return result.data;
      } catch (error) {
        console.error('OptimizedCafeService failed, falling back to basic loading:', error);
        
        // Fallback to simple loading if optimized service fails
        const { fetchCafes } = await import('@/services/cafeService');
        const fallbackResult = await fetchCafes();
        
        if (!fallbackResult.success) {
          throw new Error(fallbackResult.error || 'Failed to fetch cafes');
        }
        
        // Transform to expected format
        return {
          cafes: fallbackResult.data.slice(pageParam * 50, (pageParam + 1) * 50),
          hasMore: fallbackResult.data.length > (pageParam + 1) * 50,
          total: fallbackResult.data.length,
          currentPage: pageParam
        };
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      // Return next page number if there are more results
      return lastPage.hasMore ? allPages.length : undefined;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // Reduced retries since we have fallback
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Keep previous data while fetching new page
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for nearby cafes based on location
 */
export function useNearbyCafes(
  userLocation: UserLocation | null,
  radiusMiles: number = 10,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['cafes', 'nearby', userLocation, radiusMiles],
    queryFn: async () => {
      if (!userLocation) throw new Error('User location required');
      
      const result = await OptimizedCafeService.fetchCafes({
        distance: radiusMiles,
        userLocation
      }, 0);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch nearby cafes');
      }
      
      return result.data;
    },
    enabled: enabled && !!userLocation,
    staleTime: 2 * 60 * 1000, // 2 minutes (location-based data changes more frequently)
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1, // Don't retry too much for location-based queries
  });
}

/**
 * Hook for popular cafes (no filters)
 */
export function usePopularCafes(enabled: boolean = true) {
  return useQuery({
    queryKey: ['cafes', 'popular'],
    queryFn: async () => {
      const result = await OptimizedCafeService.fetchCafes({}, 0);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch popular cafes');
      }
      
      return result.data;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes (popular cafes change less frequently)
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 3,
  });
}

/**
 * Hook for cafe search with debouncing
 */
export function useCafeSearch(
  searchQuery: string,
  userLocation: UserLocation | null,
  debounceMs: number = 300
) {
  return useQuery({
    queryKey: ['cafes', 'search', searchQuery, userLocation],
    queryFn: async () => {
      const result = await OptimizedCafeService.fetchCafes({
        query: searchQuery,
        userLocation: userLocation || undefined
      }, 0);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to search cafes');
      }
      
      return result.data;
    },
    enabled: searchQuery.length >= 2, // Only search with 2+ characters
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

/**
 * Utility hook to prefetch popular cafes
 */
export function usePrefetchPopularCafes() {
  const queryClient = useQueryClient();
  
  return useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['cafes', 'popular'],
      queryFn: async () => {
        const result = await OptimizedCafeService.fetchCafes({}, 0);
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch popular cafes');
        }
        return result.data;
      },
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);
}
