import { useState, useEffect, useCallback } from "react";
import { Search as SearchIcon, MapPin, Star, Navigation } from "lucide-react";
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
import { debounce } from "@/services/utils";
import { toast } from "@/hooks/use-toast";

type SortOption = "rating" | "distance" | "price" | "name";

const popularTags = [
  "latte-art", "cozy-vibes", "laptop-friendly", "third-wave",
  "cold-brew", "pastries", "rooftop", "instagram-worthy",
  "pet-friendly", "outdoor-seating"
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

  const [allCafes, setAllCafes] = useState<Cafe[]>([]);
  const [searchResults, setSearchResults] = useState<Cafe[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("rating");

  // Location
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState("");

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    priceLevel: [],
    rating: 0,
    distance: 25,
    openNow: false,
    neighborhoods: [],
    sortBy: 'rating',
    sortOrder: 'desc'
  });

  /** Load cafes on mount */
  useEffect(() => {
    const loadAllCafes = async () => {
      try {
        setInitialLoading(true);
        const result = await fetchCafes();
        if (result.success) {
          setAllCafes(result.data);
          setSearchResults(result.data);
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

  /** Sort logic */
  const sortCafes = (cafes: Cafe[], option: SortOption): Cafe[] => {
    const sorted = [...cafes];
    switch (option) {
      case "rating":
        return sorted.sort(
          (a, b) =>
            (b.googleRating || b.rating || 0) -
            (a.googleRating || a.rating || 0)
        );
      case "distance":
        if (userLocation) {
          return sorted.sort(
            (a, b) =>
              ((a as any).distance || 0) - ((b as any).distance || 0)
          );
        }
        return sorted;
      case "price":
        return sorted.sort(
          (a, b) => (a.priceLevel || 0) - (b.priceLevel || 0)
        );
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
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
      filtered = filtered.filter(
        (cafe) => !(cafe as any).distance || (cafe as any).distance <= filters.distance
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((cafe) =>
        cafe.tags.some((tag) => selectedTags.includes(tag))
      );
    }

    return filtered;
  };

  /** Update results */
  const updateResults = useCallback(
    (cafesToUpdate = allCafes) => {
      let results = cafesToUpdate;

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
      results = sortCafes(results, sortBy);

      setSearchResults(results);
    },
    [allCafes, filters, searchQuery, selectedTags, sortBy, userLocation]
  );

  /** Debounced search */
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedUpdate();
  };
  const debouncedUpdate = useCallback(debounce(() => updateResults(), 300), [updateResults]);

  /** Filters + sort handlers */
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    updateResults();
  };

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
      neighborhoods: [],
      sortBy: 'rating',
      sortOrder: 'desc'
    });
    setSortBy("rating");
    updateResults();
  };

  /** Keep results synced */
  useEffect(() => {
    updateResults();
  }, [filters, selectedTags, sortBy]);

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
            />
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search cafes..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-muted/50 border-0"
            />
          </div>

          {/* Sort + count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="w-40 h-8 text-sm border rounded px-2 bg-background"
              >
                <option value="rating">Rating</option>
                <option value="name">Name</option>
                <option value="price">Price</option>
                {userLocation && <option value="distance">Distance</option>}
              </select>
              <span className="text-sm text-muted-foreground">
                {searchResults.length} cafe{searchResults.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Popular tags */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Popular Tags</h3>
            <div className="flex flex-wrap gap-2">
              {popularTags.slice(0, 8).map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer transition"
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
              <TabsTrigger value="cafes">
                Cafes {searchResults.length > 0 && `(${searchResults.length})`}
              </TabsTrigger>
              <TabsTrigger value="posts">
                Posts {postResults.length > 0 && `(${postResults.length})`}
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
                  <Card
                    key={cafe.id}
                    className="cursor-pointer hover:shadow-md transition"
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
                              {cafe.neighborhood || "Unknown"}
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
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
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
