import { MapPin, Phone, Clock, Star, DollarSign, Globe, Navigation, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CafePhotoUpload } from "@/components/Cafe/CafePhotoUpload"; // Correct named import
import { ParkingInfoComponent } from "@/components/Cafe/ParkingInfo";
import { WeatherWidget } from "@/components/Cafe/WeatherWidget";
import { GoogleAttribution, GoogleAttributionOverlay, GoogleAttributionInline } from "@/components/Attribution/GoogleAttribution";
import { useToast } from "@/hooks/use-toast";
import { getCafeEmoji } from "@/utils/emojiPlaceholders";
import { CafeTagsSection } from "@/components/Cafe/CafeTagsSection";
import { useNavigate } from "react-router-dom";
import { getOpeningStatus } from "@/utils/openingHours";

interface CafeHeaderProps {
  cafe: {
    id?: string; // Add cafe ID for photo uploads
    placeId?: string; // Add place ID for parking info
    name: string;
    address: string;
    neighborhood: string;
    rating: number;
    userRating?: number;
    googleRating?: number;
    photoSource?: 'google' | 'user' | null;
    hours: string;
    hoursArray?: string[]; // Add full hours array for current day logic
    phone?: string;
    website?: string;
    priceLevel: number;
    topTags: string[];
    reviewSnippet: string;
    isOpen?: boolean;
    heroImage?: string;
    parkingInfo?: string; // Add parking info from database
  };
  loading?: boolean;
  onPhotoAdded?: (photoUrl: string) => void; // Add callback for photo updates
  tagRefreshTrigger?: number; // Add tag refresh trigger
}

