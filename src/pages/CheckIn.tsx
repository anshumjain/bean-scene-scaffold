import { useState, useEffect } from "react";
import { Camera, MapPin, Star, Plus, X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { fetchCafes } from "@/services/cafeService";
import { submitCheckin } from "@/services/postService";
import { getCurrentLocation } from "@/services/utils";
import { getNearbyCafes, formatDistance } from "@/utils/distanceUtils";
import { useGoogleAnalytics } from "@/hooks/use-google-analytics";
import type { Cafe } from "@/services/types";

const predefinedTags = [
  "latte-art", "cozy-vibes", "laptop-friendly", "third-wave", "cold-brew",
  "pastries", "rooftop", "instagram-worthy", "busy", "quiet", "date-spot",
  "pet-friendly", "outdoor-seating", "wifi", "study-spot"
];

export default function CheckIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { trackCheckIn, trackEngagement, trackError } = useGoogleAnalytics();
  const [selectedCafe, setSelectedCafe] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [review, setReview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [nearbyCafes, setNearbyCafes] = useState<(Cafe & { distance: number })[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingCafes, setIsLoadingCafes] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allCafes, setAllCafes] = useState<Cafe[]>([]);

  const handleTagToggle = (tag: string) => {
    const isAdding = !selectedTags.includes(tag);
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    
    // Track tag interaction
    trackEngagement('tag_interaction', {
      action: isAdding ? 'add_tag' : 'remove_tag',
      tag,
      total_tags: isAdding ? selectedTags.length + 1 : selectedTags.length - 1,
    });
  };

  const handleCustomTag = () => {
    if (customTag && !selectedTags.includes(customTag)) {
      setSelectedTags(prev => [...prev, customTag]);
      trackEngagement('custom_tag_created', {
        tag: customTag,
        total_tags: selectedTags.length + 1,
      });
      setCustomTag("");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      trackEngagement('image_uploaded', {
        file_size: file.size,
        file_type: file.type,
      });
    }
  };

  // Helper: get query param
  function getQueryParam(param: string): string | null {
    const params = new URLSearchParams(location.search);
    return params.get(param);
  }

  // Load all cafes for distance calculation
  const loadAllCafes = async () => {
    const result = await fetchCafes({});
    if (result.success && result.data) {
      setAllCafes(result.data);
    }
  };

  // Strict geo-only location request
  const requestLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    setNearbyCafes([]);
    
    try {
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      
      // Calculate distances and get 10 closest cafes
      setIsLoadingCafes(true);
      const nearby = getNearbyCafes(latitude, longitude, allCafes, 50, 10);
      
      if (nearby.length > 0) {
        setNearbyCafes(nearby);
        setLocationError(null);
      } else {
        setLocationError("No nearby cafes found.");
        setNearbyCafes([]);
      }
    } catch (error: any) {
      setLocationError("No nearby cafes found.");
      setNearbyCafes([]);
      setUserLocation(null);
    } finally {
      setIsLoadingLocation(false);
      setIsLoadingCafes(false);
    }
  };

  // On mount: load cafes first, then request location
  useEffect(() => {
    const initializeCheckIn = async () => {
      await loadAllCafes();
      // Don't auto-request location - user must click "Select Cafe" button
    };
    initializeCheckIn();
  }, []);

  // Auto-select cafe if coming from detail page
  useEffect(() => {
    const cafeId = getQueryParam('cafeId');
    const placeId = getQueryParam('placeId');
    if (cafeId && placeId && nearbyCafes.length > 0) {
      setSelectedCafe(cafeId);
    }
  }, [nearbyCafes]);


  const handleSubmit = async () => {
    if (!selectedCafe || !rating) return;
    setIsSubmitting(true);
    let coords: { latitude: number; longitude: number } | null = null;
    try {
      // Always get fresh coordinates at submission
      const position = await getCurrentLocation();
      coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Location permission denied or unavailable. Please enable location and try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    try {
      const selectedCafeData = nearbyCafes.find(cafe => cafe.id === selectedCafe);
      if (!selectedCafeData) {
        toast({
          title: "Error",
          description: "Selected cafe not found",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      const result = await submitCheckin({
        cafeId: selectedCafe,
        placeId: selectedCafeData.placeId,
        rating,
        tags: selectedTags,
        review: review,
        imageFile,
        location: coords ? { latitude: coords.latitude, longitude: coords.longitude } : undefined,
      });
      if (result.success) {
        // Track successful check-in
        trackCheckIn(selectedCafeData.name, selectedCafe, rating, !!imageFile, selectedTags.length);
        
        toast({
          title: "Check-in shared!",
          description: "Your cafe experience has been posted"
        });
        navigate('/explore');
      } else {
        trackError('checkin_submission_failed', result.error || 'Failed to share check-in', {
          cafe_id: selectedCafe,
          rating,
          has_image: !!imageFile,
          tag_count: selectedTags.length,
        });
        
        toast({
          title: "Error",
          description: result.error || "Failed to share check-in",
          variant: "destructive"
        });
      }
    } catch (error) {
      trackError('checkin_exception', 'Failed to share check-in', {
        cafe_id: selectedCafe,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
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
              {!userLocation && !isLoadingLocation && !locationError ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 mx-auto mb-3 coffee-location-pin" />
                  <p className="text-sm text-muted-foreground mb-4">Find cafes near your location</p>
                  <Button 
                    onClick={requestLocation}
                    className="coffee-button"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Select Cafe
                  </Button>
                </div>
              ) : isLoadingLocation ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Getting your location...</span>
                </div>
              ) : locationError ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 mx-auto mb-3 coffee-location-pin" />
                  <p className="text-sm text-muted-foreground mb-4">{locationError}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={requestLocation}
                    className="coffee-interactive"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : isLoadingCafes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Finding nearby cafes...</span>
                </div>
              ) : (nearbyCafes.length > 0 ? (
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
                      <span className="text-xs text-muted-foreground">{formatDistance(cafe.distance)}</span>
                    </div>
                    <Button onClick={() => navigate(`/checkin?cafeId=${cafe.id}&placeId=${cafe.placeId}`)} className="flex-1 coffee-gradient text-white mt-2">
                      Check In Here
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 mx-auto mb-3 coffee-location-pin" />
                  <p className="text-sm text-muted-foreground">No nearby cafes found</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Photo Upload - Always visible */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Add Photo (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center relative hover:border-primary/50 transition-colors">
                {imageFile ? (
                  <div className="space-y-3">
                    <div className="w-full h-32 bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={URL.createObjectURL(imageFile)} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground truncate flex-1 mr-2">{imageFile.name}</p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setImageFile(null)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">Tap to add a photo</p>
                    <p className="text-xs text-muted-foreground">Share your cafe experience visually</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rating - Always visible */}
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
            disabled={!selectedCafe || !rating || isSubmitting}
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