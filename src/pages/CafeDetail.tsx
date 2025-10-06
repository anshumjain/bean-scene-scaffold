import { CafePhotoUpload } from "@/components/Cafe/CafePhotoUpload";
import { CafeReviews } from "@/components/Cafe/CafeReviews";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Heart, Camera } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import type { Cafe, Post } from "@/services/types";

export default function CafeDetail() {
  const navigate = useNavigate();
  const { id: placeId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("posts");
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavoritedState, setIsFavoritedState] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

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
    }
  }, [cafe]);

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
              rating: cafe.googleRating || 0,
              userRating: cafe.rating || 0,
              hours: cafe.openingHours?.[0] || "Hours not available",
              phone: cafe.phoneNumber,
              website: cafe.website,
              priceLevel: cafe.priceLevel || 2,
              topTags: cafe.tags?.slice(0, 3) || [],
              reviewSnippet: "",
              heroImage: cafe.heroPhotoUrl || cafe.photos?.[0],
            }}
            loading={false}
            onPhotoAdded={(photoUrl) => {
              // Update the cafe state so the image appears immediately
              setCafe(prev => prev ? { ...prev, heroPhotoUrl: photoUrl } : prev);
            }}
          />
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 mx-4 mt-4">
            <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
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
                    username: post.username
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
                  onClick={() => navigate('/checkin')}
                  className="coffee-gradient text-white"
                >
                  Check In
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="p-4">
            <CafeReviews cafeId={cafe.id} maxReviews={10} />
          </TabsContent>

          <TabsContent value="photos" className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {cafe.photos && cafe.photos.length > 0 ? (
                cafe.photos.map((photo, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-muted rounded-lg overflow-hidden"
                  >
                    <img 
                      src={photo} 
                      alt={`${cafe.name} photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-12">
                  <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No photos yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to add photos of {cafe.name}!
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="info" className="p-4 space-y-4">
            
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

        {/* Floating Check-in Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="coffee-gradient text-white shadow-glow rounded-full w-14 h-14"
            onClick={() => navigate('/checkin')}
          >
            <Camera className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}