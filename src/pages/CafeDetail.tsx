import { CafePhotoUpload } from "@/components/Cafe/CafePhotoUpload";
import { CafeReviews } from "@/components/Cafe/CafeReviews";
import { CafeTagsSection } from "@/components/Cafe/CafeTagsSection";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Share2, Heart, Camera, Plus, Phone, Globe, DollarSign, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/Layout/AppLayout";
import { CafeHeader } from "@/components/Cafe/CafeHeader";
import { PostCard } from "@/components/Feed/PostCard";
import { fetchCafeDetails } from "@/services/cafeService";
import { fetchCafePostsById } from "@/services/postService";
import { addToRecentlyViewed } from "@/pages/RecentlyViewed";
import { addFavorite, removeFavorite, isFavorited } from "@/services/favoritesService";
import { logActivity } from "@/services/activityService";
import { getCafeTips, submitTip, deleteTip, Tip } from "@/services/tipsService";
import { useToast } from "@/hooks/use-toast";
import type { Cafe, Post } from "@/services/types";
import { GoogleAttributionOverlay } from "@/components/Attribution/GoogleAttribution";
import { updateMetaTags, generateCafeSEO, addStructuredData, cleanupSEO } from "@/services/seoService";

export default function CafeDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { id: placeId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("posts");
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavoritedState, setIsFavoritedState] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [tagRefreshTrigger, setTagRefreshTrigger] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [tipText, setTipText] = useState("");
  const [tips, setTips] = useState<Tip[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);

  // Load cafe details and posts
  const loadCafeData = useCallback(async () => {
    if (!placeId) {
      setError("Cafe not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [cafeResult, postsResult] = await Promise.all([
        fetchCafeDetails(placeId),
        fetchCafePostsById(placeId),
      ]);

      if (cafeResult.success && cafeResult.data) {
        setCafe(cafeResult.data);
        // Check if cafe is favorited
        const favoriteResult = await isFavorited(cafeResult.data.id);
        if (favoriteResult.success) {
          setIsFavoritedState(favoriteResult.data);
        }
      } else {
        setError(cafeResult.error || "Cafe not found");
        return;
      }

      if (postsResult.success) {
        setPosts(postsResult.data);
      } else {
        console.error("Failed to load posts:", postsResult.error);
        // Don't show error for posts, just log it
      }

      // Load tips if cafe was loaded successfully
      if (cafeResult.success && cafeResult.data) {
        const tipsResult = await getCafeTips(cafeResult.data.id);
        if (tipsResult.success) {
          setTips(tipsResult.data);
        }
      }

      // Refresh tags when posts change
      setTagRefreshTrigger(prev => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load cafe";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    loadCafeData();
  }, [loadCafeData]);

  // Handle success message from check-in
  useEffect(() => {
    if (location.state?.showSuccess) {
      setShowSuccessMessage(true);
      // Refresh tags when user returns from successful check-in
      setTagRefreshTrigger(prev => prev + 1);
      
      // Clear the success flag from location state
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Hide success message after 3 seconds
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state?.showSuccess]);

  // Handle tip submission
  const handleSubmitTip = async () => {
    if (!tipText.trim() || tipText.length > 200 || !cafe) return;
    
    try {
      setTipsLoading(true);
      
      const result = await submitTip(cafe.id, tipText.trim());
      
      if (result.success) {
        // Refresh tips list
        const tipsResult = await getCafeTips(cafe.id);
        if (tipsResult.success) {
          setTips(tipsResult.data);
        }
        
        setTipText("");
        
        toast({
          title: "Tip added!",
          description: "Your tip has been shared with the community.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to submit tip",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit tip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTipsLoading(false);
    }
  };

  // Add to recently viewed when cafe data loads
  useEffect(() => {
    if (cafe) {
      addToRecentlyViewed({
        id: cafe.id,
        placeId: cafe.placeId,
        name: cafe.name,
        neighborhood: cafe.neighborhood,
        rating: cafe.googleRating || cafe.rating,
        tags: cafe.tags,
        image: cafe.heroPhotoUrl || cafe.photos?.[0] || "/placeholder.svg",
        priceLevel: cafe.priceLevel,
      });

      // Update SEO meta tags and structured data
      const seoData = generateCafeSEO(cafe);
      updateMetaTags(seoData);
      if (seoData.structuredData) {
        addStructuredData(seoData.structuredData);
      }
    }
  }, [cafe]);

  // Cleanup SEO when component unmounts
  useEffect(() => {
    return () => {
      cleanupSEO();
    };
  }, []);

  // Handle favorite toggle
  const handleFavoriteToggle = async () => {
    if (!cafe || favoriteLoading) return;
    
    setFavoriteLoading(true);
    try {
      if (isFavoritedState) {
        const result = await removeFavorite(cafe.id);
        if (result.success) {
          setIsFavoritedState(false);
          toast({
            title: "Removed from favorites",
            description: `${cafe.name} has been removed from your favorites`
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to remove favorite",
            variant: "destructive"
          });
        }
      } else {
        const result = await addFavorite(cafe.id);
        if (result.success) {
          setIsFavoritedState(true);
          toast({
            title: "Added to favorites",
            description: `${cafe.name} has been added to your favorites`
          });
          // Log activity
          await logActivity('favorite', cafe.id, { cafeName: cafe.name });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to add favorite",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive"
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading cafe details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !cafe) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center">
          <div className="text-center p-6">
            <h2 className="text-xl font-semibold mb-2">Cafe Not Found</h2>
            <p className="text-muted-foreground mb-4">{error || "This cafe could not be found."}</p>
            <Button onClick={() => navigate("/explore")}>Back to Explore</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBottomNav={false}>
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold truncate">{cafe.name}</h1>
                <p className="text-sm text-muted-foreground">{cafe.neighborhood}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full"
                onClick={handleFavoriteToggle}
                disabled={favoriteLoading}
              >
                <Heart className={`w-5 h-5 ${isFavoritedState ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Cafe Header */}
        <div className="p-6">
          <CafeHeader
            cafe={{
              id: cafe.id,
              placeId: cafe.placeId,
              name: cafe.name,
              address: cafe.address,
              neighborhood: cafe.neighborhood,
              rating: cafe.rating,
              googleRating: cafe.googleRating,
              userRating: cafe.userRating,
              photoSource: cafe.photoSource, // ADD THIS LINE!
              hours: cafe.openingHours?.length > 0 ? cafe.openingHours[0] : "Hours not available",
              hoursArray: cafe.openingHours, // Pass full hours array for current day logic
              phone: cafe.phoneNumber,
              website: cafe.website,
              priceLevel: cafe.priceLevel || 2,
              topTags: cafe.tags?.slice(0, 3) || [],
              reviewSnippet: "", // Reviews now only show in Reviews tab
              heroImage: cafe.heroPhotoUrl || cafe.photos?.[0],
              parkingInfo: cafe.parkingInfo, // Pass parking info from database
            }}
            loading={false}
            onPhotoAdded={(photoUrl) => {
              // Update the cafe state so the image appears immediately
              setCafe(prev => prev ? { ...prev, heroPhotoUrl: photoUrl } : prev);
            }}
            tagRefreshTrigger={tagRefreshTrigger}
          />
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="px-6 pb-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700 text-center">
                ✅ Your tags have been added to the cafe's vibe!
              </p>
            </div>
          </div>
        )}


        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-muted/50 mx-4 mt-4">
              <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="tips">Tips</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>

          <TabsContent value="posts" className="p-4 space-y-6">
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={{
                    id: post.id,
                    cafeName: cafe.name, // Use cafe name from current cafe
                    neighborhood: cafe.neighborhood, // Use neighborhood from current cafe
                    imageUrl: post.imageUrl,
                    tags: post.tags || [],
                    rating: post.rating || 0,
                    textReview: post.textReview || "",
                    createdAt: new Date(post.createdAt).toLocaleString(),
                    likes: post.likes || 0,
                    comments: post.comments || 0,
                    username: post.username,
                    photoSource: post.photoSource, // ADD THIS LINE!
                    placeId: post.placeId // ADD THIS LINE!
                  }} 
                />
              ))
            ) : (
              <div className="text-center py-12">
                <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to check in at {cafe.name}!
                </p>
                <Button 
                  onClick={() => navigate('/share/unified')}
                  className="coffee-gradient text-white"
                >
                  Share Your Experience
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="p-4">
            <CafeReviews cafeId={cafe.id} maxReviews={10} />
          </TabsContent>

          <TabsContent value="photos" className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {(() => {
                // Collect all user photos from posts
                const userPhotos: string[] = [];
                posts.forEach(post => {
                  if (post.imageUrl && post.imageUrl !== 'null' && post.imageUrl !== '') {
                    userPhotos.push(post.imageUrl);
                  }
                  if (post.imageUrls && post.imageUrls.length > 0) {
                    post.imageUrls.forEach(url => {
                      if (url && url !== 'null' && url !== '') {
                        userPhotos.push(url);
                      }
                    });
                  }
                });
                
                return userPhotos.length > 0 ? (
                  userPhotos.slice(0, 12).map((photo, index) => (
                    <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                      <img 
                        src={photo} 
                        alt={`${cafe.name} user photo ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Failed to load user photo:', photo);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12">
                    <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No user photos yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Be the first to share photos of {cafe.name}!
                    </p>
                    <Button 
                      onClick={() => navigate('/share')}
                      className="coffee-gradient text-white"
                    >
                      Share Your First Photo
                    </Button>
                  </div>
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="tips" className="p-4 space-y-4">
            <div className="bg-card rounded-lg p-4 shadow-coffee border border-border">
              <h3 className="font-semibold mb-3">Tips & Recommendations</h3>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Share your personal insights and recommendations for this cafe. Keep tips short and helpful!
                </div>
                
                {/* Add Tip Form */}
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      placeholder="Share a helpful tip about this cafe (e.g., 'Try the cold brew' or 'Best for studying')"
                      className="w-full p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                      rows={3}
                      maxLength={200}
                      value={tipText}
                      onChange={(e) => setTipText(e.target.value)}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                      {tipText.length}/200
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full"
                    onClick={handleSubmitTip}
                    disabled={!tipText.trim() || tipText.length > 200 || tipsLoading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {tipsLoading ? "Adding..." : "Add Tip"}
                  </Button>
                </div>
                
                {/* Tips List */}
                <div className="space-y-2">
                  {tips.length > 0 ? (
                    tips.map((tip) => (
                      <div key={tip.id} className="p-3 bg-muted/50 rounded-lg border-l-4 border-primary/30">
                        <p className="text-sm">"{tip.tip_text}"</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">- @{tip.username || 'Anonymous'}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{tip.likes} likes</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={async () => {
                                const result = await deleteTip(tip.id);
                                if (result.success) {
                                  setTips(prev => prev.filter(t => t.id !== tip.id));
                                  toast({
                                    title: "Tip deleted",
                                    description: "Your tip has been removed.",
                                  });
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">💡</div>
                      <p className="text-sm text-muted-foreground">No tips yet</p>
                      <p className="text-xs text-muted-foreground">Be the first to share a helpful tip!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="info" className="p-4 space-y-4">
            
            {/* Contact Information */}
            <div className="bg-card rounded-lg p-4 shadow-coffee border border-border">
              <h3 className="font-semibold mb-3">Contact Information</h3>
              <div className="space-y-4">
                {cafe.phoneNumber && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{cafe.phoneNumber}</span>
                    </div>
                    <Button variant="outline" size="sm" asChild className="flex-shrink-0 ml-2">
                      <a href={`tel:${cafe.phoneNumber}`}>Call</a>
                    </Button>
                  </div>
                )}
                {cafe.website && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{cafe.website}</span>
                    </div>
                    <Button variant="outline" size="sm" asChild className="flex-shrink-0 ml-2">
                      <a href={cafe.website} target="_blank" rel="noopener noreferrer">Visit</a>
                    </Button>
                  </div>
                )}
                {!cafe.phoneNumber && !cafe.website && (
                  <p className="text-sm text-muted-foreground">Contact information not available</p>
                )}
              </div>
            </div>

            {/* Price Level */}
            <div className="bg-card rounded-lg p-4 shadow-coffee border border-border">
              <h3 className="font-semibold mb-3">Price Level</h3>
              <div className="flex items-center gap-2">
                {cafe.priceLevel ? (
                  <>
                    <span className="text-sm text-muted-foreground">Average cost:</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 4 }, (_, i) => (
                        <DollarSign 
                          key={i} 
                          className={`w-4 h-4 ${i < cafe.priceLevel ? 'text-green-600' : 'text-muted-foreground/30'}`} 
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Price information not available</span>
                )}
              </div>
            </div>

            {/* Parking Information */}
            {cafe.parkingInfo && (
              <div className="bg-card rounded-lg p-4 shadow-coffee border border-border">
                <h3 className="font-semibold mb-3">Parking</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Parking available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Free</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{cafe.parkingInfo}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card rounded-lg p-4 shadow-coffee border border-border">
              <h3 className="font-semibold mb-2">Hours</h3>
              <div className="space-y-1 text-sm">
                {cafe.openingHours && cafe.openingHours.length > 0 ? (
                  cafe.openingHours.slice(0, 7).map((hour, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                      </span>
                      <span>{hour}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">Hours not available</p>
                )}
              </div>
            </div>

            {cafe.tags && cafe.tags.length > 0 && (
              <div className="bg-card rounded-lg p-4 shadow-coffee border border-border">
                <h3 className="font-semibold mb-2">Popular Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {cafe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

      </div>
    </AppLayout>
  );
}