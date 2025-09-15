import { useState } from "react";
import { Search, Filter, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/Layout/AppLayout";
import { PostCard } from "@/components/Feed/PostCard";

// Mock data for development
const mockPosts = [
  {
    id: "1",
    cafeName: "Blacksmith Coffee",
    neighborhood: "Montrose",
    imageUrl: "/placeholder.svg",
    tags: ["latte-art", "cozy-vibes", "laptop-friendly"],
    rating: 4.8,
    textReview: "Amazing cortado with beautiful latte art! The atmosphere is perfect for working, and the baristas really know their craft. Highly recommend the house blend.",
    createdAt: "2h ago",
    likes: 24,
    comments: 8
  },
  {
    id: "2", 
    cafeName: "Greenway Coffee",
    neighborhood: "Heights",
    imageUrl: "/placeholder.svg",
    tags: ["third-wave", "cold-brew", "rooftop"],
    rating: 4.6,
    textReview: "Love their cold brew setup! Great outdoor seating with a view. Perfect spot to catch up with friends over some specialty drinks.",
    createdAt: "4h ago",
    likes: 18,
    comments: 5
  },
  {
    id: "3",
    cafeName: "Hugo's Coffee",
    neighborhood: "Downtown",
    imageUrl: "/placeholder.svg", 
    tags: ["pastries", "instagram-worthy", "busy"],
    rating: 4.4,
    textReview: "Their croissants are to die for! Got here early and it was already buzzing with the morning crowd. Great energy and even better coffee.",
    createdAt: "6h ago",
    likes: 31,
    comments: 12
  }
];

export default function Feed() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold">Explore</h1>
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search cafes, tags, neighborhoods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-0"
              />
            </div>
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Feed */}
        <div className="p-4 space-y-6 pb-20">
          {mockPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          
          {/* Load More */}
          <div className="text-center py-8">
            <Button variant="ghost" className="text-muted-foreground">
              Load more posts...
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}