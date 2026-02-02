import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { PostCard } from "@/components/Feed/PostCard";
import { fetchPosts } from "@/services/postService";
import { getCurrentCity } from "@/services/cityService";
import { Loader2, Coffee, RefreshCw, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Feed() {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [showCityFilter, setShowCityFilter] = useState(false); // Default: show all cities

  // Detect user's city on mount
  useEffect(() => {
    const detectCity = async () => {
      try {
        const city = await getCurrentCity();
        setUserCity(city);
      } catch (err) {
        console.error('Failed to detect city:', err);
        setUserCity('houston'); // Default fallback
      }
    };
    detectCity();
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Filter by user's city only if city filter is enabled (default: show all)
      const cityFilter = showCityFilter ? (userCity || undefined) : undefined;
      const result = await fetchPosts({ city: cityFilter });
      if (result.success) {
        setPosts(result.data);
      } else {
        setError(result.error || 'Failed to load posts');
      }
    } catch (err) {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [userCity, showCityFilter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Refresh posts when returning from other pages (like after creating a post)
  useEffect(() => {
    if (location.state?.refreshPosts) {
      loadPosts();
      // Clear the refresh flag
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loadPosts]);

  // Set up real-time subscription for new posts
  // Note: We refresh the entire feed to respect city filtering
  useEffect(() => {
    const channel = supabase
      .channel('posts_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'posts' 
        }, 
        (payload) => {
          console.log('New post detected:', payload);
          // Refresh posts when a new one is created (respects city filter)
          loadPosts();
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'posts' 
        }, 
        (payload) => {
          console.log('Post updated:', payload);
          // Refresh posts when one is updated (respects city filter)
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPosts]);

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Feed</h1>
              <p className="text-sm text-muted-foreground">
                {showCityFilter 
                  ? `${userCity === 'austin' ? 'Austin' : 'Houston'} coffee check-ins`
                  : 'All coffee check-ins'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              {userCity && (
                <Button
                  variant={showCityFilter ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowCityFilter(!showCityFilter)}
                  className="p-2"
                  title={showCityFilter ? "Show all cities" : `Show only ${userCity === 'austin' ? 'Austin' : 'Houston'} posts`}
                >
                  {showCityFilter ? (
                    <Globe className="w-4 h-4" />
                  ) : (
                    <Coffee className="w-4 h-4" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={loadPosts}
                disabled={loading}
                className="p-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="space-y-4">
              {/* Skeleton Loaders */}
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Coffee className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Coffee className="w-12 h-12 text-primary/60" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-center">
                {showCityFilter 
                  ? `No posts in ${userCity === 'austin' ? 'Austin' : 'Houston'} yet`
                  : 'No posts yet'
                }
              </h3>
              <p className="text-muted-foreground text-center mb-6 max-w-sm">
                {showCityFilter 
                  ? `Be the first to share a coffee moment in ${userCity === 'austin' ? 'Austin' : 'Houston'}! Your post will help others discover great cafes.`
                  : 'Be the first to share your coffee moment! Help build the community by sharing your favorite cafes.'
                }
              </p>
              <Button 
                onClick={() => navigate('/share')}
                className="coffee-gradient text-white shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                Share Your First Post
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard 
                  key={post.id}
                  post={{
                    id: post.id,
                    cafeName: post.cafe?.name || 'Unknown Cafe',
                    neighborhood: post.cafe?.neighborhood || '',
                    imageUrl: post.imageUrl,
                    tags: post.tags || [],
                    rating: post.rating || 0,
                    textReview: post.textReview || '',
                    createdAt: new Date(post.createdAt).toLocaleString(),
                    likes: post.likes || 0,
                    comments: post.comments || 0,
                    username: post.username,
                    placeId: post.cafe?.placeId || post.placeId
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}