export function CafeHeader({ cafe, loading = false, onPhotoAdded, tagRefreshTrigger = 0 }: CafeHeaderProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const handleDirections = () => {
    const address = encodeURIComponent(`${cafe.address}, ${cafe.neighborhood}, Houston, TX`);
    const mapsUrl = `https://maps.google.com/maps?q=${address}`;
    window.open(mapsUrl, '_blank');
  };

  const handleCall = () => {
    if (cafe.phone) {
      window.location.href = `tel:${cafe.phone}`;
    }
  };

  const handleVisitWebsite = () => {
    if (cafe.website) {
      window.open(cafe.website, '_blank');
    }
  };


  const getCurrentDayHours = (hoursArray: string[]): string | null => {
    if (!hoursArray || hoursArray.length === 0) {
      return null;
    }
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Monday"
    
    // Find hours for current day
    const todayHours = hoursArray.find(hour => 
      hour.toLowerCase().includes(currentDay.toLowerCase())
    );
    
    return todayHours || null;
  };

  const getOpenStatus = (hours: string, hoursArray?: string[]) => {
    // Use the proper opening hours utility
    if (hoursArray && hoursArray.length > 0) {
      const { status } = getOpeningStatus(hoursArray);
      return status;
    }
    
    // Fallback for when we only have the hours string
    if (!hours || hours === "Hours not available") {
      return "Hours not available";
    }
    
    // If we have hours but no array, show the hours string
    return hours;
  };

  // Get current day's hours if available, otherwise use the passed hours
  const currentDayHours = cafe.hoursArray ? getCurrentDayHours(cafe.hoursArray) : null;
  const hoursToUse = currentDayHours || cafe.hours;
  
  const openStatus = getOpenStatus(hoursToUse, cafe.hoursArray);
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
    <div className="space-y-4">
      {/* Hero Image or Photo Upload */}
      {cafe.heroImage ? (
        <div className="relative h-48 -mx-6 -mt-6">
          <img
            src={cafe.heroImage}
            alt={cafe.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Failed to load cafe hero image:', cafe.name, cafe.heroImage);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
            <h1 className="text-2xl font-bold text-white mb-1">{cafe.name}</h1>
            <div className="flex items-center gap-2 text-white/90">
              <span className="text-sm">{cafe.neighborhood}</span>
            </div>
          </div>
          {/* Ratings Overlay */}
          <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 space-y-2">
            {/* Google Rating - Only show if available */}
            {cafe.googleRating && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-white text-lg">{cafe.googleRating}</span>
                <GoogleAttributionInline
                  type="rating"
                  sourceUrl={cafe.placeId ? `https://www.google.com/maps/search/?api=1&query_place_id=${cafe.placeId}` : undefined}
                />
              </div>
            )}
            {/* BeanScene Rating - Only show if available */}
            {cafe.userRating && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-white text-white" />
                <span className="font-bold text-white text-lg">{cafe.userRating}</span>
                <span className="text-xs text-white font-medium">Bean Scene</span>
              </div>
            )}
            {/* Fallback to generic rating if neither specific rating is available */}
            {!cafe.googleRating && !cafe.userRating && cafe.rating && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-white text-lg">{cafe.rating}</span>
                <span className="text-xs text-white/70">Rating</span>
              </div>
            )}
          </div>
          {/* Google Attribution for Photos */}
          {cafe.photoSource === 'google' && (
            <GoogleAttributionOverlay 
              type="photo" 
              sourceUrl={cafe.placeId ? `https://www.google.com/maps/search/?api=1&query_place_id=${cafe.placeId}` : undefined}
            />
          )}
        </div>
      ) : cafe.id ? (
        // Show photo upload component if no hero image and we have cafe ID
        <div className="-mx-6 -mt-6">
          <CafePhotoUpload 
            cafeId={cafe.id}
            placeId={cafe.placeId}
            cafeName={cafe.name}
            onPhotoAdded={onPhotoAdded}
          />
          {/* Cafe name and neighborhood below upload component */}
          <div className="p-6 pb-0">
            <h1 className="text-2xl font-bold text-foreground mb-1">{cafe.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{cafe.neighborhood}</span>
            </div>
          </div>
        </div>
      ) : (
        // Fallback emoji placeholder if no ID (shouldn't happen in practice)
        <div className="relative h-48 -mx-6 -mt-6 bg-gradient-to-br from-[#8b5a3c] to-[#6b4423] flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-8xl mb-4">{getCafeEmoji(cafe.id || cafe.placeId || cafe.name)}</div>
            <h1 className="text-2xl font-bold mb-1">{cafe.name}</h1>
            <div className="flex items-center gap-2 text-white/90 justify-center">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{cafe.neighborhood}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tags Section - Between hero image and address */}
      {cafe.id && (
        <CafeTagsSection 
          cafeId={cafe.id} 
          cafeName={cafe.name}
          refreshTrigger={tagRefreshTrigger}
        />
      )}

      {/* Compact Info Section */}
      <Card className="p-4 bg-muted/30 border-0">
        <div className="space-y-3">
          {/* Address Row */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{cafe.address}</p>
              <p className="text-sm text-muted-foreground">{cafe.neighborhood}</p>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 px-2 text-primary flex-shrink-0"
              onClick={handleDirections}
            >
              <Navigation className="w-4 h-4 mr-1" />
              Directions
            </Button>
          </div>

          {/* Hours and Status Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate">{hoursToUse}</span>
            </div>
            <Badge 
              variant={isCurrentlyOpen ? "default" : "secondary"}
              className={`flex-shrink-0 ${isCurrentlyOpen ? "bg-green-600 hover:bg-green-700" : ""}`}
            >
              {openStatus}
            </Badge>
          </div>

          {/* Top Tags Row */}
          {cafe.topTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {cafe.topTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-primary/10 text-primary border-0 text-xs"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
          <Button 
            className="flex-1 coffee-gradient text-white shadow-coffee hover:shadow-glow transition-smooth"
            onClick={() => navigate('/share/unified', { 
              state: { 
                prefilledCafe: {
                  id: cafe.id, 
                  name: cafe.name,
                  placeId: cafe.placeId,
                  address: cafe.address,
                  neighborhood: cafe.neighborhood
                }
              } 
            })}
          >
            <Camera className="w-4 h-4 mr-2" />
            Check In Here
          </Button>
        </div>
    </div>
  );
}