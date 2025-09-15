import { Heart, MapPin, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigate } from "react-router-dom";

const favoriteCafes = [
  {
    id: "1",
    name: "Blacksmith Coffee",
    neighborhood: "Montrose", 
    rating: 4.8,
    userRating: 5.0,
    tags: ["latte-art", "cozy-vibes", "laptop-friendly"],
    image: "/placeholder.svg",
    lastVisit: "2 days ago"
  },
  {
    id: "2",
    name: "Greenway Coffee", 
    neighborhood: "Heights",
    rating: 4.6,
    userRating: 4.5,
    tags: ["third-wave", "cold-brew", "rooftop"],
    image: "/placeholder.svg", 
    lastVisit: "1 week ago"
  }
];

export default function Favorites() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-6 h-6 text-primary fill-primary" />
            <h1 className="text-2xl font-bold">Favorites</h1>
          </div>
          <p className="text-sm text-muted-foreground">Your favorite coffee spots</p>
        </div>

        <div className="p-4">
          {favoriteCafes.length > 0 ? (
            <div className="space-y-4">
              {favoriteCafes.map((cafe) => (
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
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">{cafe.name}</h3>
                          <Heart className="w-5 h-5 text-primary fill-primary flex-shrink-0" />
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{cafe.neighborhood}</span>
                        </div>

                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{cafe.rating}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-primary text-primary" />
                            <span className="text-sm font-medium">{cafe.userRating}</span>
                            <span className="text-xs text-muted-foreground">You</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {cafe.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs px-2 py-0 bg-accent/30 text-accent-foreground border-0"
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Last visit: {cafe.lastVisit}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-6">
                Start exploring cafes and add them to your favorites!
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