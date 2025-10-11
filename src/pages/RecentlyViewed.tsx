import { useState, useEffect } from "react";
import { Clock, MapPin, Star, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigate } from "react-router-dom";

interface RecentCafe {
  id: string;
  placeId: string;
  name: string;
  neighborhood: string;
  rating?: number;
  userRating?: number;
  tags: string[];
  image: string;
  visitedAt: string;
  priceLevel?: number;
}

const STORAGE_KEY = "bean-scene-recently-viewed";
const MAX_RECENT_CAFES = 20;


// Utility functions for local storage
export function addToRecentlyViewed(cafe: Omit<RecentCafe, 'visitedAt'>) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const recent: RecentCafe[] = stored ? JSON.parse(stored) : [];
    
    // Remove if already exists
    const filtered = recent.filter(item => item.placeId !== cafe.placeId);
    
    // Add to beginning with current timestamp
    const updated = [
      { ...cafe, visitedAt: new Date().toISOString() },
      ...filtered
    ].slice(0, MAX_RECENT_CAFES);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save to recently viewed:', error);
  }
}

export function getRecentlyViewed(): RecentCafe[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load recently viewed:', error);
    return [];
  }
}

export function clearRecentlyViewed() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear recently viewed:', error);
  }
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
}

export default function RecentlyViewed() {
  const navigate = useNavigate();
  const [recentCafes, setRecentCafes] = useState<RecentCafe[]>([]);

  useEffect(() => {
    setRecentCafes(getRecentlyViewed());
  }, []);

  const handleClearAll = () => {
    clearRecentlyViewed();
    setRecentCafes([]);
  };

  const renderPriceLevel = (level?: number) => {
    if (!level) return null;
    return Array.from({ length: 4 }, (_, i) => (
      <span
        key={i}
        className={`text-xs ${
          i < level ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        $
      </span>
    ));
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Eye className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Recently Viewed</h1>
            </div>
            {recentCafes.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear All
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Cafes you've visited recently</p>
        </div>

        <div className="p-4">
          {recentCafes.length > 0 ? (
            <div className="space-y-4">
              {recentCafes.map((cafe) => (
                <Card 
                  key={cafe.placeId}
                  className="cursor-pointer hover:shadow-coffee transition-smooth shadow-warm border-0"
                  onClick={() => navigate(`/cafe/${cafe.placeId}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img
                        src={cafe.image}
                        alt={cafe.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">{cafe.name}</h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {getTimeAgo(cafe.visitedAt)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">{cafe.neighborhood}</span>
                          {cafe.priceLevel && (
                            <div className="flex items-center ml-auto">
                              {renderPriceLevel(cafe.priceLevel)}
                            </div>
                          )}
                        </div>

                        {(cafe.rating || cafe.userRating) && (
                          <div className="flex items-center gap-4 mb-3">
                            {cafe.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{cafe.rating}</span>
                                <span className="text-xs text-muted-foreground">Google</span>
                              </div>
                            )}
                            {cafe.userRating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-primary text-primary" />
                                <span className="text-sm font-medium">{cafe.userRating}</span>
                                <span className="text-xs text-muted-foreground">You</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {cafe.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs px-2 py-0 bg-accent/30 text-accent-foreground border-0"
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
          ) : (
            <div className="text-center py-20">
              <Eye className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No recent visits</h3>
              <p className="text-muted-foreground mb-6">
                Find the perfect cozy coffee spot
              </p>
              <Button 
                onClick={() => navigate('/explore')}
                className="coffee-gradient text-white shadow-coffee hover:shadow-glow transition-smooth"
              >
                Explore Cafes
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}