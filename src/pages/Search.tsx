import { useState, useEffect } from "react";
import { Search as SearchIcon, MapPin, Star, Navigation, Coffee } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/Layout/AppLayout";
import { ExploreFilters, FilterState } from "@/components/Filters/ExploreFilters";
import { useNavigate } from "react-router-dom";
import { searchCafes, fetchNearbyCafes, fetchCafes } from "@/services/cafeService";
import { searchPosts } from "@/services/postService";
import { Cafe, Post } from "@/services/types";
import { debounce, formatDistance } from "@/services/utils";
import { toast } from "@/hooks/use-toast";

const popularTags = [
  "latte-art", "cozy-vibes", "laptop-friendly", "third-wave", "cold-brew",
  "pastries", "rooftop", "instagram-worthy", "pet-friendly", "outdoor-seating"
];

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function Search() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("cafes");
  const [searchResults, setSearchResults] = useState<Cafe[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Location state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [locationLoading, setLocationLoading] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    priceLevel: [],
    rating: 0,
    distance: 10,
    openNow: false,
    locationEnabled: false
  });

  // Request user's location
  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setUserLocation(location);
        setLocationError("");
        setLocationLoading(false);
        
        // Enable location-based filtering
        setFilters(prev => ({ ...prev, locationEnabled: true }));
        
        toast({
          title: "Location enabled",
          description: "Now showing cafes near you"
        });
      },
      (error) => {
        setLocationLoading(false);
        let errorMessage = "";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
          default:
            errorMessage = "An unknown error occurred";
        }
        setLocationError(errorMessage);
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    );
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Perform search with location awareness
  const performSearch = async () => {
    try {
      setLoading(true);
      setHasSearched(true);

      let cafeResults: Cafe[] = [];

      // Use location-based search if available and no specific search query
      if (userLocation && !searchQuery.trim()) {
        const nearbyResult = await fetchNearbyCafes(
          userLocation.latitude,
          userLocation.longitude,
          filters.distance
        );
        
        if (nearbyResult.success) {
          cafeResults = nearbyResult.data;
        }
      } else {
        // Use regular search with filters
        const searchFilters = {
          query: searchQuery.trim() || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          rating: filters.rating > 0 ? filters.rating : undefined,
          priceLevel: filters.priceLevel.length > 0 ? filters.priceLevel : undefined
        };

        const searchResult = await searchCafes(searchQuery, searchFilters);
        
        if (searchResult.success) {
          cafeResults = searchResult.data;
          
          // Add distance calculation if we have user location
          if (userLocation) {
            cafeResults = cafeResults.map(cafe => ({
              ...cafe,
              distance: Math.sqrt(
                Math.pow(cafe.latitude - userLocation.latitude, 2) +
                Math.pow(cafe.longitude - userLocation.longitude, 2)
              ) * 69 // Rough miles conversion
            }));
          }
        }
      }

      // Apply additional filters
      if (filters.priceLevel.length > 0) {
        cafeResults = cafeResults.filter(cafe => 
          cafe.priceLevel && filters.priceLevel.includes(cafe.priceLevel)
        );
      }

      if (filters.rating > 0) {
        cafeResults = cafeResults.filter(cafe => {
          const rating = cafe.googleRating || cafe.rating || 0;
          return rating >= filters.rating;
        });
      }

      setSearchResults(cafeResults);

      // Search posts if there's a query
      if (searchQuery.trim()) {
        const postResult = await searchPosts(searchQuery);
        if (postResult.success) {
          let filteredPosts = postResult.data;
          
          if (selectedTags.length > 0) {
            filteredPosts = filteredPosts.filter(post =>
              post.tags.some(tag => selectedTags.includes(tag))
            );
          }
          
          setPostResults(filteredPosts);
        }
      } else {
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

  // Handle filter changes
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    debouncedSearch();
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSearchQuery("");
    setFilters({
      priceLevel: [],
      rating: 0,
      distance: 10,
      openNow: false,
      locationEnabled: userLocation !== null
    });
    setSearchResults([]);
    setPostResults([]);
    setHasSearched(false);
  };

  // Initial load - show nearby cafes if location is available
  useEffect(() => {
    if (userLocation && !hasSearched) {
      performSearch();
    }
  }, [userLocation]);

  // Trigger search when filters change
  useEffect(() => {
    if (hasSearched || userLocation) {
      debouncedSearch();
    }
  }, [selectedTags, filters]);

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Explore</h1>
            <ExploreFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={clearFilters}
              onRequestLocation={requestLocation}
              hasUserLocation={userLocation !== null}
              locationError={locationError}
            />
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search cafes..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-muted/50 border-0"
            />
          </div>

          {/* Location Status */}
          {userLocation && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="w-4 h-4 text-green-500" />
              <span>Showing cafes near you</span>
            </div>
          )}
        </div>

        <div className="p-4">
          {/* Popular Tags */}
          <div className="mb-6">
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

          {/* Results Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="cafes">
                Cafes {searchResults.length > 0 && `(${searchResults.length})`}
              </TabsTrigger>
              <TabsTrigger value="posts">
                Posts {postResults.length > 0 && `(${postResults.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cafes" className="space-y-4 mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">
                    {userLocation ? "Finding nearby cafes..." : "Searching cafes..."}
                  </p>
                </div>
              ) : !hasSearched && !userLocation ? (
                <div className="text-center py-12">
                  <div className="space-y-4">
                    <Coffee className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Discover Houston Cafes</h3>
                    <p className="text-muted-foreground mb-4">
                      Enable location to find cafes near you, or search by name
                    </p>
                    <Button onClick={requestLocation} className="coffee-gradient text-white">
                      <Navigation className="w-4 h-4 mr-2" />
                      Find Cafes Near Me
                    </Button>
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Cafes Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search terms or filters
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
                                {(cafe.googleRating || cafe.rating || 0).toFixed(1)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {cafe.neighborhood || 'Houston'}
                            </span>
                            {(cafe as any).distance && (
                              <span className="text-xs text-muted-foreground">
                                • {((cafe as any).distance).toFixed(1)} mi
                              </span>
                            )}
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
              {/* Posts tab content - similar structure */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Searching posts...</p>
                </div>
              ) : postResults.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Posts Found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "No posts match your search" : "Search for posts to see results"}
                  </p>
                </div>
              ) : (
                postResults.map((post) => (
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
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
