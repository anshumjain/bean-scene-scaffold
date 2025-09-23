import { useState, useEffect } from "react";
import { Search as SearchIcon, MapPin, Star, Navigation, Coffee, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/Layout/AppLayout";
import { ExploreFilters, FilterState } from "@/components/Explore/ExploreFilters";
import { useNavigate } from "react-router-dom";
import { searchCafes, fetchNearbyCafes, fetchCafes } from "@/services/cafeService";
import { searchPosts } from "@/services/postService";
import { Cafe, Post } from "@/services/types";
import { debounce, formatDistance } from "@/services/utils";
import { toast } from "@/hooks/use-toast";

type SortOption = 'rating' | 'distance' | 'price' | 'name';

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
  const [allCafes, setAllCafes] = useState<Cafe[]>([]); // Store all cafes for sorting/filtering
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  
  // Location state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [locationLoading, setLocationLoading] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    priceLevel: [],
    rating: 0,
    distance: 25, // Default to show all when no location
    openNow: false,
    locationEnabled: false
  });

  // Load all cafes on initial load
  const loadAllCafes = async () => {
    try {
      setInitialLoading(true);
      const result = await fetchCafes();
      if (result.success) {
        setAllCafes(result.data);
        setSearchResults(result.data); // Show all cafes initially
        setHasSearched(true);
      } else {
        toast({
          title: "Error loading cafes",
          description: result.error || "Failed to load cafes",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading cafes:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  // Sort cafes based on selected option
  const sortCafes = (cafes: Cafe[], sortOption: SortOption): Cafe[] => {
    const sorted = [...cafes];
    
    switch (sortOption) {
      case 'rating':
        return sorted.sort((a, b) => {
          const ratingA = a.googleRating || a.rating || 0;
          const ratingB = b.googleRating || b.rating || 0;
          return ratingB - ratingA; // High to low
        });
      
      case 'distance':
        if (userLocation) {
          return sorted.sort((a, b) => {
            const distA = (a as any).distance || 0;
            const distB = (b as any).distance || 0;
            return distA - distB; // Near to far
          });
        }
        return sorted; // No sorting if no location
      
      case 'price':
        return sorted.sort((a, b) => {
          const priceA = a.priceLevel || 0;
          const priceB = b.priceLevel || 0;
          return priceA - priceB; // Low to high
        });
      
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name)); // A to Z
      
      default:
        return sorted;
    }
  };

  // Apply filters to cafes
  const applyFilters = (cafes: Cafe[]): Cafe[] => {
    let filtered = [...cafes];

    // Price level filter
    if (filters.priceLevel.length > 0) {
      filtered = filtered.filter(cafe => 
        cafe.priceLevel && filters.priceLevel.includes(cafe.priceLevel)
      );
    }

    // Rating filter
    if (filters.rating > 0) {
      filtered = filtered.filter(cafe => {
        const rating = cafe.googleRating || cafe.rating || 0;
        return rating >= filters.rating;
      });
    }

    // Distance filter (only if location available)
    if (userLocation && filters.distance < 25) {
      filtered = filtered.filter(cafe => {
        const distance = (cafe as any).distance;
        return !distance || distance <= filters.distance;
      });
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(cafe =>
        cafe.tags.some(tag => selectedTags.includes(tag))
      );
    }

    return filtered;
  };
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
        
        // Enable location-based filtering and add distance calculations
        setFilters(prev => ({ ...prev, locationEnabled: true, distance: 10 }));
        
        // Add distances to all cafes
        const cafesWithDistance = allCafes.map(cafe => ({
          ...cafe,
          distance: Math.sqrt(
            Math.pow((cafe.latitude - location.latitude) * 69, 2) +
            Math.pow((cafe.longitude - location.longitude) * 69 * Math.cos(location.latitude * Math.PI / 180), 2)
          )
        }));
        
        setAllCafes(cafesWithDistance);
        updateResults(cafesWithDistance);
        
        toast({
          title: "Location enabled",
          description: "Now showing distances to cafes"
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
  const updateResults = (cafesToUpdate = allCafes) => {
    let results = cafesToUpdate;
    
    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(cafe => 
        cafe.name.toLowerCase().includes(query) ||
        (cafe.neighborhood && cafe.neighborhood.toLowerCase().includes(query)) ||
        cafe.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply filters
    results = applyFilters(results);
    
    // Apply sorting
    results = sortCafes(results, sortBy);
    
    setSearchResults(results);
  };

  // Handle search query change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const debouncedUpdate = debounce(() => updateResults(), 300);
    debouncedUpdate();
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    updateResults();
  };

  // Handle sort change
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    updateResults();
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSearchQuery("");
    setFilters({
      priceLevel: [],
      rating: 0,
      distance: userLocation ? 10 : 25,
      openNow: false,
      locationEnabled: userLocation !== null
    });
    setSortBy('rating');
    updateResults();
  };

  // Load cafes on mount
  useEffect(() => {
    loadAllCafes();
  }, []);

  // Update results when filters change
  useEffect(() => {
    updateResults();
  }, [selectedTags, filters, sortBy]);

  // Update results when search changes
  useEffect(() => {
    updateResults();
  }, [searchQuery]);

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
          <div className="relative mb-3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search cafes..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-muted/50 border-0"
            />
          </div>

          {/* Sort and Status Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value: SortOption) => handleSortChange(value)}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  {userLocation && <SelectItem value="distance">Distance</SelectItem>}
                </SelectContent>
              </Select>
              
              <span className="text-sm text-muted-foreground">
                {searchResults.length} cafe{searchResults.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Location Status */}
            {userLocation && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Navigation className="w-3 h-3 text-green-500" />
                <span>Near you</span>
              </div>
            )}
          </div>
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
              {initialLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading Houston cafes...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Cafes Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || selectedTags.length > 0 ? 
                      "Try adjusting your search terms or filters" : 
                      "No cafes match your current filters"
                    }
                  </p>
                  <Button onClick={clearFilters} variant="outline">
                    Clear All Filters
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
