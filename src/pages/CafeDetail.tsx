import CafePhotoUpload from "@/components/Cafe/CafePhotoUpload"; // adjust path as needed
import { useState, useEffect } from "react";
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
import { toast } from "@/hooks/use-toast";
import type { Cafe, Post } from "@/services/types";

// Mock cafe data
const mockCafe = {
  name: "Blacksmith Coffee",
  address: "1018 Westheimer Rd, Houston, TX 77006",
  neighborhood: "Montrose",
  rating: 4.3,
  userRating: 4.8,
  hours: "Open until 9:00 PM",
  phone: "(713) 555-0123",
  priceLevel: 2,
  topTags: ["latte-art", "cozy-vibes", "laptop-friendly"],
  reviewSnippet: "Perfect spot for working with incredible coffee and friendly staff"
};

const mockPosts = [
  {
    id: "1",
    cafeName: "Blacksmith Coffee",
    neighborhood: "Montrose", 
    imageUrl: "/placeholder.svg",
    tags: ["latte-art", "morning-coffee"],
    rating: 5.0,
    textReview: "Started my day with the perfect cappuccino. The foam art was incredible!",
    createdAt: "1h ago",
    likes: 12,
    comments: 3
  },
  {
    id: "2",
    cafeName: "Blacksmith Coffee", 
    neighborhood: "Montrose",
    imageUrl: "/placeholder.svg",
    tags: ["work-session", "laptop-friendly"],
    rating: 4.5,
    textReview: "Great wifi and quiet atmosphere for getting work done. Ordered multiple drinks and they were all fantastic.",
    createdAt: "3h ago", 
    likes: 8,
    comments: 2
  }
];

export default function CafeDetail() {
  const navigate = useNavigate();
  const { id: placeId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("posts");
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cafe details and posts
  const loadCafeData = async () => {
    if (!placeId) {
      setError('Cafe not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch cafe details and posts in parallel
      const [cafeResult, postsResult] = await Promise.all([
        fetchCafeDetails(placeId),
        fetchCafePostsById(placeId)
      ]);

      if (cafeResult.success && cafeResult.data) {
        setCafe(cafeResult.data);
      } else {
        setError(cafeResult.error || 'Cafe not found');
        return;
      }

      if (postsResult.success) {
        setPosts(postsResult.data);
      } else {
        console.error('Failed to load posts:', postsResult.error);
        // Don't show error for posts, just log it
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cafe';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCafeData();
  }, [placeId]);

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
        image: cafe.photos?.[0] || "/placeholder.svg",
        priceLevel: cafe.priceLevel
      });
    }
  }, [cafe]);

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
            <p className="text-muted-foreground mb-4">{error || 'This cafe could not be found.'}</p>
            <Button onClick={() => navigate('/explore')}>
              Back to Explore
            </Button>
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
                <h1 className="text-lg font-semibold truncate">
                  {loading ? "Loading..." : cafe?.name || "Cafe Details"}
                </h1>
                {cafe && (
                  <p className="text-sm text-muted-foreground">{cafe.neighborhood}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Heart className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Cafe Content */}
        {!loading && !error && cafe && (
          <>
            {/* Cafe Header */}
            <div className="p-6">
              <CafeHeader 
                cafe={{
                  name: cafe.name,
                  address: cafe.address,
                  neighborhood: cafe.neighborhood,
                  rating: cafe.googleRating || cafe.rating || 0,
                  userRating: 4.2, // TODO: Calculate average user rating
                  hours: cafe.openingHours?.[0] || "Hours not available",
                  phone: cafe.phoneNumber,
                  website: cafe.website,
                  priceLevel: cafe.priceLevel || 2,
                  topTags: cafe.tags.slice(0, 3),
                  reviewSnippet: "Great coffee and atmosphere! Perfect for working or catching up with friends.",
                  isOpen: Math.random() > 0.3, // Mock open status
                  heroImage: cafe.photos?.[0]
                }}
                loading={false}
              />
            </div>

            {/* Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50 mx-4 mt-4">
                <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
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
                        cafeName: post.cafe?.name || cafe.name,
                        neighborhood: post.cafe?.neighborhood || cafe.neighborhood,
                        imageUrl: post.imageUrl,
                        tags: post.tags,
                        rating: post.rating,
                        textReview: post.textReview,
                        createdAt: new Date(post.createdAt).toLocaleString(),
                        likes: post.likes,
                        comments: post.comments
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

              <TabsContent value="photos" className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-muted rounded-lg overflow-hidden"
                    >
                      <img 
                        src={cafe.photos?.[i % (cafe.photos?.length || 1)] || "/placeholder.svg"} 
                        alt={`${cafe.name} photo ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="info" className="p-4 space-y-4">
                <div className="bg-card rounded-lg p-4 shadow-coffee border border-border">
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-sm text-muted-foreground">
                    A neighborhood coffee shop in the heart of {cafe.neighborhood}, serving carefully crafted espresso drinks and fresh pastries. Known for exceptional quality and welcoming atmosphere.
                  </p>
                </div>
                
                <div className="bg-card rounded-lg p-4 shadow-coffee border border-border">
                  <h3 className="font-semibold mb-2">Hours</h3>
                  <div className="space-y-1 text-sm">
                    {cafe.openingHours?.slice(0, 7).map((hour, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                        </span>
                        <span>{hour}</span>
                      </div>
                    )) || (
                      <p className="text-muted-foreground">Hours not available</p>
                    )}
                  </div>
                </div>

                {cafe.tags.length > 0 && (
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
          </>
        )}

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
