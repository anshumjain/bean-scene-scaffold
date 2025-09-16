import { MapPin, Phone, Clock, Star, DollarSign, Globe, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface CafeHeaderProps {
  cafe: {
    name: string;
    address: string;
    neighborhood: string;
    rating: number;
    userRating?: number;
    hours: string;
    phone?: string;
    website?: string;
    priceLevel: number;
    topTags: string[];
    reviewSnippet: string;
    isOpen?: boolean;
    heroImage?: string;
  };
  loading?: boolean;
}

export function CafeHeader({ cafe, loading = false }: CafeHeaderProps) {
  const renderPriceLevel = (level: number) => {
    return Array.from({ length: 4 }, (_, i) => (
      <DollarSign
        key={i}
        className={`w-3 h-3 ${
          i < level ? "text-primary fill-primary" : "text-muted-foreground"
        }`}
      />
    ));
  };

  const getOpenStatus = (hours: string, isOpen?: boolean) => {
    if (isOpen !== undefined) {
      return isOpen ? "Open" : "Closed";
    }
    // Parse hours for status (mock logic)
    return Math.random() > 0.3 ? "Open" : "Closed";
  };

  const openStatus = getOpenStatus(cafe.hours, cafe.isOpen);
  const isCurrentlyOpen = openStatus === "Open";

  if (loading) {
    return (
      <div className="bg-card shadow-warm border-b border-border p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="flex gap-4">
            <div className="h-4 bg-muted rounded w-16"></div>
            <div className="h-4 bg-muted rounded w-16"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Image */}
      {cafe.heroImage ? (
        <div className="relative h-48 -mx-6 -mt-6">
          <img
            src={cafe.heroImage}
            alt={cafe.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
            <h1 className="text-2xl font-bold text-white mb-1">{cafe.name}</h1>
            <div className="flex items-center gap-2 text-white/90">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{cafe.neighborhood}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative h-32 -mx-6 -mt-6 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-1">{cafe.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground justify-center">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{cafe.neighborhood}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Address and Contact */}
        <Card className="p-4 bg-muted/30 border-0">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
              <div className="flex-1">
                <p className="text-sm font-medium">{cafe.address}</p>
                <p className="text-xs text-muted-foreground">{cafe.neighborhood}, Houston</p>
              </div>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-primary">
                <Navigation className="w-4 h-4 mr-1" />
                Directions
              </Button>
            </div>

            {cafe.phone && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{cafe.phone}</span>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-primary ml-auto">
                  Call
                </Button>
              </div>
            )}

            {cafe.website && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm truncate flex-1">{cafe.website}</span>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-primary">
                  Visit
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Hours and Status */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{cafe.hours}</span>
          </div>
          <Badge 
            variant={isCurrentlyOpen ? "default" : "secondary"}
            className={isCurrentlyOpen ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {openStatus}
          </Badge>
        </div>

        {/* Ratings and Price */}
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg shadow-warm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{cafe.rating}</span>
              <span className="text-muted-foreground text-sm">Google</span>
            </div>
            {cafe.userRating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="font-semibold">{cafe.userRating}</span>
                <span className="text-muted-foreground text-sm">Bean Scene</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {renderPriceLevel(cafe.priceLevel)}
          </div>
        </div>

        {/* Top Tags */}
        <div className="flex flex-wrap gap-2">
          {cafe.topTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-primary/10 text-primary border-0"
            >
              #{tag}
            </Badge>
          ))}
        </div>

        {/* Review Snippet */}
        <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary/30">
          <p className="text-sm italic text-muted-foreground">
            "{cafe.reviewSnippet}"
          </p>
        </div>

        {/* Action Button */}
        <Button className="w-full coffee-gradient text-white shadow-coffee hover:shadow-glow transition-smooth">
          Check In Here
        </Button>
      </div>
    </div>
  );
}