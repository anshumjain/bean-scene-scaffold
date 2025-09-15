import { useState } from "react";
import { Search as SearchIcon, Filter, MapPin, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigate } from "react-router-dom";

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

  const clearFilters = () => {
    setSelectedNeighborhoods([]);
    setSelectedTags([]);
    setSearchQuery("");
  };

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
              onChange={(e) => setSearchQuery(e.target.value)}
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
              {mockCafes.map((cafe) => (
                <Card 
                  key={cafe.id}
                  className="cursor-pointer hover:shadow-coffee transition-smooth shadow-coffee border-0"
                  onClick={() => navigate(`/cafe/${cafe.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img
                        src={cafe.image}
                        alt={cafe.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold truncate">{cafe.name}</h3>
                          <div className="flex items-center gap-1 ml-2">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{cafe.rating}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{cafe.neighborhood}</span>
                          <span className="text-xs text-muted-foreground">• {cafe.distance}</span>
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
              ))}
            </TabsContent>

            <TabsContent value="posts" className="space-y-4 mt-4">
              <div className="text-center py-12">
                <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Post search coming soon! For now, explore cafes and check out their individual feeds.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}