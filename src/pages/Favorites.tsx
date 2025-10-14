import { useState, useEffect } from "react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { getFavorites, removeFavorite } from "@/services/favoritesService";
import { Heart, MapPin, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function Favorites() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const result = await getFavorites();
      if (result.success) {
        setFavorites(result.data);
      } else {
        console.error('Failed to load favorites:', result.error);
        toast({
          title: "Error",
          description: "Failed to load favorites. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast({
        title: "Error",
        description: "Failed to load favorites. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemoveFavorite = async (favorite: any) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${favorite.cafe?.name || 'this cafe'}" from your favorites?`
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      const result = await removeFavorite(favorite.cafe_id);
      if (result.success) {
        setFavorites(prev => prev.filter(f => f.id !== favorite.id));
        toast({
          title: "Removed from favorites",
          description: "Cafe removed from your favorites.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to remove from favorites.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove from favorites.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Favorites</h1>
              <p className="text-sm text-muted-foreground">Your saved cafes</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadFavorites}
              disabled={loading}
              className="p-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Heart className="w-8 h-8 animate-pulse text-primary mb-4" />
              <p className="text-muted-foreground">Loading favorites...</p>
            </div>
          ) : favorites.length > 0 ? (
            <div className="space-y-4">
              {favorites.map((favorite) => (
                <Card key={favorite.id} className="overflow-hidden shadow-coffee border-0 bg-card/80 backdrop-blur-sm">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{favorite.cafe?.name || 'Unknown Cafe'}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {favorite.cafe?.neighborhood || ''}
                        </p>
                        {favorite.cafe?.address && (
                          <p className="text-xs text-muted-foreground mt-1">{favorite.cafe.address}</p>
                        )}
                        {favorite.cafe?.rating && (
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{favorite.cafe.rating}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/cafe/${favorite.cafe?.place_id || favorite.cafe_id}`)}
                        >
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Remove from favorites"
                          onClick={() => handleRemoveFavorite(favorite)}
                        >
                          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-4">
                Start exploring cafes and add them to your favorites!
              </p>
              <Button 
                onClick={() => navigate('/explore')}
                className="coffee-gradient text-white"
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
