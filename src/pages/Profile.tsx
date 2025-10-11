import { Camera, Coffee, Heart, MapPin, Settings, User as UserIcon, MessageSquare, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/Layout/AppLayout";
import { ProfilePostCard } from "@/components/Profile/ProfilePostCard";
import { UsernameSelection } from "@/components/UsernameSelection";
import { getUsername, getDeviceId } from "@/services/userService";
import { getFavorites, removeFavorite } from "@/services/favoritesService";
import { getActivityFeed } from "@/services/activityService";
import { fetchUserPosts, updatePost, deletePost } from "@/services/postService";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Mock data - will be replaced with real data from Supabase
const userStats = {
  checkins: 0,
  favorites: 0,
  photos: 0,
  badges: []
};

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState<string | null>(null);
  const [showUsernameSelect, setShowUsernameSelect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    checkins: 0,
    favorites: 0,
    photos: 0,
    badges: []
  });

  // Handle post editing
  const handleEditPost = (postId: string) => {
    // Find the post to edit
    const postToEdit = userPosts.find(post => post.id === postId);
    if (postToEdit) {
      // Navigate to edit page with post data
      navigate('/edit-post', { 
        state: { 
          post: postToEdit,
          mode: 'edit'
        } 
      });
    } else {
      toast({
        title: "Error",
        description: "Post not found. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle post deletion
  const handleDeletePost = async (postId: string) => {
    try {
      const result = await deletePost(postId);
      if (result.success) {
        // Remove the post from the local state
        setUserPosts(prev => prev.filter(post => post.id !== postId));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          checkins: prev.checkins - 1,
          photos: Math.max(0, prev.photos - 1) // Decrement if there were photos
        }));

        toast({
          title: "Post deleted",
          description: "Your post has been successfully deleted.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete post",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        console.log('Loading profile data...');
      const usernameRes = await getUsername();
        console.log('Username result:', usernameRes);
        
      if (usernameRes.success) {
        setUsername(usernameRes.data);
        if (!usernameRes.data) setShowUsernameSelect(true);
      }
      
        // Get device ID for anonymous users
        const deviceId = getDeviceId();
        console.log('Device ID:', deviceId);
        
        // Load favorites, activities, and user posts
        console.log('Loading data...');
        const [favoritesRes, activitiesRes, postsRes] = await Promise.all([
        getFavorites(),
          getActivityFeed(),
          fetchUserPosts(usernameRes.data, deviceId) // Pass username or deviceId
      ]);
        
        console.log('Data loaded:', { favoritesRes, activitiesRes, postsRes });
      
      if (favoritesRes.success) {
        setFavorites(favoritesRes.data);
        setStats(prev => ({ ...prev, favorites: favoritesRes.data.length }));
      } else {
        console.error('❌ Favorites error:', favoritesRes.error);
      }
      
      if (activitiesRes.success) {
        setActivities(activitiesRes.data);
        const checkins = activitiesRes.data.filter(a => a.activityType === 'check-in').length;
        const photos = activitiesRes.data.filter(a => a.activityType === 'photo-upload').length;
        setStats(prev => ({ ...prev, checkins, photos }));
      }
      
        if (postsRes.success) {
          setUserPosts(postsRes.data);
          // Update stats based on actual posts
          const checkins = postsRes.data.length;
          const photos = postsRes.data.filter(post => post.imageUrl || (post.imageUrls && post.imageUrls.length > 0)).length;
          setStats(prev => ({ ...prev, checkins, photos }));
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        });
      } finally {
      setLoading(false);
      }
    };
    
    loadProfileData();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (showUsernameSelect) {
    return <UsernameSelection onComplete={() => setShowUsernameSelect(false)} />;
  }

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Profile</h1>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Profile Header */}
          <Card className="shadow-coffee border-0">
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-1">@{username || "Coffee Lover"}</h2>
              <p className="text-sm text-muted-foreground mb-4">Houston, TX</p>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.checkins}</div>
                  <div className="text-xs text-muted-foreground">Check-ins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.favorites}</div>
                  <div className="text-xs text-muted-foreground">Favorites</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.photos}</div>
                  <div className="text-xs text-muted-foreground">Photos</div>
                </div>
              </div>

              {/* Badges */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Badges</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {stats.badges.map((badge) => (
                    <Badge
                      key={badge}
                      variant="secondary"
                      className="bg-primary/10 text-primary border-0"
                    >
                      {badge}
                    </Badge>
                  ))}
                  {stats.badges.length === 0 && (
                    <p className="text-xs text-muted-foreground">Badges coming soon</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Content Tabs */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="posts" className="flex items-center gap-2">
                <div className="grid grid-cols-3 gap-0.5 w-4 h-4">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
                Posts
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Favorites
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-4">
              {userPosts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
              {userPosts.map((post) => (
                    <div 
                      key={post.id}
                      className="aspect-square relative overflow-hidden rounded-lg bg-muted cursor-pointer group"
                      onClick={() => navigate(`/cafe/${post.cafe?.placeId || post.placeId}`)}
                    >
                      {post.imageUrl || (post.imageUrls && post.imageUrls.length > 0) ? (
                        <img
                          src={post.imageUrl || post.imageUrls?.[0]}
                          alt={`${post.cafe?.name || 'Cafe'} post`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
                          <Coffee className="w-8 h-8 text-amber-600" />
                        </div>
                      )}
                      
                      {/* Overlay with cafe name and rating */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-end">
                        <div className="p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <p className="text-xs font-medium truncate">{post.cafe?.name || 'Unknown Cafe'}</p>
                          {post.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs">{post.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Edit/Delete buttons */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 w-6 p-0 bg-white/90 hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPost(post.id);
                            }}
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 w-6 p-0 bg-white/90 hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePost(post.id);
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start sharing your coffee experiences!
                  </p>
                  <Button 
                    onClick={() => navigate('/explore')}
                    className="coffee-gradient text-white"
                  >
                    Share Your First Post
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="favorites" className="mt-4 space-y-4">
              {favorites.length > 0 ? (
                favorites.map((favorite) => (
                  <Card key={favorite.id} className="overflow-hidden shadow-coffee border-0 bg-card/80 backdrop-blur-sm">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{favorite.cafe?.name || 'Unknown Cafe'}</h3>
                          <p className="text-sm text-muted-foreground">{favorite.cafe?.neighborhood || ''}</p>
                          {favorite.cafe?.address && (
                            <p className="text-xs text-muted-foreground mt-1">{favorite.cafe.address}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/cafe/${favorite.cafe?.place_id || favorite.cafe_id}`)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async () => {
                              try {
                                const result = await removeFavorite(favorite.cafe_id);
                                if (result.success) {
                                  setFavorites(prev => prev.filter(f => f.id !== favorite.id));
                                  setStats(prev => ({ ...prev, favorites: prev.favorites - 1 }));
                                  toast({
                                    title: "Removed from favorites",
                                    description: "Cafe removed from your favorites.",
                                  });
                                }
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to remove from favorites.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start exploring cafes and add them to your favorites!
                  </p>
                  <Button 
                    onClick={() => navigate('/explore')}
                    className="coffee-gradient text-white"
                  >
                    Explore Cafes
                  </Button>
                  </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-4 space-y-4">
              <div className="space-y-4">
                {userPosts.length > 0 ? (
                  userPosts.map((post) => (
                    <div key={post.id} className="bg-card rounded-lg p-4 border border-border">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {post.imageUrl && post.imageUrl !== 'null' && post.imageUrl !== '' ? (
                            <img 
                              src={post.imageUrl} 
                              alt="Post"
                              className="w-12 h-12 rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <Coffee className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              Check-in
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-medium text-sm truncate">
                            {post.cafe?.name || 'Unknown Cafe'}
                          </h4>
                          {post.textReview && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {post.textReview}
                            </p>
                          )}
                          {post.rating > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{post.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Coffee className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start exploring cafes and sharing your experiences!
                    </p>
                    <Button 
                      onClick={() => navigate('/explore')}
                      className="coffee-gradient text-white"
                    >
                      Explore Cafes
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}