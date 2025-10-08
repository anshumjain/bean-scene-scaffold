import { MapPin, Phone, Clock, Star, DollarSign, Globe, Navigation, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CafePhotoUpload } from "@/components/Cafe/CafePhotoUpload"; // Correct named import
import { ParkingInfoComponent } from "@/components/Cafe/ParkingInfo";
import { WeatherWidget } from "@/components/Cafe/WeatherWidget";
import { useToast } from "@/hooks/use-toast";
import { getCafeEmoji } from "@/utils/emojiPlaceholders";

interface CafeHeaderProps {
  cafe: {
    id?: string; // Add cafe ID for photo uploads
    placeId?: string; // Add place ID for parking info
    name: string;
    address: string;
    neighborhood: string;
    rating: number;
    userRating?: number;
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
}

export function CafeHeader({ cafe, loading = false, onPhotoAdded }: CafeHeaderProps) {
  const { toast } = useToast();

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

  const handleShare = async () => {
    const shareData = {
      title: cafe.name,
      text: `Check out ${cafe.name} in ${cafe.neighborhood}!`,
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link copied!",
          description: "Cafe link copied to clipboard"
        });
      }
    } catch (error) {
      // Final fallback - copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link copied!",
          description: "Cafe link copied to clipboard"
        });
      } catch (clipboardError) {
        toast({
          title: "Share failed",
          description: "Unable to share or copy link",
          variant: "destructive"
        });
      }
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

  const getOpenStatus = (hours: string, isOpen?: boolean) => {
    if (isOpen !== undefined) {
      return isOpen ? "Open" : "Closed";
    }
    
    // Parse hours string to determine if currently open
    if (!hours || hours === "Hours not available") {
      return "Hours not available";
    }
    
    try {
      // Extract time from hours string (e.g., "Monday: 7:00 AM – 4:00 PM")
      const timeMatch = hours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*–\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timeMatch) {
        return "Hours not available";
      }
      
      const [, openHour, openMin, openPeriod, closeHour, closeMin, closePeriod] = timeMatch;
      
      // Convert to 24-hour format
      let open24 = parseInt(openHour);
      let close24 = parseInt(closeHour);
      
      if (openPeriod.toUpperCase() === 'PM' && open24 !== 12) open24 += 12;
      if (openPeriod.toUpperCase() === 'AM' && open24 === 12) open24 = 0;
      
      if (closePeriod.toUpperCase() === 'PM' && close24 !== 12) close24 += 12;
      if (closePeriod.toUpperCase() === 'AM' && close24 === 12) close24 = 0;
      
      // Get current time
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentTime = currentHour * 60 + currentMin;
      
      const openTime = open24 * 60 + parseInt(openMin);
      const closeTime = close24 * 60 + parseInt(closeMin);
      
      // Check if currently open
      return (currentTime >= openTime && currentTime <= closeTime) ? "Open" : "Closed";
    } catch (error) {
      return "Hours not available";
    }
  };

  // Get current day's hours if available, otherwise use the passed hours
  const currentDayHours = cafe.hoursArray ? getCurrentDayHours(cafe.hoursArray) : null;
  const hoursToUse = currentDayHours || cafe.hours;
  
  const openStatus = getOpenStatus(hoursToUse, cafe.isOpen);
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
      {/* Hero Image or Photo Upload */}
      {cafe.heroImage ? (
        <div className="relative h-48 -mx-6 -mt-6">
          <img
            src={cafe.heroImage}
            alt={cafe.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Failed to load cafe hero image:', cafe.name, cafe.heroImage);
              console.error('Hero image error:', e);
            }}
            onLoad={() => {
              console.log('Successfully loaded cafe hero image:', cafe.name, cafe.heroImage);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
            <h1 className="text-2xl font-bold text-white mb-1">{cafe.name}</h1>
            <div className="flex items-center gap-2 text-white/90">
              <span className="text-sm">{cafe.neighborhood}</span>
            </div>
          </div>
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

      <div className="space-y-4">
        {/* Address and Contact */}
        <Card className="p-4 bg-muted/30 border-0">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
              <div className="flex-1">
                <p className="text-sm font-medium">{cafe.address}</p>
                <p className="text-sm font-medium">{cafe.neighborhood}, Houston</p>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 px-2 text-primary"
                onClick={handleDirections}
              >
                <Navigation className="w-4 h-4 mr-1" />
                Directions
              </Button>
            </div>

            {cafe.phone && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{cafe.phone}</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 px-2 text-primary ml-auto"
                  onClick={handleCall}
                >
                  Call
                </Button>
              </div>
            )}

            {cafe.website && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm truncate flex-1">{cafe.website}</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 px-2 text-primary"
                  onClick={handleVisitWebsite}
                >
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
            <span className="text-sm">{hoursToUse}</span>
          </div>
          <Badge 
            variant={isCurrentlyOpen ? "default" : "secondary"}
            className={isCurrentlyOpen ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {openStatus}
          </Badge>
        </div>

        {/* Parking Info */}
        {cafe.placeId && (
          <ParkingInfoComponent 
            placeId={cafe.placeId} 
            cafeName={cafe.name}
            parkingInfo={cafe.parkingInfo}
          />
        )}

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

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button className="flex-1 coffee-gradient text-white shadow-coffee hover:shadow-glow transition-smooth">
            Check In Here
          </Button>
        </div>
      </div>
    </div>
  );
}