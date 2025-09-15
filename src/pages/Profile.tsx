import { Camera, Coffee, Heart, MapPin, Settings, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/Layout/AppLayout";
import { PostCard } from "@/components/Feed/PostCard";

const userStats = {
  checkins: 42,
  favorites: 12,
  photos: 38,
  badges: ["Coffee Connoisseur", "Houston Explorer", "Early Bird"]
};

const userPosts = [
  {
    id: "1",
    cafeName: "Blacksmith Coffee",
    neighborhood: "Montrose",
    imageUrl: "/placeholder.svg", 
    tags: ["latte-art", "morning-coffee"],
    rating: 5.0,
    textReview: "Perfect way to start the weekend! Their cortado is incredible.",
    createdAt: "2 days ago",
    likes: 15,
    comments: 4
  }
];

export default function Profile() {
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
              <h2 className="text-xl font-bold mb-1">Coffee Lover</h2>
              <p className="text-sm text-muted-foreground mb-4">Houston, TX</p>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{userStats.checkins}</div>
                  <div className="text-xs text-muted-foreground">Check-ins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{userStats.favorites}</div>
                  <div className="text-xs text-muted-foreground">Favorites</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{userStats.photos}</div>
                  <div className="text-xs text-muted-foreground">Photos</div>
                </div>
              </div>

              {/* Badges */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Badges</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {userStats.badges.map((badge) => (
                    <Badge
                      key={badge}
                      variant="secondary"
                      className="bg-primary/10 text-primary border-0"
                    >
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-coffee border-0 cursor-pointer hover:shadow-warm transition-smooth">
              <CardContent className="p-4 text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Check In</p>
              </CardContent>
            </Card>
            <Card className="shadow-coffee border-0 cursor-pointer hover:shadow-warm transition-smooth">
              <CardContent className="p-4 text-center">
                <Heart className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Favorites</p>
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
                <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
                  <Coffee className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm">Checked in at <strong>Blacksmith Coffee</strong></p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
                  <Heart className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm">Added <strong>Greenway Coffee</strong> to favorites</p>
                    <p className="text-xs text-muted-foreground">1 week ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
                  <Camera className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm">Posted a photo at <strong>Hugo's Coffee</strong></p>
                    <p className="text-xs text-muted-foreground">2 weeks ago</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}