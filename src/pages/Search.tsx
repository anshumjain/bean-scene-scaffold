import { useState, useEffect, useCallback } from "react";
import { Search as SearchIcon, MapPin, Star, Navigation, Cloud, Sun, Filter, ChevronDown, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/Layout/AppLayout";
import { ExploreFilters, FilterState } from "@/components/Filters/ExploreFilters";
import { useNavigate } from "react-router-dom";
import { Cafe } from "@/services/types";
import { debounce, getCurrentLocation } from "@/services/utils";
import { calculateDistance } from "@/utils/distanceUtils";
import { toast } from "@/hooks/use-toast";
import { getCafeEmoji } from "@/utils/emojiPlaceholders";
import { getPopularTags } from "@/services/tagService";
import { useInfiniteCafes } from "@/hooks/useOptimizedCafes";
import { InfiniteCafeList } from "@/components/InfiniteCafeList";
import { isCafeOpenNow } from "@/utils/openingHours";

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function Search() {
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem('explore-search-query') || '';
  });
  const [showFilters, setShowFilters] = useState(false);

  const [popularTags, setPopularTags] = useState<string[]>([]);

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
        const parsed = JSON.parse(savedFilters);
        // Ensure selectedTags exists for backward compatibility
        return {
          priceLevel: parsed.priceLevel || [],
          rating: parsed.rating || 0,
          distance: parsed.distance || 25,
          openNow: parsed.openNow || false,
          neighborhoods: parsed.neighborhoods || [],
          selectedTags: parsed.selectedTags || []
        };
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
      neighborhoods: [],
      selectedTags: []
    };
  });

  /** Auto-detect location on page load */
  const autoDetectLocation = useCallback(async () => {
    try {
      // Check if we already have location stored
      const storedLocation = localStorage.getItem('user-location');
      if (storedLocation) {
        const parsedLocation = JSON.parse(storedLocation);
        // Check if location is not too old (less than 1 hour)
        if (parsedLocation.timestamp && Date.now() - parsedLocation.timestamp < 3600000) {
          setUserLocation({ latitude: parsedLocation.latitude, longitude: parsedLocation.longitude });
          console.log('Using stored location:', parsedLocation);
          
          // Update distance filter immediately when using stored location
          setFilters(prev => {
            console.log('Using stored location: updating distance filter from', prev.distance, 'to 5');
            return {
              ...prev,
              distance: 5 // Always set to 5 miles when location is available
            };
          });
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
      
      setUserLocation({ latitude, longitude });
      console.log('Auto-detected location:', { latitude, longitude });
      
      // Update distance filter to a reasonable default when location is auto-detected
      setFilters(prev => {
        console.log('Auto-detecting location: updating distance filter from', prev.distance, 'to 5');
        return {
          ...prev,
          distance: 5 // Always set to 5 miles when location is available
        };
      });
    } catch (error) {
      // Silently fail for auto-detection - user can still manually request location
      console.log('Auto-location detection failed:', error);
    }
  }, []);

  /** Load popular tags */
  const loadPopularTags = useCallback(async () => {
    try {
      console.log('Loading popular tags...');
      const tagStats = await getPopularTags(20); // Increased from 8 to 20
      const tags = tagStats.map(stat => stat.tag);
      
      console.log('Popular tags from database:', tagStats);
      console.log('Extracted tag names:', tags);
      
      // If no dynamic tags yet, use fallback tags
      if (tags.length === 0) {
        console.log('No tags from database, using fallback tags');
        setPopularTags([
          "student-friendly", "wifi", "bakery", "vegan", "latte-art", 
          "great-coffee", "always-space", "wfh-friendly", "quiet", "group-friendly",
          "instagram-worthy", "coffee-lover", "laptop-friendly", "cold-brew", 
          "artisanal", "cozy-vibes", "date-spot", "pet-friendly", "outdoor-seating", "study-spot"
        ]);
      } else {
        setPopularTags(tags);
      }
    } catch (error) {
      console.error('Error loading popular tags:', error);
      // Use fallback tags
      setPopularTags([
        "student-friendly", "wifi", "bakery", "vegan", "latte-art", 
        "great-coffee", "always-space", "wfh-friendly", "quiet", "group-friendly",
        "instagram-worthy", "coffee-lover", "laptop-friendly", "cold-brew", 
        "artisanal", "cozy-vibes", "date-spot", "pet-friendly", "outdoor-seating", "study-spot"
      ]);
    }
  }, []);

  // Use React Query for optimized cafe loading
  const {
    data: cafesData,
    isLoading: cafesLoading,
    error: cafesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteCafes({
    filters: {
      ...filters,
      query: searchQuery || undefined
    },
    userLocation
  });

  // Debug: Log when React Query refetches
  console.log('React Query filters:', {
    userLocation: userLocation ? `${userLocation.latitude}, ${userLocation.longitude}` : null,
    distance: filters.distance,
    selectedTags: filters.selectedTags.length,
    shouldUseLocationBased: userLocation && filters.distance < 25
  });

  // Flatten all pages of cafes into a single array
  const allCafes = cafesData?.pages.flatMap((page: any) => page.cafes) || [];
  
  // Apply client-side filters (like open now) that can't be done at database level
  const filteredCafes = allCafes.filter(cafe => {
    // Open now filter
    if (filters.openNow) {
      if (!cafe.openingHours || cafe.openingHours.length === 0) {
        return false; // No hours data, assume closed
      }
      
      try {
        // Use the isCafeOpenNow function
        return isCafeOpenNow(cafe.openingHours);
      } catch (error) {
        console.warn('Error checking if cafe is open:', error, 'for cafe:', cafe.name);
        return false; // If we can't parse hours, assume closed
      }
    }
    
    return true; // Include all cafes if open now filter is not active
  });
  
  const searchResults = filteredCafes; // For compatibility with existing code

  // Debug logging
  console.log('Search page state:', {
    cafesLoading,
    cafesError: cafesError?.message,
    cafesCount: allCafes.length,
    userLocation: userLocation ? `${userLocation.latitude}, ${userLocation.longitude}` : null,
    distanceFilter: filters.distance,
    hasActiveFilters: filters.selectedTags.length > 0 || filters.priceLevel.length > 0 || filters.rating > 0 || filters.neighborhoods.length > 0
  });

  // Debug: Show sample cafe locations
  if (allCafes.length > 0) {
    console.log('Sample cafe locations:', allCafes.slice(0, 10).map(cafe => ({
      name: cafe.name,
      location: `${cafe.latitude}, ${cafe.longitude}`,
      neighborhood: cafe.neighborhood,
      distance: userLocation ? calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        cafe.latitude,
        cafe.longitude
      ).toFixed(2) : 'N/A'
    })));
  }

  /** Load popular tags and auto-detect location on mount */
  useEffect(() => {
    loadPopularTags();
    autoDetectLocation(); // Auto-detect location on page load
  }, [autoDetectLocation, loadPopularTags]);

  // Refresh data when page becomes visible (e.g., returning from photo upload)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, React Query will handle refreshing automatically
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);


  // Results are now handled by React Query - no manual filtering needed

  /** Save filters to localStorage whenever they change */
  useEffect(() => {
    localStorage.setItem('explore-filters', JSON.stringify(filters));
  }, [filters]);

  /** Save search query to localStorage */
  useEffect(() => {
    localStorage.setItem('explore-search-query', searchQuery);
  }, [searchQuery]);


  // Sorting and filtering are now handled by OptimizedCafeService


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
      // Requesting location...
      const position = await getCurrentLocation();
      // Location received
      
      const { latitude, longitude } = position.coords;
      
      // Store location with timestamp
      const locationData = {
        latitude,
        longitude,
        timestamp: Date.now()
      };
      localStorage.setItem('user-location', JSON.stringify(locationData));
      
      setUserLocation({ latitude, longitude });
      
      // Update distance filter to a reasonable default when location is enabled
      setFilters(prev => {
        console.log('Manual location request: updating distance filter from', prev.distance, 'to 5');
        return {
          ...prev,
          distance: 5 // Always set to 5 miles when location is available
        };
      });
      
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
      setFilters(newFilters);
      // React Query will automatically refetch with new filters
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
    setSearchQuery("");
    setFilters({
      priceLevel: [],
      rating: 0,
      distance: userLocation ? 5 : 25,
      openNow: false,
      neighborhoods: [],
      selectedTags: []
    });
    // React Query will automatically refetch with cleared filters
  };


  // Calculate active filter count
  const activeFilterCount = filters.selectedTags.length + 
    (filters.priceLevel.length > 0 ? 1 : 0) + 
    (filters.neighborhoods.length > 0 ? 1 : 0) +
    (filters.rating > 0 ? 1 : 0) +
    (filters.distance < 25 ? 1 : 0) +
    (filters.openNow ? 1 : 0);

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">

        {/* Main Header */}
        <div className="sticky top-0 z-40 coffee-header p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold coffee-heading">Explore</h1>
            <div className="flex items-center gap-3">
              {/* Request Cafe Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/request-cafe')}
                className="text-white/90 hover:text-white hover:bg-white/20 text-sm px-3 py-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                Request Missing Cafe
              </Button>
              
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
              placeholder="Search cafes, neighborhoods, or #tags..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 coffee-search-bar bg-white/90 border-white/20 text-foreground"
            />
          </div>

          {/* Popular Tags - Horizontal Scrollable */}
          {popularTags.length > 0 && (
            <div className="mb-3">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {popularTags.slice(0, 10).map((tag) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTags = filters.selectedTags.includes(tag)
                        ? filters.selectedTags.filter(t => t !== tag)
                        : [...filters.selectedTags, tag];
                      setFilters(prev => ({ ...prev, selectedTags: newTags }));
                    }}
                    className={`flex-shrink-0 text-xs h-8 px-4 rounded-full transition-all duration-300 font-medium ${
                      filters.selectedTags.includes(tag) 
                        ? "bg-gradient-to-r from-[#8b5a3c] to-[#6b4423] text-white border-[#8b5a3c] shadow-lg transform scale-105 hover:scale-110 ring-2 ring-[#8b5a3c]/30" 
                        : "bg-gradient-to-r from-white/90 to-white/70 text-[#8b5a3c] border-white/50 hover:from-white hover:to-white/90 hover:border-[#8b5a3c]/60 hover:scale-102 shadow-md hover:shadow-lg backdrop-blur-sm"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {filters.selectedTags.includes(tag) ? (
                        <span className="text-sm">✨</span>
                      ) : (
                        <span className="text-xs opacity-60">#</span>
                      )}
                      {tag}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}
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
          popularTags={popularTags}
        />

        <div className="p-4">

          {/* Cafes Results */}
          <div className="space-y-4 mt-4">
              {cafesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading cafes...</p>
                </div>
              ) : allCafes.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Cafes Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {filters.selectedTags.length > 0 
                      ? "We're still growing! Help by tagging the vibe to your favorite cafe or checking into your nearest cafe."
                      : searchQuery || activeFilterCount > 0
                        ? "Try adjusting your search terms or filters"
                        : "No cafes match your current filters"}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={clearFilters} variant="outline">
                      Clear All Filters
                    </Button>
                    {filters.selectedTags.length > 0 && (
                      <Button onClick={() => navigate('/checkin')} className="coffee-gradient text-white">
                        Check In & Add Tags
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <InfiniteCafeList
                  cafes={allCafes}
                  loading={cafesLoading}
                  loadingMore={isFetchingNextPage}
                  hasMore={!!hasNextPage}
                  onLoadMore={() => fetchNextPage()}
                  error={cafesError?.message}
                  onCafeClick={(cafe) => navigate(`/cafe/${cafe.placeId}`)}
                />
              )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

