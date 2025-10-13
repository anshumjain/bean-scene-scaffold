import { useState, useCallback, useEffect } from 'react';
import { OptimizedCafeService } from '@/services/optimizedCafeService';
import { SearchFilters } from '@/services/types';

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface UseInfiniteCafesOptions {
  filters: SearchFilters;
  userLocation?: UserLocation | null;
  initialPageSize?: number;
}

export function useInfiniteCafes({ 
  filters, 
  userLocation, 
  initialPageSize = 50 
}: UseInfiniteCafesOptions) {
  const [cafes, setCafes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Reset when filters or location change
  useEffect(() => {
    setCafes([]);
    setCurrentPage(0);
    setHasMore(true);
    setError(null);
    loadInitialCafes();
  }, [filters, userLocation]);

  const loadInitialCafes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await OptimizedCafeService.fetchCafes({
        ...filters,
        userLocation: userLocation || undefined
      }, 0);

      if (result.success) {
        setCafes(result.data.cafes);
        setHasMore(result.data.hasMore);
        setCurrentPage(0);
      } else {
        setError(result.error || 'Failed to load cafes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters, userLocation]);

  const loadMoreCafes = useCallback(async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    setError(null);

    try {
      const nextPage = currentPage + 1;
      const result = await OptimizedCafeService.fetchCafes({
        ...filters,
        userLocation: userLocation || undefined
      }, nextPage);

      if (result.success) {
        setCafes(prev => [...prev, ...result.data.cafes]);
        setHasMore(result.data.hasMore);
        setCurrentPage(nextPage);
      } else {
        setError(result.error || 'Failed to load more cafes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, currentPage, filters, userLocation]);

  return {
    cafes,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore: loadMoreCafes,
    refetch: loadInitialCafes
  };
}
