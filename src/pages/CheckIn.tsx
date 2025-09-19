import { useState, useEffect } from "react";
import { Camera, MapPin, Star, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { fetchNearbyCafes } from "@/services/cafeService";
import { submitCheckin } from "@/services/postService";
import { getCurrentLocation, formatDistance } from "@/services/utils";
import type { Cafe } from "@/services/types";

const predefinedTags = [
  "latte-art", "cozy-vibes", "laptop-friendly", "third-wave", "cold-brew",
  "pastries", "rooftop", "instagram-worthy", "busy", "quiet", "date-spot",
  "pet-friendly", "outdoor-seating", "wifi", "study-spot"
];

export default function CheckIn() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCafe, setSelectedCafe] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [review, setReview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [nearbyCafes, setNearbyCafes] = useState<Cafe[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isLoadingCafes, setIsLoadingCafes] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleCustomTag = () => {
    if (customTag && !selectedTags.includes(customTag)) {
      setSelectedTags(prev => [...prev, customTag]);
      setCustomTag("");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  useEffect(() => {
    const requestLocationAndFetchCafes = async () => {
      try {
        setIsLoadingLocation(true);
        const position = await getCurrentLocation();
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        setIsLoadingCafes(true);
        const result = await fetchNearbyCafes(latitude, longitude, 2);
        
        if (result.success && result.data) {
          setNearbyCafes(result.data);
        } else {
          setLocationError("Failed to load nearby cafes");
        }
      } catch (error) {
        setLocationError("Enable location to find what's brewing nearby");
      } finally {
        setIsLoadingLocation(false);
        setIsLoadingCafes(false);
      }
    };

    requestLocationAndFetchCafes();
  }, []);

  const calculateDistance = (cafe: Cafe): string => {
    if (!userLocation) return "";
    const lat1 = userLocation.lat;
    const lng1 = userLocation.lng;
    const lat2 = parseFloat(cafe.latitude.toString());
    const lng2 = parseFloat(cafe.longitude.toString());
    
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return formatDistance(distance);
  };

  const handleSubmit = async () => {
    if (!selectedCafe || !rating || !imageFile) return;
    
    try {
      setIsSubmitting(true);
      
      const selectedCafeData = nearbyCafes.find(cafe => cafe.id === selectedCafe);
      if (!selectedCafeData) {
        toast({
          title: "Error",
          description: "Selected cafe not found",
          variant: "destructive"
        });
        return;
      }

      const result = await submitCheckin({
        cafeId: selectedCafe,
        placeId: selectedCafeData.placeId,
        rating,
        tags: selectedTags,
        review: review,
        imageFile
      });

      if (result.success) {
        toast({
          title: "Check-in shared!",
          description: "Your cafe experience has been posted"
        });
        navigate('/explore');
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to share check-in",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to share check-in",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <h1 className="text-2xl font-bold">Check In</h1>
          <p className="text-sm text-muted-foreground">Share your cafe experience</p>
        </div>

        <div className="p-4 space-y-6">
          {/* Select Cafe */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Select Cafe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingLocation ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Getting your location...</span>
                </div>
              ) : locationError ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{locationError}</p>
                </div>
              ) : isLoadingCafes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Finding nearby cafes...</span>
                </div>
              ) : nearbyCafes.length > 0 ? (
                nearbyCafes.map((cafe) => (
                  <div
                    key={cafe.id}
                    onClick={() => setSelectedCafe(cafe.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-smooth ${
                      selectedCafe === cafe.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{cafe.name}</h3>
                        <p className="text-sm text-muted-foreground">{cafe.neighborhood}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{calculateDistance(cafe)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No nearby cafes found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Add Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                {imageFile ? (
                  <div className="space-y-2">
                    <p className="text-sm text-foreground">{imageFile.name}</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setImageFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Tap to add photo</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rating */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Your Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-smooth hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Add Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-primary/20 text-primary border-0 cursor-pointer"
                      onClick={() => handleTagToggle(tag)}
                    >
                      #{tag}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Predefined Tags */}
              <div className="flex flex-wrap gap-2">
                {predefinedTags.filter(tag => !selectedTags.includes(tag)).slice(0, 10).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-smooth"
                    onClick={() => handleTagToggle(tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>

              {/* Custom Tag Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Create custom tag..."
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomTag()}
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={handleCustomTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Review */}
          <Card>
            <CardHeader>
              <CardTitle>Write a Review</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Share your thoughts about this cafe..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedCafe || !rating || !imageFile || isSubmitting}
            className="w-full coffee-gradient text-white shadow-coffee hover:shadow-glow transition-smooth"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Sharing...
              </>
            ) : (
              "Share Check-In"
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}