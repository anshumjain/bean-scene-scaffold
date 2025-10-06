import { Camera, Coffee, Heart, MapPin, Settings, User as UserIcon, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/Layout/AppLayout";
import { PostCard } from "@/components/Feed/PostCard";
import { UsernameSelection } from "@/components/UsernameSelection";
import { getUsername } from "@/services/userService";
import { getFavorites } from "@/services/favoritesService";
import { getActivityFeed } from "@/services/activityService";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Mock data - will be replaced with real data from Supabase
const userStats = {
  checkins: 0,
  favorites: 0,
  photos: 0,
  badges: []
};

const userPosts: any[] = [];

export default function Profile() {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(null);
  const [showUsernameSelect, setShowUsernameSelect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({
    checkins: 0,
    favorites: 0,
    photos: 0,
    badges: []
  });

  useEffect(() => {
    const loadProfileData = async () => {
      const usernameRes = await getUsername();
      if (usernameRes.success) {
        setUsername(usernameRes.data);
        if (!usernameRes.data) setShowUsernameSelect(true);
      }
      
      // Load favorites and activities
      const [favoritesRes, activitiesRes] = await Promise.all([
        getFavorites(),
        getActivityFeed()
      ]);
      
      if (favoritesRes.success) {
        setFavorites(favoritesRes.data);
        setStats(prev => ({ ...prev, favorites: favoritesRes.data.length }));
      }
      
      if (activitiesRes.success) {
        setActivities(activitiesRes.data);
        const checkins = activitiesRes.data.filter(a => a.activityType === 'check-in').length;
        const photos = activitiesRes.data.filter(a => a.activityType === 'photo-upload').length;
        setStats(prev => ({ ...prev, checkins, photos }));
      }
      
      setLoading(false);
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
                    <p className="text-xs text-muted-foreground">No badges yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Card 
              className="coffee-card coffee-interactive"
              onClick={() => navigate('/share')}
            >
              <CardContent className="p-4 text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 coffee-location-pin" />
                <p className="text-sm font-medium coffee-cafe-name">Check In</p>
              </CardContent>
            </Card>
            <Card 
              className="coffee-card coffee-interactive"
              onClick={() => navigate('/explore')}
            >
              <CardContent className="p-4 text-center">
                <Heart className="w-8 h-8 mx-auto mb-2 coffee-location-pin" />
                <p className="text-sm font-medium coffee-cafe-name">Favorites</p>
              </CardContent>
            </Card>
            <Card 
              className="coffee-card coffee-interactive"
              onClick={() => navigate('/feedback')}
            >
              <CardContent className="p-4 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 coffee-location-pin" />
                <p className="text-sm font-medium coffee-cafe-name">Feedback</p>
              </CardContent>
            </Card>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-4 mt-4">
              {userPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </TabsContent>

            <TabsContent value="photos" className="mt-4">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-muted rounded-lg overflow-hidden"
                  >
                    <img 
                      src="/placeholder.svg" 
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4 space-y-4">
              <div className="space-y-3">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 bg-card rounded-lg">
                      {activity.activityType === 'check-in' && <Coffee className="w-5 h-5 text-primary" />}
                      {activity.activityType === 'favorite' && <Heart className="w-5 h-5 text-primary" />}
                      {activity.activityType === 'photo-upload' && <Camera className="w-5 h-5 text-primary" />}
                      {activity.activityType === 'review' && <Coffee className="w-5 h-5 text-primary" />}
                      <div className="flex-1">
                        <p className="text-sm">
                          {activity.activityType === 'check-in' && `Checked in at ${activity.metadata?.cafeName || 'a cafe'}`}
                          {activity.activityType === 'favorite' && `Added ${activity.metadata?.cafeName || 'a cafe'} to favorites`}
                          {activity.activityType === 'photo-upload' && `Posted a photo at ${activity.metadata?.cafeName || 'a cafe'}`}
                          {activity.activityType === 'review' && `Reviewed ${activity.metadata?.cafeName || 'a cafe'}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No activity yet</p>
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