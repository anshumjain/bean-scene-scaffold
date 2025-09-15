import { useState, useEffect } from "react";
import { Search as SearchIcon, Filter, MapPin, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { searchCafes } from "@/services/cafeService";
import { searchPosts } from "@/services/postService";
import { Cafe, Post, HOUSTON_NEIGHBORHOODS } from "@/services/types";
import { debounce, formatDistance } from "@/services/utils";
import { toast } from "@/hooks/use-toast";

const neighborhoods = [
  "Montrose", "Heights", "Downtown", "Midtown", "Rice Village", 
  "West University", "River Oaks", "Memorial", "Galleria", "East End"
];

const popularTags = [
  "latte-art", "cozy-vibes", "laptop-friendly", "third-wave", "cold-brew",
  "pastries", "rooftop", "instagram-worthy", "pet-friendly", "outdoor-seating"
];

const mockCafes = [
  {
    id: "1",
    name: "Blacksmith Coffee",
    neighborhood: "Montrose",
    rating: 4.8,
    distance: "0.2 mi",
    tags: ["latte-art", "cozy-vibes", "laptop-friendly"],
    image: "/placeholder.svg"
  },
  {
    id: "2", 
    name: "Greenway Coffee",
    neighborhood: "Heights",
    rating: 4.6,
    distance: "0.5 mi", 
    tags: ["third-wave", "cold-brew", "rooftop"],
    image: "/placeholder.svg"
  },
  {
    id: "3",
    name: "Hugo's Coffee", 
    neighborhood: "Downtown",
    rating: 4.4,
    distance: "0.8 mi",
    tags: ["pastries", "instagram-worthy", "busy"],
    image: "/placeholder.svg"
  }
];

export default function Search() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("cafes");
  const [searchResults, setSearchResults] = useState<Cafe[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleNeighborhoodToggle = (neighborhood: string) => {
    setSelectedNeighborhoods(prev =>
      prev.includes(neighborhood)
        ? prev.filter(n => n !== neighborhood)
        : [...prev, neighborhood]
    );
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Perform search
  const performSearch = async () => {
    if (!searchQuery.trim() && selectedNeighborhoods.length === 0 && selectedTags.length === 0) {
      setSearchResults([]);
      setPostResults([]);
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);

      const filters = {
        query: searchQuery.trim() || undefined,
        neighborhoods: selectedNeighborhoods.length > 0 ? selectedNeighborhoods : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined
      };

      // Search cafes and posts in parallel
      const [cafeResult, postResult] = await Promise.all([
        searchCafes(searchQuery, filters),
        searchPosts(searchQuery)
      ]);

      if (cafeResult.success) {
        setSearchResults(cafeResult.data);
      } else {
        console.error('Cafe search failed:', cafeResult.error);
        setSearchResults([]);
      }

      if (postResult.success) {
        // Filter posts by selected filters
        let filteredPosts = postResult.data;
        if (selectedNeighborhoods.length > 0) {
          filteredPosts = filteredPosts.filter(post => 
            post.cafe && selectedNeighborhoods.includes(post.cafe.neighborhood)
          );
        }
        if (selectedTags.length > 0) {
          filteredPosts = filteredPosts.filter(post =>
            post.tags.some(tag => selectedTags.includes(tag))
          );
        }
        setPostResults(filteredPosts);
      } else {
        console.error('Post search failed:', postResult.error);
        setPostResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to perform search. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = debounce(performSearch, 300);

  // Handle search query change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch();
  };

  const clearFilters = () => {
    setSelectedNeighborhoods([]);
    setSelectedTags([]);
    setSearchQuery("");
    setSearchResults([]);
    setPostResults([]);
    setHasSearched(false);
  };

  // Trigger search when filters change
  useEffect(() => {
    debouncedSearch();
  }, [selectedNeighborhoods, selectedTags]);

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <h1 className="text-2xl font-bold mb-4">Search</h1>
          
          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search cafes, neighborhoods..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-muted/50 border-0"
            />
          </div>
        </div>

        <div className="p-4">
          {/* Filters */}
          <div className="space-y-4 mb-6">
            {/* Neighborhoods */}
            <div>
              <h3 className="font-semibold mb-3">Neighborhoods</h3>
              <div className="flex flex-wrap gap-2">
                {neighborhoods.slice(0, 6).map((neighborhood) => (
                  <Badge
                    key={neighborhood}
                    variant={selectedNeighborhoods.includes(neighborhood) ? "default" : "outline"}
                    className="cursor-pointer transition-smooth"
                    onClick={() => handleNeighborhoodToggle(neighborhood)}
                  >
                    {neighborhood}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="font-semibold mb-3">Popular Tags</h3>
              <div className="flex flex-wrap gap-2">
                {popularTags.slice(0, 8).map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer transition-smooth"
                    onClick={() => handleTagToggle(tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedNeighborhoods.length > 0 || selectedTags.length > 0 || searchQuery) && (
              <Button variant="ghost" onClick={clearFilters} className="w-full">
                Clear All Filters
              </Button>
            )}
          </div>

          {/* Results Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="cafes">Cafes</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
            </TabsList>

            <TabsContent value="cafes" className="space-y-4 mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Searching Houston cafes...</p>
                </div>
              ) : !hasSearched ? (
                <div className="text-center py-12">
                  <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Search Houston Cafes</h3>
                  <p className="text-muted-foreground">
                    Enter a search term or select filters to find great coffee spots
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Cafes Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No cafes match your search criteria. Try adjusting your filters or search terms.
                  </p>
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                </div>
              ) : (
                searchResults.map((cafe) => (
                  <Card 
                    key={cafe.id}
                    className="cursor-pointer hover:shadow-coffee transition-smooth shadow-coffee border-0"
                    onClick={() => navigate(`/cafe/${cafe.placeId}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <img
                          src={cafe.photos?.[0] || "/placeholder.svg"}
                          alt={cafe.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="font-semibold truncate">{cafe.name}</h3>
                            <div className="flex items-center gap-1 ml-2">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">
                                {cafe.rating || cafe.googleRating || 'N/A'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{cafe.neighborhood}</span>
                            <span className="text-xs text-muted-foreground">
                              • {((cafe as any).distance) ? formatDistance((cafe as any).distance) : 'Near you'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {cafe.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs px-2 py-0 bg-accent/30 text-accent-foreground border-0"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="posts" className="space-y-4 mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Searching posts...</p>
                </div>
              ) : !hasSearched ? (
                <div className="text-center py-12">
                  <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Search Posts</h3>
                  <p className="text-muted-foreground">
                    Find posts by keywords, tags, or neighborhoods
                  </p>
                </div>
              ) : postResults.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Posts Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No posts match your search criteria. Try different keywords or filters.
                  </p>
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {postResults.map((post) => (
                    <Card key={post.id} className="shadow-coffee border-0">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <img
                            src={post.imageUrl}
                            alt="Post"
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h3 className="font-semibold truncate">
                                {post.cafe?.name || 'Unknown Cafe'}
                              </h3>
                              <div className="flex items-center gap-1 ml-2">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{post.rating}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {post.cafe?.neighborhood || 'Houston'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                • {new Date(post.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {post.textReview}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {post.tags.slice(0, 3).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs px-2 py-0 bg-accent/30 text-accent-foreground border-0"
                                >
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}