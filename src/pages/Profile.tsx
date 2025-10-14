import { Camera, Coffee, Heart, MapPin, Settings, User as UserIcon, MessageSquare, Star, X, Trophy, Edit, Info, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppLayout } from "@/components/Layout/AppLayout";
import { ProfilePostCard } from "@/components/Profile/ProfilePostCard";
import { UsernameSelection } from "@/components/UsernameSelection";
import { getUsername, getDeviceId } from "@/services/userService";
import { getFavorites, removeFavorite } from "@/services/favoritesService";
import { getActivityFeed } from "@/services/activityService";
import { fetchUserPosts, updatePost, deletePost } from "@/services/postService";
import { getUserStats, getUserBadges } from "@/services/gamificationService";
import { formatTimeAgo } from "@/services/utils";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";

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
  
  // Set SEO meta tags for profile page
  useSEO('profile');
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
  const [gamificationStats, setGamificationStats] = useState({
    total_xp: 0,
    current_level: 1,
    total_checkins: 0,
    total_photos: 0,
    total_reviews: 0,
    total_cafes_visited: 0
  });
  const [userBadges, setUserBadges] = useState<any[]>([]);

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
    const confirmed = window.confirm(
      "Are you sure you want to delete this post?\n\nThis action cannot be undone."
    );
    
    if (!confirmed) {
      return;
    }
    
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
        
        // Load favorites, activities, user posts, and gamification data
        console.log('Loading data...');
        const [favoritesRes, activitiesRes, postsRes, gamificationStatsRes, userBadgesRes] = await Promise.all([
        getFavorites(),
          getActivityFeed(),
          fetchUserPosts(usernameRes.data, deviceId), // Pass username or deviceId
          getUserStats(undefined, deviceId, usernameRes.data),
          getUserBadges(undefined, deviceId, usernameRes.data)
      ]);
        
        console.log('Data loaded:', { favoritesRes, activitiesRes, postsRes, gamificationStatsRes, userBadgesRes });
      
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

        // Load gamification stats
        if (gamificationStatsRes) {
          setGamificationStats(gamificationStatsRes);
        }

        // Load user badges
        if (userBadgesRes) {
          setUserBadges(userBadgesRes);
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
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      // Navigate to edit profile or show username selection
                      setShowUsernameSelect(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-3" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => navigate('/feedback')}
                  >
                    <MessageSquare className="w-4 h-4 mr-3" />
                    Send Feedback
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      // Show About Bean Scene content
                      window.alert(`
About Bean Scene

Connected, but Lonely
We live in a world more connected than ever, yet most of us feel more isolated than ever. Algorithms keep us scrolling, but rarely help us belong in our own cities.

Why Coffee?
Coffee is more than caffeine. It's ritual, comfort, and the backdrop for so many parts of life, whether you're working solo, catching up with a friend, or starting a new conversation.

The Idea
Bean Scene helps you discover cafés that fit your vibe: laptop-friendly, cozy, social, or just a quiet corner to think. And along the way, it makes it easier to turn everyday coffee runs into real connections.

The Vision
This is just the beginning. Our bigger goal is to help people step away from algorithms and into real life, building a culture where belonging happens naturally, one café at a time.

✨ More than coffee. More than connections.
                      `);
                    }}
                  >
                    <Info className="w-4 h-4 mr-3" />
                    About Bean Scene
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      const confirmed = window.confirm("Are you sure you want to logout?");
                      if (confirmed) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
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
              
              {/* Level and XP */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 mb-6">
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-primary mb-1">Level {gamificationStats.current_level}</div>
                  <div className="text-sm text-muted-foreground">{gamificationStats.total_xp} XP</div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-primary/70 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((gamificationStats.total_xp % 100) / 100) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  {100 - (gamificationStats.total_xp % 100)} XP to next level
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{gamificationStats.total_checkins}</div>
                  <div className="text-xs text-muted-foreground">Check-ins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{gamificationStats.total_photos}</div>
                  <div className="text-xs text-muted-foreground">Photos</div>
                </div>
              </div>

              {/* Badges */}
              <div 
                className="space-y-2 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                onClick={() => navigate('/badges')}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Badges ({userBadges.length})</h3>
                  <Trophy className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {userBadges.slice(0, 3).map((badge) => (
                    <Badge
                      key={badge.id}
                      variant="secondary"
                      className="bg-primary/10 text-primary border-0"
                      title={badge.badge_description}
                    >
                      {badge.badge_name}
                    </Badge>
                  ))}
                  {userBadges.length > 3 && (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground"
                    >
                      +{userBadges.length - 3} more
                    </Badge>
                  )}
                  {userBadges.length === 0 && (
                    <p className="text-xs text-muted-foreground">Start posting to earn badges!</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Content Tabs */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
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
                onClick={() => navigate('/post-view', { state: { post: post } })}
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
                              {formatTimeAgo(post.createdAt)}
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