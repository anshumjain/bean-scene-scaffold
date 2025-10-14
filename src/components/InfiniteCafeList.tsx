import { useEffect, useRef, useCallback } from 'react';
import { Cafe } from '@/services/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCafeEmoji } from '@/utils/emojiPlaceholders';
import { formatTagCount } from '@/services/tagService';

interface InfiniteCafeListProps {
  cafes: Cafe[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  error?: string | null;
  onCafeClick: (cafe: Cafe) => void;
  activeTagFilter?: string; // For highlighting and prioritizing specific tag
}

export function InfiniteCafeList({
  cafes,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  error,
  onCafeClick,
  activeTagFilter
}: InfiniteCafeListProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Helper function to get top tags for display
  const getTopTagsForDisplay = (cafe: Cafe): Array<{ tag: string; count: number }> => {
    // If we have tag counts, use them
    if (cafe.tagCounts && Object.keys(cafe.tagCounts).length > 0) {
      // Convert tag counts to array and sort by count
      const tagEntries = Object.entries(cafe.tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      // If there's an active tag filter and it exists in this cafe, prioritize it
      if (activeTagFilter && cafe.tagCounts[activeTagFilter]) {
        const filteredTag = tagEntries.find(entry => entry.tag === activeTagFilter);
        const otherTags = tagEntries.filter(entry => entry.tag !== activeTagFilter);
        
        // Return filtered tag first, then next 2 most popular
        return [filteredTag!, ...otherTags].slice(0, 3);
      }

      // Otherwise, return top 3 most popular tags
      return tagEntries.slice(0, 3);
    }

    // Fallback: If no tag counts available, use basic cafe tags with count of 1
    if (cafe.tags && cafe.tags.length > 0) {
      return cafe.tags.slice(0, 3).map(tag => ({ tag, count: 1 }));
    }

    return [];
  };

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, onLoadMore]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={onLoadMore} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (cafes.length === 0) {
    return (
      <div className="text-center py-8">
        {activeTagFilter ? (
          <>
            <p className="text-gray-500 mb-4">
              No user has tagged a cafe with this vibe; be first to help others find the right cafe by tagging the next cafe you visit
            </p>
            <Button onClick={onLoadMore} variant="outline">
              Show All Cafes
            </Button>
          </>
        ) : (
          <>
            <p className="text-gray-500 mb-4">No cafes found matching your criteria.</p>
            <Button onClick={onLoadMore} variant="outline">
              Load Popular Cafes
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cafes.map((cafe) => (
        <Card 
          key={cafe.id} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onCafeClick(cafe)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Cafe Emoji */}
              <div className="text-2xl flex-shrink-0">
                {getCafeEmoji(cafe.name)}
              </div>
              
              {/* Cafe Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{cafe.name}</h3>
                <p className="text-sm text-gray-600 truncate">{cafe.address}</p>
                <div className="flex items-center gap-2 mt-1">
                  {cafe.neighborhood && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {cafe.neighborhood}
                    </span>
                  )}
                  {cafe.googleRating && (
                    <span className="text-xs text-yellow-600">
                      ⭐ {cafe.googleRating}
                    </span>
                  )}
                  {cafe.distance && (
                    <span className="text-xs text-blue-600">
                      📍 {cafe.distance.toFixed(1)} mi
                    </span>
                  )}
                </div>
                
                {/* Tags with Counts */}
                {(() => {
                  const topTags = getTopTagsForDisplay(cafe);
                  if (topTags.length === 0) return null;
                  
                  return (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {topTags.map(({ tag, count }) => {
                        const isFilteredTag = activeTagFilter === tag;
                        return (
                          <span 
                            key={tag}
                            className={`text-xs px-2 py-1 rounded ${
                              isFilteredTag 
                                ? 'bg-primary text-primary-foreground font-medium border border-primary/20' 
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            #{tag} {formatTagCount(count)}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-4 text-center">
          {loadingMore ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
            </div>
          ) : (
            <Button 
              onClick={onLoadMore} 
              variant="outline"
              className="w-full max-w-xs"
            >
              Load More Cafes
            </Button>
          )}
        </div>
      )}

      {/* End of results */}
      {!hasMore && cafes.length > 0 && (
        <div className="text-center py-4 text-gray-500">
          <p>That's all the cafes we found!</p>
        </div>
      )}
    </div>
  );
}
