import { MapPin, Phone, Clock, Star, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CafeHeaderProps {
  cafe: {
    name: string;
    address: string;
    neighborhood: string;
    rating: number;
    userRating: number;
    hours: string;
    phone?: string;
    priceLevel: number;
    topTags: string[];
    reviewSnippet: string;
  };
}

export function CafeHeader({ cafe }: CafeHeaderProps) {
  const renderPriceLevel = (level: number) => {
    return Array.from({ length: 4 }, (_, i) => (
      <DollarSign
        key={i}
        className={`w-3 h-3 ${
          i < level ? "text-primary fill-primary" : "text-muted"
        }`}
      />
    ));
  };

  return (
    <div className="bg-card shadow-warm border-b border-border p-6">
      <div className="space-y-4">
        {/* Name and Basic Info */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{cafe.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{cafe.address}</span>
          </div>
          <p className="text-sm text-primary font-medium">{cafe.neighborhood}</p>
        </div>

        {/* Ratings and Price */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{cafe.rating}</span>
            <span className="text-muted-foreground text-sm">Google</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="font-semibold">{cafe.userRating}</span>
            <span className="text-muted-foreground text-sm">Bean Scene</span>
          </div>
          <div className="flex items-center gap-1">
            {renderPriceLevel(cafe.priceLevel)}
          </div>
        </div>

        {/* Hours and Phone */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{cafe.hours}</span>
          </div>
          {cafe.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{cafe.phone}</span>
            </div>
          )}
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
        <div className="bg-muted/50 rounded-lg p-3">
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