import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Coffee, RefreshCw } from "lucide-react";
import { FeedItem } from "@/services/types";
import { fetchFeedItems, filterFeedByTag } from "@/services/feedService";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/Layout/AppLayout";
import { FeedItemCard } from "@/components/Feed/FeedItemCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [searchParams] = useSearchParams();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get tag filter from URL
  const tagFilter = searchParams.get('tag');

  // Load feed items
  const loadFeed = async (showRefreshSpinner = false) => {
    try {
      if (showRefreshSpinner) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      let result;
      if (tagFilter) {
        result = await filterFeedByTag(tagFilter);
      } else {
        result = await fetchFeedItems();
      }
      
      if (result.success) {
        setFeedItems(result.data);
      } else {
        setError(result.error || 'Failed to load feed');
        toast({
          title: "Error",
          description: result.error || 'Failed to load feed',
          variant: "destructive"
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load feed';
      setError(errorMessage);
      toast({
        title: "Error", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle tag click for filtering
  const handleTagClick = (tag: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tag', tag);
    window.history.pushState({}, '', `?${newSearchParams.toString()}`);
    loadFeed();
  };

  // Pull to refresh (placeholder)
  const handleRefresh = () => {
    loadFeed(true);
  };

  // Load data on component mount and when tag changes
  useEffect(() => {
    loadFeed();
  }, [tagFilter]);

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Coffee className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold">Bean Scene</h1>
            </div>
            
            {/* Pull to Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Houston's coffee community feed
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 pb-20">
          {loading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </>
          )}

          {error && !loading && (
            <div className="text-center py-12">
              <Coffee className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => loadFeed()}>
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && feedItems.length === 0 && (
            <div className="text-center py-12">
              <Coffee className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-4">
                {tagFilter 
                  ? `No posts found for #${tagFilter}`
                  : 'Be the first to check in at a Houston cafe!'
                }
              </p>
            </div>
          )}

          {!loading && feedItems.map((item) => (
            <FeedItemCard
              key={item.id}
              item={item}
              onTagClick={handleTagClick}
            />
          ))}

          {!loading && feedItems.length > 0 && (
            <div className="text-center py-8">
              <Button variant="ghost" className="text-muted-foreground">
                Load more...
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}