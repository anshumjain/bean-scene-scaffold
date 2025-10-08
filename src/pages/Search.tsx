import { useState, useEffect, useCallback } from "react";
import { Search as SearchIcon, MapPin, Star, Navigation, Cloud, Sun, Filter, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/Layout/AppLayout";
import { ExploreFilters, FilterState } from "@/components/Filters/ExploreFilters";
import { useNavigate } from "react-router-dom";
import { fetchCafes } from "@/services/cafeService";
import { Cafe, Post } from "@/services/types";
import { debounce, getCurrentLocation } from "@/services/utils";
import { calculateDistance } from "@/utils/distanceUtils";
import { toast } from "@/hooks/use-toast";
import { getCafeEmoji } from "@/utils/emojiPlaceholders";


const popularTags = [
  "latte-art", "cozy-vibes", "laptop-friendly", "third-wave",
  "cold-brew", "pastries", "rooftop", "instagram-worthy"
];

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function Search() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem('explore-search-query') || '';
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('explore-selected-tags');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState("cafes");
  const [showFilters, setShowFilters] = useState(false);

  const [allCafes, setAllCafes] = useState<Cafe[]>([]);
  const [searchResults, setSearchResults] = useState<Cafe[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Location
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState("");
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  // Filters - with persistence
  const [filters, setFilters] = useState<FilterState>(() => {
    // Try to load filters from localStorage
    const savedFilters = localStorage.getItem('explore-filters');
    if (savedFilters) {
      try {
        return JSON.parse(savedFilters);
      } catch (error) {
        console.error('Error parsing saved filters:', error);
      }
    }
    // Default filters
    return {
      priceLevel: [],
      rating: 0,
      distance: 25,
      openNow: false,
      neighborhoods: []
    };
  });

  /** Load cafes on mount */
  useEffect(() => {
    const loadAllCafes = async () => {
      try {
        setInitialLoading(true);
        const result = await fetchCafes();
        if (result.success) {
          setAllCafes(result.data);
          // Don't set searchResults directly - let updateResults handle it
        } else {
          toast({
            title: "Error loading cafes",
            description: result.error || "Failed to load cafes",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Error loading cafes:", err);
      } finally {
        setInitialLoading(false);
      }
    };

    loadAllCafes();
  }, []);

  /** Update results when allCafes changes */
  useEffect(() => {
    if (allCafes.length > 0) {
      // Inline the updateResults logic to avoid circular dependencies
      try {
        let results = allCafes;

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          results = results.filter(
            (cafe) =>
              cafe.name.toLowerCase().includes(query) ||
              (cafe.neighborhood &&
                cafe.neighborhood.toLowerCase().includes(query)) ||
              cafe.tags.some((tag) => tag.toLowerCase().includes(query))
          );
        }

        results = applyFilters(results);
        results = sortCafes(results);
        setSearchResults(results);
      } catch (error) {
        console.error("Error updating results:", error);
      }
    }
  }, [allCafes, filters, searchQuery, selectedTags, userLocation]);

  /** Save filters to localStorage whenever they change */
  useEffect(() => {
    localStorage.setItem('explore-filters', JSON.stringify(filters));
  }, [filters]);

  /** Save search query to localStorage */
  useEffect(() => {
    localStorage.setItem('explore-search-query', searchQuery);
  }, [searchQuery]);

  /** Save selected tags to localStorage */
  useEffect(() => {
    localStorage.setItem('explore-selected-tags', JSON.stringify(selectedTags));
  }, [selectedTags]);

  /** Sort logic - default to rating */
  const sortCafes = (cafes: Cafe[]): Cafe[] => {
    const sorted = [...cafes];
    
    // Default sort by rating (highest first)
    return sorted.sort(
      (a, b) =>
        (b.googleRating || b.rating || 0) - (a.googleRating || a.rating || 0)
    );
  };

  /** Filter logic */
  const applyFilters = (cafes: Cafe[]): Cafe[] => {
    let filtered = [...cafes];

    if (filters.priceLevel.length > 0) {
      filtered = filtered.filter(
        (cafe) =>
          cafe.priceLevel && filters.priceLevel.includes(cafe.priceLevel)
      );
    }

    if (filters.rating > 0) {
      filtered = filtered.filter(
        (cafe) =>
          (cafe.googleRating || cafe.rating || 0) >= filters.rating
      );
    }

    if (userLocation && filters.distance < 25) {
      filtered = filtered.filter((cafe) => {
        if (!cafe.latitude || !cafe.longitude) {
          return false; // Skip cafes without coordinates
        }
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          cafe.latitude,
          cafe.longitude
        );
        return distance <= filters.distance;
      });
    }

    if (filters.neighborhoods.length > 0) {
      filtered = filtered.filter((cafe) =>
        cafe.neighborhood && filters.neighborhoods.includes(cafe.neighborhood)
      );
    }

    if (filters.openNow) {
      // For now, we'll skip the openNow filter since we don't have real-time hours data
      // This could be implemented later with actual opening hours data
      console.log('Open now filter is active but not implemented yet');
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((cafe) =>
        cafe.tags.some((tag) => selectedTags.includes(tag))
      );
    }

    return filtered;
  };


  /** Debounced search */
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Results will be updated automatically by useEffect when searchQuery changes
  };

  /** Location request handler */
  const handleRequestLocation = async () => {
    setIsRequestingLocation(true);
    setLocationError("");
    
    try {
      console.log("Requesting location...");
      const position = await getCurrentLocation();
      console.log("Location received:", position.coords);
      
      const { latitude, longitude } = position.coords;
      setUserLocation({ latitude, longitude });
      
      // Update distance filter to a reasonable default when location is enabled
      setFilters(prev => ({
        ...prev,
        distance: prev.distance === 25 ? 10 : prev.distance
      }));
      
      toast({
        title: "Location Enabled",
        description: "You can now filter cafes by distance from your location.",
      });
    } catch (error: any) {
      console.error("Location error:", error);
      setLocationError(error.message);
      
      let errorMessage = "Please enable location access to filter by distance.";
      if (error.code === 1) {
        errorMessage = "Location access denied. Please allow location access in your browser settings.";
      } else if (error.code === 2) {
        errorMessage = "Location unavailable. Please check your internet connection.";
      } else if (error.code === 3) {
        errorMessage = "Location request timed out. Please try again.";
      }
      
      toast({
        title: "Location Access Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRequestingLocation(false);
    }
  };

  /** Filters + sort handlers */
  const handleFiltersChange = (newFilters: FilterState) => {
    try {
      console.log("Filter change:", newFilters);
      setFilters(newFilters);
      // updateResults() will be called automatically by useEffect
    } catch (error) {
      console.error("Error in handleFiltersChange:", error);
      toast({
        title: "Filter Error",
        description: "There was an error applying the filter. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSearchQuery("");
    setFilters({
      priceLevel: [],
      rating: 0,
      distance: userLocation ? 10 : 25,
      openNow: false,
      neighborhoods: []
    });
    // updateResults() will be called automatically by useEffect
  };


  // Calculate active filter count
  const activeFilterCount = selectedTags.length + 
    (filters.priceLevel.length > 0 ? 1 : 0) + 
    (filters.neighborhoods.length > 0 ? 1 : 0);

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">

        {/* Main Header */}
        <div className="sticky top-0 z-40 coffee-header p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold coffee-heading">Explore</h1>
            <div className="flex items-center gap-3">
              {/* Filter Icon with Badge */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className="relative"
                >
                  <Filter className="w-5 h-5" />
                  {activeFilterCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/80" />
            <Input
              placeholder="Search cafes..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 coffee-search-bar bg-white/90 border-white/20 text-foreground"
            />
          </div>
        </div>

        {/* Filters Panel */}
        <ExploreFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={clearFilters}
          isOpen={showFilters}
          onOpenChange={setShowFilters}
          userLocation={userLocation}
          onRequestLocation={handleRequestLocation}
          isRequestingLocation={isRequestingLocation}
        />

        <div className="p-4">
          {/* Popular tags */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Popular Tags</h3>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "secondary"}
                  className="coffee-tag"
                  onClick={() =>
                    setSelectedTags((prev) =>
                      prev.includes(tag)
                        ? prev.filter((t) => t !== tag)
                        : [...prev, tag]
                    )
                  }
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="cafes" className="text-sm">
                Cafes
              </TabsTrigger>
              <TabsTrigger value="posts" className="text-sm">
                Posts
              </TabsTrigger>
            </TabsList>

            {/* Cafes tab */}
            <TabsContent value="cafes" className="space-y-4 mt-4">
              {initialLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading cafes...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Cafes Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || selectedTags.length > 0
                      ? "Try adjusting your search terms or filters"
                      : "No cafes match your current filters"}
                  </p>
                  <Button onClick={clearFilters} variant="outline">
                    Clear All Filters
                  </Button>
                </div>
              ) : (
                searchResults.map((cafe) => (
                  <div
                    key={cafe.id}
                    className="coffee-card p-3 cursor-pointer coffee-interactive"
                    onClick={() => navigate(`/cafe/${cafe.placeId}`)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Hero image or emoji placeholder */}
                      {cafe.photos?.[0] ? (
                        <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden shadow-lg">
                          <img
                            src={cafe.photos[0]}
                            alt={cafe.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Failed to load cafe image:', cafe.name);
                            }}
                            onLoad={() => {
                              // Image loaded successfully
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-[#8b5a3c] to-[#6b4423] rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xl shadow-lg">
                          {getCafeEmoji(cafe.id || cafe.placeId)}
                        </div>
                      )}
                    
                    {/* Cafe info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate text-sm">
                        {cafe.name.length > 30 ? `${cafe.name.substring(0, 30)}...` : cafe.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {cafe.neighborhood || "Unknown"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 coffee-star" />
                      <span className="text-sm font-medium">
                        {(cafe.googleRating || cafe.rating || 0).toFixed(1)}
                      </span>
                    </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Posts tab */}
            <TabsContent value="posts" className="space-y-4 mt-4">
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
                    {searchQuery
                      ? "No posts match your search"
                      : "Search for posts to see results"}
                  </p>
                </div>
              ) : (
                postResults.map((post) => (
                  <Card key={post.id} className="shadow-sm border-0">
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
                              {post.cafe?.name || "Unknown Cafe"}
                            </h3>
                            <div className="flex items-center gap-1 ml-2">
                              <Star className="w-4 h-4 coffee-star" />
                              <span className="text-sm font-medium">{post.rating}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {post.cafe?.neighborhood || "Unknown"}
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

