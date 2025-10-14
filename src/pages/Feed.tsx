import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { PostCard } from "@/components/Feed/PostCard";
import { fetchPosts } from "@/services/postService";
import { Loader2, Coffee, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

export default function Feed() {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPosts();
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
  }, []);

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

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Feed</h1>
              <p className="text-sm text-muted-foreground">Community coffee check-ins</p>
            </div>
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

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading feed...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Coffee className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Coffee className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Be the first to share your coffee moment!
              </p>
              <Button 
                onClick={() => navigate('/share')}
                className="coffee-gradient text-white"
              >
                Share a Moment
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