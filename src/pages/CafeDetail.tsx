import { useState } from "react";
import { ArrowLeft, Camera, Heart, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/Layout/AppLayout";
import { CafeHeader } from "@/components/Cafe/CafeHeader";
import { PostCard } from "@/components/Feed/PostCard";
import { useNavigate } from "react-router-dom";

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
  const [activeTab, setActiveTab] = useState("posts");

  return (
    <AppLayout showBottomNav={false}>
      <div className="min-h-screen bg-background">
        {/* Header with Back Button */}
        <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-background/95 backdrop-blur-md">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Share className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Cafe Header */}
        <CafeHeader cafe={mockCafe} />

        {/* Content Tabs */}
        <div className="max-w-md mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 mx-4 mt-4">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="p-4 space-y-6">
              {mockPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </TabsContent>

            <TabsContent value="photos" className="p-4">
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 8 }, (_, i) => (
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

            <TabsContent value="info" className="p-4 space-y-4">
              <div className="bg-card rounded-lg p-4 shadow-coffee">
                <h3 className="font-semibold mb-2">About</h3>
                <p className="text-sm text-muted-foreground">
                  A neighborhood coffee shop in the heart of Montrose, serving carefully crafted espresso drinks and fresh pastries. Known for exceptional latte art and a welcoming atmosphere for both remote workers and casual coffee lovers.
                </p>
              </div>
              
              <div className="bg-card rounded-lg p-4 shadow-coffee">
                <h3 className="font-semibold mb-2">Popular Times</h3>
                <p className="text-sm text-muted-foreground">
                  Busiest: 8-10 AM, 2-4 PM weekdays
                  <br />
                  Quietest: 10 AM-12 PM, after 6 PM
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

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