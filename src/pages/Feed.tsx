import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, X, MapPin, Grid } from "lucide-react";
import { Post, Cafe } from "@/services/types";
import { fetchPosts, filterFeedByTag } from "@/services/postService";
import { fetchCafes, fetchNearbyCafes } from "@/services/cafeService";
import { debounce, getCurrentLocation } from "@/services/utils";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/Layout/AppLayout";
import { PostCard } from "@/components/Feed/PostCard";
import { ExploreFilters, FilterState } from "@/components/Filters/ExploreFilters";
import { RadiusFilter } from "@/components/Filters/RadiusFilter";
import { getCafeEmoji } from "@/utils/emojiPlaceholders";
import { isCafeOpenNow } from "@/utils/openingHours";

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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    priceLevel: [],
    rating: 0,
    distance: 5, // Default to 5 miles as requested
    openNow: false,
    neighborhoods: [],
    sortBy: 'newest',
    sortOrder: 'desc'
  });

  // Get tag from URL parameters
  const tagFromUrl = searchParams.get('tag');

  // Auto-detect location on page load
  const autoDetectLocation = async () => {
    try {
      // Check if we already have location stored
      const storedLocation = localStorage.getItem('user-location');
      if (storedLocation) {
        const parsedLocation = JSON.parse(storedLocation);
        // Check if location is not too old (less than 1 hour)
        if (parsedLocation.timestamp && Date.now() - parsedLocation.timestamp < 3600000) {
          setUserLocation({ lat: parsedLocation.latitude, lng: parsedLocation.longitude });
          console.log('Using stored location:', parsedLocation);
          return;
        }
      }

      // Try to get current location automatically (without user interaction)
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;
      
      // Store location with timestamp
      const locationData = {
        latitude,
        longitude,
        timestamp: Date.now()
      };
      localStorage.setItem('user-location', JSON.stringify(locationData));
      
      setUserLocation({ lat: latitude, lng: longitude });
      console.log('Auto-detected location:', { latitude, longitude });
      
      // Update distance filter to a reasonable default when location is auto-detected
      setFilters(prev => ({
        ...prev,
        distance: prev.distance === 25 ? 10 : prev.distance
      }));
    } catch (error) {
      // Silently fail for auto-detection - user can still manually request location
      console.log('Auto-location detection failed:', error);
    }
  };

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

  // Request location permission
  const requestLocation = async () => {
    try {
      setLocationError(null);
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;
      
      // Store location with timestamp
      const locationData = {
        latitude,
        longitude,
        timestamp: Date.now()
      };
      localStorage.setItem('user-location', JSON.stringify(locationData));
      
      setUserLocation({ lat: latitude, lng: longitude });
    } catch (error) {
      setLocationError("Enable location to find cafes near you");
    }
  };

  // Apply filters to cafes
  const applyFilters = (searchTerm = searchQuery) => {
    let filtered = [...cafes];

    // Location-based filtering
    if (userLocation && filters.distance < 25) {
      filtered = filtered.filter(cafe => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          cafe.latitude,
          cafe.longitude
        );
        return distance <= filters.distance;
      });
    }

    // Search by name or neighborhood
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(cafe => 
        cafe.name.toLowerCase().includes(query) ||
        cafe.neighborhood.toLowerCase().includes(query) ||
        cafe.tags.some(tag => tag.toLowerCase().includes(query))
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
        (cafe.googleRating || cafe.rating || 0) >= filters.rating
      );
    }

    // Neighborhood filter
    if (filters.neighborhoods.length > 0) {
      filtered = filtered.filter(cafe => 
        filters.neighborhoods.includes(cafe.neighborhood)
      );
    }

    // Open now filter
    if (filters.openNow) {
      filtered = filtered.filter(cafe => {
        if (!cafe.openingHours || cafe.openingHours.length === 0) {
          return false; // No hours data, assume closed
        }
        
        return isCafeOpenNow(cafe.openingHours);
      });
    }

    // Apply hybrid sorting: distance first (if location available), then popularity
    if (userLocation && filters.sortBy === 'newest') {
      // Default hybrid sorting when location is available
      filtered.sort((a, b) => {
        if (!a.latitude || !a.longitude || !b.latitude || !b.longitude) {
          // If either cafe lacks coordinates, put it at the end
          return (a.latitude && a.longitude) ? -1 : 1;
        }
        
        const aDistance = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
        const bDistance = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
        
        // Primary sort: by distance (closest first)
        const distanceDiff = aDistance - bDistance;
        if (Math.abs(distanceDiff) > 0.1) { // Only consider significant distance differences
          return distanceDiff;
        }
        
        // Secondary sort: by rating (highest first) for cafes at similar distances
        const aRating = a.googleRating || a.rating || 0;
        const bRating = b.googleRating || b.rating || 0;
        return bRating - aRating;
      });
    } else if (!userLocation && filters.sortBy === 'newest') {
      // No location available - sort by neighborhood popularity, then rating
      const neighborhoodOrder = [
        "Montrose", "Heights", "Downtown", "Midtown", "Rice Village",
        "West University", "River Oaks", "Memorial", "Galleria", "East End",
        "Museum District", "Washington Avenue", "EaDo", "Third Ward", "Fifth Ward"
      ];
      
      filtered.sort((a, b) => {
        // Primary sort: by neighborhood popularity (order in array)
        const aNeighborhoodIndex = neighborhoodOrder.indexOf(a.neighborhood || '');
        const bNeighborhoodIndex = neighborhoodOrder.indexOf(b.neighborhood || '');
        
        // If neighborhoods are in our priority list, sort by priority
        if (aNeighborhoodIndex !== -1 && bNeighborhoodIndex !== -1) {
          const neighborhoodDiff = aNeighborhoodIndex - bNeighborhoodIndex;
          if (neighborhoodDiff !== 0) {
            return neighborhoodDiff;
          }
        } else if (aNeighborhoodIndex !== -1) {
          return -1; // Prioritize known neighborhoods
        } else if (bNeighborhoodIndex !== -1) {
          return 1;
        }
        
        // Secondary sort: by rating (highest first)
        const aRating = a.googleRating || a.rating || 0;
        const bRating = b.googleRating || b.rating || 0;
        return bRating - aRating;
      });
    } else {
      // Apply explicit sorting when user selects a specific sort option
      filtered.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case 'rating':
            const aRating = a.googleRating || a.rating || 0;
            const bRating = b.googleRating || b.rating || 0;
            comparison = aRating - bRating;
            break;
          case 'price':
            const aPrice = a.priceLevel || 0;
            const bPrice = b.priceLevel || 0;
            comparison = aPrice - bPrice;
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'distance':
            if (userLocation) {
              const aDistance = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
              const bDistance = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
              comparison = aDistance - bDistance;
            } else {
              comparison = Math.random() - 0.5;
            }
            break;
          case 'newest':
          default:
            comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            break;
        }
        
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    setFilteredCafes(filtered);
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
      distance: 5, // Reset to 5 miles default
      openNow: false,
      neighborhoods: [],
      sortBy: 'newest',
      sortOrder: 'desc'
    });
    setSearchQuery("");
    setUserLocation(null);
    setLocationError(null);
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
    autoDetectLocation(); // Auto-detect location on page load
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
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-2xl font-bold">Explore</h1>
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          
          {/* Search Bar */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search cafes, neighborhoods..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-muted/30 border-0 shadow-sm"
              />
            </div>
            <ExploreFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={clearAllFilters}
            />
          </div>

          {/* Radius Filter */}
          <RadiusFilter
            radius={filters.distance}
            onRadiusChange={(radius) => handleFiltersChange({ ...filters, distance: radius })}
            userLocation={userLocation}
            onRequestLocation={requestLocation}
            locationError={locationError}
          />

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
          <TabsList className="sticky top-[140px] z-30 w-full bg-background/95 backdrop-blur-md border-b border-border mx-4 mt-2">
            <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
            <TabsTrigger value="cafes" className="flex-1">
              Cafes ({filteredCafes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-0">
            <div className="p-4 space-y-4 pb-20">
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
                    comments: post.comments,
                    username: post.username,
                    placeId: post.cafe?.placeId || post.placeId,
                    photoSource: post.photoSource // ADD THIS LINE!
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
            <div className="p-4 space-y-3 pb-20">
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
                  className="cursor-pointer hover:shadow-coffee transition-smooth shadow-sm border border-border/50"
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
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#8b5a3c] to-[#6b4423] flex items-center justify-center text-white text-2xl shadow-lg">
                          {getCafeEmoji(cafe.id || cafe.placeId)}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1">{cafe.name}</h3>
                        
                        <div className="flex items-center gap-2 mb-2">
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
                          <div className="flex items-center gap-1">
                            <span className="coffee-star">★</span>
                            <span className="text-sm font-medium">{cafe.rating}</span>
                            <span className="text-xs text-muted-foreground">Google</span>
                          </div>
                        )}
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