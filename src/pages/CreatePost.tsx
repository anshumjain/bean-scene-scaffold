import { useState, useRef, useEffect } from "react";
import { Camera, X, Loader2, ArrowLeft, Plus } from "lucide-react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { fetchCafes } from "@/services/cafeService";
import { submitCheckin } from "@/services/postService";
import { getCurrentLocation } from "@/services/utils";
import { useToast } from "@/hooks/use-toast";
import { useGoogleAnalytics } from "@/hooks/use-google-analytics";
import { processPostCreation, getUserStats } from "@/services/gamificationService";
import type { Cafe } from "@/services/types";

function getAnonId() {
  let id = localStorage.getItem("anonId");
  if (!id) {
    id = Math.random().toString(36).slice(2);
    localStorage.setItem("anonId", id);
  }
  return id;
}

function getUsername() {
  return localStorage.getItem("username") || null;
}

export default function CreatePost() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackQuickPost, trackError, trackEngagement } = useGoogleAnalytics();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [cafeQuery, setCafeQuery] = useState("");
  const [cafeResults, setCafeResults] = useState<Cafe[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-search cafes as user types (with debounce)
  useEffect(() => {
    if (!cafeQuery.trim()) {
      setCafeResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      handleCafeSearch();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [cafeQuery]);

  async function handleCafeSearch() {
    if (!cafeQuery.trim()) {
      setCafeResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const result = await fetchCafes({ query: cafeQuery.trim() });
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
      setLoading(false);
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Limit to 3 images
      const selectedFiles = Array.from(files).slice(0, 3);
      setImageFiles(selectedFiles);
      trackEngagement('quick_post_images_uploaded', {
        file_count: selectedFiles.length,
        total_size: selectedFiles.reduce((sum, file) => sum + file.size, 0),
      });
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (imageFiles.length === 0) {
      setError("Please add at least one photo to share");
      return;
    }
    
    // Cafe selection is optional, so we don't require it
    
    setLoading(true);
    
    try {
      // Get location
      const position = await getCurrentLocation();
      
      // Submit the quick post - handle case where no cafe is selected
      const result = await submitCheckin({
        cafeId: selectedCafe?.id || null,
        placeId: selectedCafe?.placeId || null,
        rating: 5, // Default rating for quick posts
        tags: [],
        review: caption,
        imageFiles,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
      });
      
      if (result.success) {
        // Track successful quick post
        trackQuickPost(selectedCafe?.name, selectedCafe?.id, imageFiles.length > 0);
        
        // Process gamification (XP and badges)
        const deviceId = getAnonId();
        const username = getUsername();
        
        try {
          const gamificationResult = await processPostCreation(
            undefined, // userId (not available for anonymous users)
            deviceId,
            username,
            selectedCafe?.id,
            imageFiles.length > 0, // hasImage
            caption.trim().length > 0, // hasReview
            false // isFirstDiscoverer (would need additional logic to check)
          );
          
          // Show XP gained notification
          if (gamificationResult.stats) {
            const xpGained = (imageFiles.length > 0 ? 5 : 0) + (caption.trim().length > 0 ? 15 : 0) + 10; // Check-in base XP
            toast({
              title: "XP Gained!",
              description: `+${xpGained} XP • Level ${gamificationResult.stats.current_level}`,
              duration: 3000,
            });
          }
          
          // Show new badges notification
          if (gamificationResult.newBadges.length > 0) {
            gamificationResult.newBadges.forEach((badge, index) => {
              setTimeout(() => {
                toast({
                  title: "🎉 Badge Earned!",
                  description: `${badge.badge_name}: ${badge.badge_description}`,
                  duration: 4000,
                });
              }, index * 1000); // Stagger badge notifications
            });
          }
        } catch (error) {
          console.error('Gamification error:', error);
          // Don't block the user flow if gamification fails
        }
        
        toast({
          title: "Quick post shared!",
          description: "Your photo has been posted successfully"
        });
        navigate("/moments", { state: { refreshPosts: true } });
      } else {
        setError(result.error || "Failed to share photo");
        toast({
          title: "Error",
          description: result.error || "Failed to share photo",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error sharing photo:", error);
      setError("Failed to share photo. Please try again.");
      toast({
        title: "Error",
        description: "Failed to share photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
              onClick={() => navigate('/share')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold">Quick Post</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Share a photo with a caption</p>
        </div>

        <div className="p-4 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Add Photo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center relative hover:border-primary/50 transition-colors">
                  {imageFiles.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        {imageFiles.map((file, index) => (
                          <div key={index} className="relative">
                            <div className="w-full h-32 bg-muted rounded-lg overflow-hidden">
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={`Preview ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-sm text-foreground truncate flex-1 mr-2">{file.name}</p>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== index))}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {imageFiles.length < 3 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add More Photos ({imageFiles.length}/3)
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">Tap to add photos</p>
                      <p className="text-xs text-muted-foreground">Share your coffee moment (up to 3 photos)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Caption */}
            <Card>
              <CardHeader>
                <CardTitle>Caption</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={caption} 
                  onChange={e => setCaption(e.target.value)} 
                  rows={4} 
                  placeholder="Say something about this photo..."
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Tag a Cafe */}
            <Card>
              <CardHeader>
                <CardTitle>Tag a Cafe (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Input 
                    value={cafeQuery} 
                    onChange={e => setCafeQuery(e.target.value)} 
                    placeholder="Type to search for a cafe..."
                    className="w-full"
                  />
                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching cafes...
                    </div>
                  )}
                </div>
                
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
                        <div className="text-xs text-muted-foreground/70">{cafe.neighborhood}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedCafe && (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-primary">Selected: {selectedCafe.name}</div>
                        <div className="text-xs text-muted-foreground">{selectedCafe.address}</div>
                        <div className="text-xs text-muted-foreground/70">{selectedCafe.neighborhood}</div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedCafe(null)}
                        className="text-destructive hover:text-destructive ml-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full coffee-gradient text-white shadow-coffee hover:shadow-glow transition-smooth" 
              size="lg"
              disabled={imageFiles.length === 0 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sharing...
                </>
              ) : (
                "Share Quick Post"
              )}
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

