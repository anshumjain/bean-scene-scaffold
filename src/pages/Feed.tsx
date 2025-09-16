import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, X, MapPin, Grid } from "lucide-react";
import { Post, Cafe } from "@/services/types";
import { fetchPosts, filterFeedByTag } from "@/services/postService";
import { fetchCafes } from "@/services/cafeService";
import { debounce } from "@/services/utils";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/Layout/AppLayout";
import { PostCard } from "@/components/Feed/PostCard";
import { ExploreFilters, FilterState } from "@/components/Filters/ExploreFilters";

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [filteredCafes, setFilteredCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [cafesLoading, setCafesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [filters, setFilters] = useState<FilterState>({
    priceLevel: [],
    rating: 0,
    distance: 25,
    openNow: false,
    neighborhoods: []
  });

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

  // Load cafes
  const loadCafes = async () => {
    try {
      setCafesLoading(true);
      const result = await fetchCafes();
      if (result.success) {
        setCafes(result.data);
        setFilteredCafes(result.data);
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to load cafes',
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Failed to load cafes:', err);
    } finally {
      setCafesLoading(false);
    }
  };

  // Apply filters to cafes
  const applyFilters = (searchTerm = searchQuery) => {
    let filtered = [...cafes];

    // Search by name or neighborhood
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(cafe => 
        cafe.name.toLowerCase().includes(query) ||
        cafe.neighborhood.toLowerCase().includes(query)
      );
    }

    // Price level filter
    if (filters.priceLevel.length > 0) {
      filtered = filtered.filter(cafe => 
        cafe.priceLevel && filters.priceLevel.includes(cafe.priceLevel)
      );
    }

    // Rating filter
    if (filters.rating > 0) {
      filtered = filtered.filter(cafe => 
        (cafe.rating || 0) >= filters.rating
      );
    }

    // Neighborhood filter
    if (filters.neighborhoods.length > 0) {
      filtered = filtered.filter(cafe => 
        filters.neighborhoods.includes(cafe.neighborhood)
      );
    }

    // Open now filter (mock implementation)
    if (filters.openNow) {
      // In real implementation, this would check actual hours
      filtered = filtered.filter(cafe => Math.random() > 0.3); // Mock: 70% are "open"
    }

    setFilteredCafes(filtered);
  };

  // Debounced search function
  const debouncedSearch = debounce((query: string) => {
    applyFilters(query);
  }, 300);

  // Handle search input
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      priceLevel: [],
      rating: 0,
      distance: 25,
      openNow: false,
      neighborhoods: []
    });
    setSearchQuery("");
  };

  // Clear tag filter
  const clearTagFilter = () => {
    setSearchParams({});
    loadPosts();
  };

  // Handle cafe navigation
  const handleCafeClick = (cafe: Cafe) => {
    navigate(`/cafe/${cafe.placeId}`);
  };

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filters, cafes]);

  // Load data on component mount
  useEffect(() => {
    loadPosts(tagFromUrl || undefined);
    loadCafes();
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
                placeholder="Search cafes, neighborhoods..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-muted/50 border-0"
              />
            </div>
            <ExploreFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={clearAllFilters}
            />
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

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="sticky top-[120px] z-30 w-full bg-background/95 backdrop-blur-md border-b border-border">
            <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
            <TabsTrigger value="cafes" className="flex-1">
              Cafes ({filteredCafes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-0">
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
              
              {posts.length > 0 && (
                <div className="text-center py-8">
                  <Button variant="ghost" className="text-muted-foreground">
                    Load more posts...
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cafes" className="mt-0">
            <div className="p-4 space-y-4 pb-20">
              {cafesLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading cafes...</p>
                </div>
              )}

              {!cafesLoading && filteredCafes.length === 0 && (
                <div className="text-center py-12">
                  <Grid className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No cafes found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters or search terms.
                  </p>
                  <Button onClick={clearAllFilters} variant="outline">
                    Clear All Filters
                  </Button>
                </div>
              )}

              {filteredCafes.map((cafe) => (
                <Card 
                  key={cafe.id}
                  className="cursor-pointer hover:shadow-coffee transition-smooth shadow-warm border-0"
                  onClick={() => handleCafeClick(cafe)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {cafe.photos?.[0] ? (
                        <img
                          src={cafe.photos[0]}
                          alt={cafe.name}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                          <Grid className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1">{cafe.name}</h3>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{cafe.neighborhood}</span>
                          {cafe.priceLevel && (
                            <div className="flex items-center ml-auto">
                              {Array.from({ length: 4 }, (_, i) => (
                                <span
                                  key={i}
                                  className={`text-xs ${
                                    i < cafe.priceLevel! ? "text-foreground" : "text-muted-foreground"
                                  }`}
                                >
                                  $
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {cafe.rating && (
                          <div className="flex items-center gap-1 mb-3">
                            <span className="text-yellow-500">★</span>
                            <span className="text-sm font-medium">{cafe.rating}</span>
                            <span className="text-xs text-muted-foreground">Google</span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {cafe.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs px-2 py-0 bg-primary/10 text-primary border-0"
                            >
                              #{tag}
                            </Badge>
                          ))}
                          {cafe.tags.length > 2 && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-2 py-0 bg-muted/50 text-muted-foreground border-0"
                            >
                              +{cafe.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}