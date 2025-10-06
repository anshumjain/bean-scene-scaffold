import { useState, useRef } from "react";
import { Camera, X, Loader2, ArrowLeft } from "lucide-react";
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

function getAnonId() {
  let id = localStorage.getItem("anonId");
  if (!id) {
    id = Math.random().toString(36).slice(2);
    localStorage.setItem("anonId", id);
  }
  return id;
}

export default function CreatePost() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackQuickPost, trackError, trackEngagement } = useGoogleAnalytics();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [cafeQuery, setCafeQuery] = useState("");
  const [cafeResults, setCafeResults] = useState<any[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCafeSearch() {
    setLoading(true);
    const result = await fetchCafes({ query: cafeQuery });
    setCafeResults(result.data || []);
    setLoading(false);
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      trackEngagement('quick_post_image_uploaded', {
        file_size: file.size,
        file_type: file.type,
      });
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!imageFile) {
      setError("Please add a photo to share");
      return;
    }
    
    if (!selectedCafe) {
      setError("Please select a cafe");
      return;
    }
    
    setLoading(true);
    
    try {
      // Get location
      const position = await getCurrentLocation();
      
      // Submit the quick post
      const result = await submitCheckin({
        cafeId: selectedCafe.id,
        placeId: selectedCafe.placeId,
        rating: 5, // Default rating for quick posts
        tags: [],
        review: caption,
        imageFile,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
      });
      
      if (result.success) {
        // Track successful quick post
        trackQuickPost(selectedCafe?.name, selectedCafe?.id, !!imageFile);
        
        toast({
          title: "Quick post shared!",
          description: "Your photo has been posted successfully"
        });
        navigate("/explore");
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
                  {imageFile ? (
                    <div className="space-y-3">
                      <div className="w-full h-48 bg-muted rounded-lg overflow-hidden">
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
                      <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">Tap to add a photo</p>
                      <p className="text-xs text-muted-foreground">Share your coffee moment</p>
                      <input
                        ref={fileInputRef}
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
                <div className="flex gap-2">
                  <Input 
                    value={cafeQuery} 
                    onChange={e => setCafeQuery(e.target.value)} 
                    placeholder="Search for a cafe..."
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleCafeSearch} 
                    disabled={loading || !cafeQuery.trim()}
                    variant="outline"
                  >
                    Search
                  </Button>
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
                        <div className="text-xs text-muted-foreground">{cafe.neighborhood}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedCafe && (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-primary">Selected: {selectedCafe.name}</div>
                        <div className="text-xs text-muted-foreground">{selectedCafe.neighborhood}</div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedCafe(null)}
                        className="text-destructive hover:text-destructive"
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
              disabled={!imageFile || loading}
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

