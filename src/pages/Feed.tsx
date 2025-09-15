import { useState } from "react";
import { Search, Filter, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/Layout/AppLayout";
import { PostCard } from "@/components/Feed/PostCard";

// Mock data for development
const mockPosts = [
  {
    id: "1",
    cafeName: "Blacksmith Coffee",
    neighborhood: "Montrose",
    imageUrl: "/placeholder.svg",
    tags: ["latte-art", "cozy-vibes", "laptop-friendly"],
    rating: 4.8,
    textReview: "Amazing cortado with beautiful latte art! The atmosphere is perfect for working, and the baristas really know their craft. Highly recommend the house blend.",
    createdAt: "2h ago",
    likes: 24,
    comments: 8
  },
  {
    id: "2", 
    cafeName: "Greenway Coffee",
    neighborhood: "Heights",
    imageUrl: "/placeholder.svg",
    tags: ["third-wave", "cold-brew", "rooftop"],
    rating: 4.6,
    textReview: "Love their cold brew setup! Great outdoor seating with a view. Perfect spot to catch up with friends over some specialty drinks.",
    createdAt: "4h ago",
    likes: 18,
    comments: 5
  },
  {
    id: "3",
    cafeName: "Hugo's Coffee",
    neighborhood: "Downtown",
    imageUrl: "/placeholder.svg", 
    tags: ["pastries", "instagram-worthy", "busy"],
    rating: 4.4,
    textReview: "Their croissants are to die for! Got here early and it was already buzzing with the morning crowd. Great energy and even better coffee.",
    createdAt: "6h ago",
    likes: 31,
    comments: 12
  }
];

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get tag from URL parameters
  const tagFromUrl = searchParams.get('tag');

  // Load posts based on filters
  const loadPosts = async (tag?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let result;
      if (tag) {
        result = await filterFeedByTag(tag);
        setSelectedTag(tag);
      } else {
        result = await fetchPosts();
        setSelectedTag(null);
      }
      
      if (result.success) {
        setPosts(result.data);
      } else {
        setError(result.error || 'Failed to load posts');
        toast({
          title: "Error",
          description: result.error || 'Failed to load posts',
          variant: "destructive"
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load posts';
      setError(errorMessage);
      toast({
        title: "Error", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounced search function
  const debouncedSearch = debounce(async (query: string) => {
    if (query.trim()) {
      try {
        const result = await searchCafes(query);
        if (result.success) {
          // Handle search results - for now just show toast
          toast({
            title: "Search Results",
            description: `Found ${result.data.length} cafes matching "${query}"`
          });
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }
  }, 300);

  // Handle search input
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Clear tag filter
  const clearTagFilter = () => {
    setSearchParams({});
    loadPosts();
  };

  // Load posts on component mount and when tag changes
  useEffect(() => {
    loadPosts(tagFromUrl || undefined);
  }, [tagFromUrl]);

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading Houston cafes...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold">Explore</h1>
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search cafes, tags, neighborhoods..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-muted/50 border-0"
              />
            </div>
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Active Tag Filter */}
          {selectedTag && (
            <div className="flex items-center gap-2 mt-3">
              <Badge
                variant="default"
                className="flex items-center gap-1"
              >
                #{selectedTag}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={clearTagFilter}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
              <span className="text-xs text-muted-foreground">
                {posts.length} posts found
              </span>
            </div>
          )}
        </div>

        {/* Feed */}
        <div className="p-4 space-y-6 pb-20">
          {error && (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => loadPosts(selectedTag || undefined)}>
                Try Again
              </Button>
            </div>
          )}
          
          {!error && posts.length === 0 && !loading && (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No posts found</h3>
              <p className="text-muted-foreground mb-4">
                {selectedTag 
                  ? `No posts found for #${selectedTag}. Try exploring other tags or check out nearby cafes.`
                  : 'No posts available yet. Be the first to check in at a Houston cafe!'
                }
              </p>
              {selectedTag && (
                <Button onClick={clearTagFilter} variant="outline">
                  Clear Filter
                </Button>
              )}
            </div>
          )}

          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={{
                id: post.id,
                cafeName: post.cafe?.name || 'Unknown Cafe',
                neighborhood: post.cafe?.neighborhood || 'Houston',
                imageUrl: post.imageUrl,
                tags: post.tags,
                rating: post.rating,
                textReview: post.textReview,
                createdAt: new Date(post.createdAt).toLocaleString(),
                likes: post.likes,
                comments: post.comments
              }} 
            />
          ))}
          
          {/* Load More */}
          {posts.length > 0 && (
            <div className="text-center py-8">
              <Button variant="ghost" className="text-muted-foreground">
                Load more posts...
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}