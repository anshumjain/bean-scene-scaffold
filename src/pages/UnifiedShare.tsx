import React, { useState, useRef, useEffect } from "react";
import { Camera, X, Loader2, ArrowLeft, Star, MapPin, Zap } from "lucide-react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useGoogleAnalytics } from "@/hooks/use-google-analytics";
import { getCurrentLocation } from "@/services/utils";
import { searchCafesForShare } from "@/services/cafeService";
import { submitCheckin } from "@/services/postService";
import { getUsername } from "@/services/userService";
import { processPostCreation } from "@/services/gamificationService";
import { calculateXPFromPost, getXPPreviewText, getXPBreakdownText, ShareMode } from "@/utils/xpCalculator";
import { getTagSuggestions, getPopularTags, normalizeTag, validateTag } from "@/services/tagService";
import type { Cafe } from "@/services/types";

const PREDEFINED_TAGS = [
  "wifi", "quiet", "busy", "cozy", "study-spot", "great-coffee",
  "outdoor-seating", "pet-friendly", "date-spot", "laptop-friendly"
];

export default function UnifiedShare() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { trackEngagement, trackError } = useGoogleAnalytics();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [shareMode, setShareMode] = useState<ShareMode>('post');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [cafeQuery, setCafeQuery] = useState("");
  const [cafeResults, setCafeResults] = useState<Cafe[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Enhanced tag state
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);

  // Handle prefilled cafe data from navigation state
  useEffect(() => {
    if (location.state?.prefilledCafe) {
      const prefilledCafe = location.state.prefilledCafe;
      setSelectedCafe(prefilledCafe);
      setCafeQuery(prefilledCafe.name);
      trackEngagement('share_with_prefilled_cafe', { 
        cafe_name: prefilledCafe.name,
        cafe_id: prefilledCafe.id 
      });
    }
  }, [location.state, trackEngagement]);

  // Get user location and popular tags on mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        // Check if we have stored location first
        const storedLocation = localStorage.getItem('user-location');
        if (storedLocation) {
          const parsedLocation = JSON.parse(storedLocation);
          // Check if location is not too old (less than 1 hour)
          if (parsedLocation.timestamp && Date.now() - parsedLocation.timestamp < 3600000) {
            setUserLocation({
              latitude: parsedLocation.latitude,
              longitude: parsedLocation.longitude,
            });
            console.log('Using stored location in UnifiedShare:', parsedLocation);
            return;
          }
        }

        // On mobile browsers, don't try to auto-detect location without user interaction
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          console.log('Mobile browser detected in UnifiedShare - skipping auto-location detection');
          return;
        }

        // Only try auto-detection on desktop browsers
        const position = await getCurrentLocation();
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch (error) {
        // Location is optional, so we don't show error
        console.log('Location not available:', error);
      }
    };
    
    const loadPopularTags = async () => {
      try {
        const popular = await getPopularTags(12);
        setPopularTags(popular.map(tag => tag.tag));
      } catch (error) {
        console.error('Error loading popular tags:', error);
      }
    };

    getLocation();
    loadPopularTags();
  }, []);

  // Search cafes when query changes
  useEffect(() => {
    if (cafeQuery.length > 2) {
      handleCafeSearch();
    } else {
      setCafeResults([]);
    }
  }, [cafeQuery]);

  async function handleCafeSearch() {
    if (!cafeQuery.trim()) {
      setCafeResults([]);
      return;
    }

    setSearching(true);
    try {
      const result = await searchCafesForShare(cafeQuery, userLocation || undefined);
      if (result.success) {
        setCafeResults(result.data || []);
      } else {
        console.error('Cafe search failed:', result.error);
        setCafeResults([]);
      }
    } catch (error) {
      console.error('Cafe search error:', error);
      setCafeResults([]);
    } finally {
      setSearching(false);
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      // Limit to 5 images max
      const limitedFiles = files.slice(0, 5);
      setImageFiles(prev => [...prev, ...limitedFiles].slice(0, 5));
      setCurrentImageIndex(imageFiles.length); // Set to the first new image
      trackEngagement('share_photos_uploaded', { 
        count: limitedFiles.length, 
        total_size: limitedFiles.reduce((sum, file) => sum + file.size, 0) 
      });
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    if (currentImageIndex >= index && currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    } else if (currentImageIndex >= imageFiles.length - 1) {
      setCurrentImageIndex(prev => Math.max(0, prev - 1));
    }
  };

  const nextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % imageFiles.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => (prev - 1 + imageFiles.length) % imageFiles.length);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Smart tag suggestions with keyword mapping
  const getSmartSuggestions = (input: string): string[] => {
    const smartMappings: Record<string, string[]> = {
      'work': ['wfh-friendly', 'laptop-friendly', 'study-spot'],
      'working': ['wfh-friendly', 'laptop-friendly', 'study-spot'],
      'wifi': ['wifi', 'laptop-friendly'],
      'internet': ['wifi', 'laptop-friendly'],
      'laptop': ['laptop-friendly', 'wfh-friendly'],
      'study': ['study-spot', 'quiet', 'laptop-friendly'],
      'studying': ['study-spot', 'quiet', 'laptop-friendly'],
      'quiet': ['quiet', 'study-spot'],
      'loud': ['busy', 'loud'],
      'busy': ['busy', 'loud'],
      'coffee': ['great-coffee', 'good-coffee'],
      'food': ['food', 'food-options', 'good-pastries'],
      'outside': ['outdoor-seating'],
      'outdoor': ['outdoor-seating'],
      'pet': ['pet-friendly'],
      'dog': ['pet-friendly'],
      'date': ['date-spot'],
      'romantic': ['date-spot'],
      'couple': ['date-spot']
    };

    const inputLower = input.toLowerCase().trim();
    const suggestions: string[] = [];

    // Check for exact matches
    if (smartMappings[inputLower]) {
      suggestions.push(...smartMappings[inputLower]);
    }

    // Check for partial matches
    Object.entries(smartMappings).forEach(([keyword, tags]) => {
      if (keyword.includes(inputLower) || inputLower.includes(keyword)) {
        suggestions.push(...tags);
      }
    });

    return [...new Set(suggestions)]; // Remove duplicates
  };

  const handleTagInputChange = async (value: string) => {
    setTagInput(value);
    
    if (value.trim()) {
      setShowTagSuggestions(true);
      
      // Get smart suggestions first
      const smartSuggestions = getSmartSuggestions(value);
      
      // Get database suggestions
      const dbSuggestions = await getTagSuggestions(value);
      
      // Combine and deduplicate
      const allSuggestions = [...new Set([...smartSuggestions, ...dbSuggestions])]
        .filter(suggestion => !selectedTags.includes(suggestion))
        .slice(0, 8);
      
      setTagSuggestions(allSuggestions);
    } else {
      setShowTagSuggestions(false);
      setTagSuggestions([]);
    }
  };

  const addCustomTag = (tag: string) => {
    const normalizedTag = normalizeTag(tag);
    const validation = validateTag(normalizedTag);
    
    if (!validation.valid) {
      toast({
        title: "Invalid tag",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    if (!selectedTags.includes(normalizedTag)) {
      setSelectedTags(prev => [...prev, normalizedTag]);
      setTagInput("");
      setShowTagSuggestions(false);
      setTagSuggestions([]);
      
      trackEngagement('custom_tag_added', { tag: normalizedTag });
    }
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addCustomTag(tagInput.trim());
    }
  };

  const handleClearCafe = () => {
    setSelectedCafe(null);
    setCafeQuery("");
    setRating(0);
    
    toast({
      title: "Cafe cleared",
      description: location.state?.prefilledCafe 
        ? "You can now search for a different cafe or continue without tagging one"
        : "Cafe selection cleared",
    });
    
    trackEngagement('cafe_cleared', { 
      was_prefilled: !!location.state?.prefilledCafe 
    });
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      const feet = Math.round(distance * 5280);
      return `${feet} ft`;
    }
    return `${distance.toFixed(1)} mi`;
  };

  const getXPCalculation = () => {
    const hasPhoto = imageFiles.length > 0;
    const captionLength = caption.trim().length;
    const cafeTagged = Boolean(selectedCafe);
    const ratingValue = rating;
    const tagsCount = selectedTags.length;
    const isVerifiedNearby = Boolean(selectedCafe && userLocation);

    return calculateXPFromPost({
      mode: shareMode,
      imageFiles,
      caption,
      cafeId: selectedCafe?.id || null,
      rating,
      tags: selectedTags,
      location: userLocation,
      cafeLocation: selectedCafe ? {
        latitude: selectedCafe.latitude,
        longitude: selectedCafe.longitude
      } : undefined,
      isFirstTimeCafe: false // TODO: Implement first time cafe check
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation based on mode
    if (shareMode === 'post') {
      // Post mode: require at least one input
      const hasMinimumContent = (
        imageFiles.length > 0 ||
        caption.trim().length > 0 ||
        selectedCafe !== null ||
        selectedTags.length > 0
      );
      
      if (!hasMinimumContent) {
        toast({
          title: "Add some content",
          description: "Please add at least one: photo, caption, cafe, or tags",
          variant: "destructive"
        });
        return;
      }
    } else {
      // Check-in mode: require cafe, rating, and review
      if (!selectedCafe || !rating || !caption.trim()) {
        toast({
          title: "Complete your check-in",
          description: "Please select a cafe, add a rating, and write a review",
          variant: "destructive"
        });
        return;
      }
    }
    
    setLoading(true);
    
    try {
      const usernameResult = await getUsername();
      const currentUsername = usernameResult.success ? usernameResult.data : null;

      const result = await submitCheckin({
        mode: shareMode,
        cafeId: selectedCafe?.id || null,
        placeId: selectedCafe?.placeId || null,
        rating: rating > 0 ? rating : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        review: caption.trim() || undefined,
        imageFiles: imageFiles.length > 0 ? imageFiles : undefined,
        location: userLocation || undefined,
        username: currentUsername || undefined,
      });

      if (result.success) {
        trackEngagement('unified_share_success', {
          has_images: imageFiles.length > 0,
          image_count: imageFiles.length,
          has_caption: !!caption.trim(),
          has_cafe: !!selectedCafe,
          has_rating: rating > 0,
          tags_count: selectedTags.length,
        });
        
        toast({
          title: "Moment shared!",
          description: "Your coffee experience has been posted.",
        });
        
        navigate("/moments", { state: { refreshPosts: true } });
      } else {
        trackError('unified_share_submission_failed', result.error || 'Failed to share moment');
        toast({
          title: "Error",
          description: result.error || "Failed to share your moment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      trackError('unified_share_exception', 'Failed to share moment');
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const xpCalc = getXPCalculation();

  // Show username prompt if needed
  if (showUsernamePrompt) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Username Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You need a username to share posts. Would you like to set one now?
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate('/profile')}
                  className="flex-1"
                >
                  Set Username
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowUsernamePrompt(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold">Share</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Share your coffee moment</p>
        </div>

        {/* Mode Selector */}
        <div className="px-4 pb-4">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">What would you like to share?</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Post Mode */}
              <Button 
                variant={shareMode === 'post' ? 'default' : 'outline'}
                onClick={() => setShareMode('post')}
                className="h-auto p-4 flex flex-col items-start"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">📱</span>
                  <span className="font-semibold">Post</span>
                </div>
                <span className="text-sm text-muted-foreground text-left">
                  Sharing just a moment • All optional
                </span>
              </Button>

              {/* Check-in Mode */}
              <Button 
                variant={shareMode === 'checkin' ? 'default' : 'outline'}
                onClick={() => setShareMode('checkin')}
                className="h-auto p-4 flex flex-col items-start"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">⭐</span>
                  <span className="font-semibold">Check-in</span>
                </div>
                <span className="text-sm text-muted-foreground text-left">
                  If you have experienced this cafe • Rate & review required
                </span>
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Photo Upload (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Add Photos (Optional) - Up to 5
                </CardTitle>
              </CardHeader>
              <CardContent>
                {imageFiles.length > 0 ? (
                  <div className="space-y-3">
                    {/* Instagram-style Image Swiper */}
                    <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={URL.createObjectURL(imageFiles[currentImageIndex])} 
                        alt={`Preview ${currentImageIndex + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Navigation Arrows (only show if multiple images) */}
                      {imageFiles.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
                          >
                            ←
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
                          >
                            →
                          </Button>
                        </>
                      )}
                      
                      {/* Image Counter */}
                      {imageFiles.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          {currentImageIndex + 1} / {imageFiles.length}
                        </div>
                      )}
                      
                      {/* Remove Current Image Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage(currentImageIndex)}
                        className="absolute top-2 left-2 bg-black/20 hover:bg-black/40 text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Image Thumbnails */}
                    {imageFiles.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto w-full max-w-full">
                        {imageFiles.map((file, index) => (
                          <div
                            key={index}
                            className={`flex-shrink-0 w-12 h-12 rounded border-2 cursor-pointer ${
                              index === currentImageIndex ? 'border-primary' : 'border-border'
                            }`}
                            onClick={() => setCurrentImageIndex(index)}
                          >
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={`Thumbnail ${index + 1}`} 
                              className="w-full h-full object-cover rounded"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add More Photos Button */}
                    {imageFiles.length < 5 && (
                      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center relative hover:border-primary/50 transition-colors">
                        <Camera className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">Add more photos</p>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center relative hover:border-primary/50 transition-colors">
                    <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">Tap to add photos</p>
                    <p className="text-xs text-muted-foreground">Share your coffee moment visually (up to 5 photos)</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Caption/Review */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {shareMode === 'post' ? 'Caption (Optional)' : 'Review (Required)'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={caption} 
                  onChange={e => setCaption(e.target.value)} 
                  rows={4} 
                  placeholder={
                    shareMode === 'post' 
                      ? "Share your coffee story..." 
                      : "Write a detailed review of your experience..."
                  }
                  className="resize-none"
                  maxLength={500}
                  required={shareMode === 'checkin'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {caption.length}/500 characters
                  {shareMode === 'checkin' && (
                    <span className="text-red-500 ml-2">• Required for check-in</span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Step 3: Tag Cafe */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {shareMode === 'post' ? 'Tag Cafe (Optional)' : 'Select Cafe (Required)'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input 
                  value={cafeQuery} 
                  onChange={e => setCafeQuery(e.target.value)} 
                  placeholder="Type to search for a cafe..."
                  className="w-full"
                />
                
                {!selectedCafe && !cafeQuery && (
                  <div className="p-3 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {shareMode === 'post' 
                          ? "Tag a cafe to share your experience there"
                          : "Select the cafe you're reviewing"
                        }
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {shareMode === 'post' 
                          ? "This will count as a check-in and help other coffee lovers discover great spots"
                          : "Required for check-in - select the cafe you're reviewing"
                        }
                      </p>
                    </div>
                  </div>
                )}
                {searching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching cafes...
                  </div>
                )}
                
                {cafeResults.length > 0 && (
                  <div className="border rounded-lg bg-muted/50 divide-y max-h-40 overflow-y-auto">
                    {cafeResults.map(cafe => (
                      <div 
                        key={cafe.id} 
                        className={`p-3 cursor-pointer hover:bg-muted transition-colors ${
                          selectedCafe?.id === cafe.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                        }`} 
                        onClick={() => setSelectedCafe(cafe)}
                      >
                        <div className="font-medium">{cafe.name}</div>
                        <div className="text-xs text-muted-foreground">{cafe.address}</div>
                        <div className="text-xs text-muted-foreground/70">
                          {cafe.neighborhood}
                          {cafe.distance && (
                            <span className="ml-2 font-medium">
                              • {formatDistance(cafe.distance)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedCafe && (
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-primary" />
                          <div className="font-medium text-primary">Selected Cafe</div>
                          {location.state?.prefilledCafe && (
                            <Badge variant="secondary" className="text-xs">
                              From cafe page
                            </Badge>
                          )}
                        </div>
                        <div className="font-semibold text-foreground">{selectedCafe.name}</div>
                        <div className="text-sm text-muted-foreground">{selectedCafe.address}</div>
                        <div className="text-sm text-muted-foreground/70">{selectedCafe.neighborhood}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleClearCafe}
                        className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear & Choose Different
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleClearCafe}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Remove Cafe
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 3b: Rating & Vibes (always available) */}
            {/* Enhanced Rating Section */}
            {selectedCafe && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary" />
                    {shareMode === 'post' 
                      ? `Rate Your Experience at ${selectedCafe.name} (Optional)`
                      : `Rate Your Experience at ${selectedCafe.name} (Required)`
                    }
                  </CardTitle>
                </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition-all duration-200 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-full p-1"
                      aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= rating
                            ? "fill-yellow-400 text-yellow-400 drop-shadow-sm"
                            : "text-muted-foreground hover:text-yellow-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                
                {rating > 0 && (
                  <div className="text-center">
                    <p className="text-lg font-semibold text-yellow-600">
                      {rating} star{rating !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {rating === 1 && "Poor"}
                      {rating === 2 && "Fair"}
                      {rating === 3 && "Good"}
                      {rating === 4 && "Very Good"}
                      {rating === 5 && "Excellent"}
                    </p>
                  </div>
                )}
                
                {rating === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    {shareMode === 'post' 
                      ? "Tap a star to rate your experience at this cafe"
                      : "Required: Tap a star to rate your experience at this cafe"
                    }
                    {shareMode === 'checkin' && (
                      <span className="text-red-500 ml-1">• Required for check-in</span>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
            )}

            {/* Enhanced Vibe Tags */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {shareMode === 'post' ? 'Add Vibes (Optional)' : 'Add Vibes (Optional)'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {/* Custom Tag Input */}
                <div className="relative">
                  <Input
                    value={tagInput}
                    onChange={(e) => handleTagInputChange(e.target.value)}
                    onKeyPress={handleTagInputKeyPress}
                    placeholder="Type to add custom tags (e.g., 'work' → suggests 'wfh-friendly')"
                    className="w-full"
                  />
                  
                  {/* Tag Suggestions Dropdown */}
                  {showTagSuggestions && tagSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {tagSuggestions.map((suggestion) => (
                        <div
                          key={suggestion}
                          className="p-2 hover:bg-accent cursor-pointer text-sm border-b border-border last:border-b-0"
                          onClick={() => addCustomTag(suggestion)}
                        >
                          <span className="font-medium">#{suggestion}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {getSmartSuggestions(tagInput).includes(suggestion) ? 'Smart suggestion' : 'Popular tag'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Tags */}
                {popularTags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Popular Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {popularTags.filter(tag => !selectedTags.includes(tag)).slice(0, 12).map((tag) => (
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
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Step 4: Review & Submit */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  XP Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{getXPPreviewText(xpCalc)}</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {xpCalc.breakdown.slice(0, 3).map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                    {xpCalc.breakdown.length > 3 && (
                      <div>+{xpCalc.breakdown.length - 3} more bonuses</div>
                    )}
                  </div>
                  {selectedCafe && shareMode === 'post' && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <MapPin className="w-3 h-3" />
                      Counts as check-in
                    </div>
                  )}
                  {shareMode === 'checkin' && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <Star className="w-3 h-3" />
                      Formal review
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full coffee-gradient text-white shadow-coffee hover:shadow-glow transition-smooth" 
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {shareMode === 'post' ? 'Sharing...' : 'Checking in...'}
                </>
              ) : (
                shareMode === 'post' ? 'Share Post' : 'Check In'
              )}
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}