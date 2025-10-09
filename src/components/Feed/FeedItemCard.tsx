import { useNavigate } from "react-router-dom";
import { MapPin, Star, Coffee } from "lucide-react";
import { FeedItem } from "@/services/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "./PostCard";
import { getCafeEmoji } from "@/utils/emojiPlaceholders";
import { GoogleAttributionOverlay } from "@/components/Attribution/GoogleAttribution";

interface FeedItemCardProps {
  item: FeedItem;
  onTagClick?: (tag: string) => void;
}

export function FeedItemCard({ item, onTagClick }: FeedItemCardProps) {
  const navigate = useNavigate();

  // Render post items using existing PostCard
  if (item.type === "post" && item.post) {
    return (
      <PostCard 
        post={{
          id: item.post.id,
          cafeName: item.post.cafe?.name || 'Unknown Cafe',
          neighborhood: item.post.cafe?.neighborhood || 'Houston',
          imageUrl: item.post.imageUrl,
          tags: item.post.tags,
          rating: item.post.rating,
          textReview: item.post.textReview,
          createdAt: new Date(item.createdAt).toLocaleString(),
          likes: item.post.likes,
          comments: item.post.comments,
          username: item.post.username,
          placeId: item.post.cafe?.placeId || item.post.placeId
        }} 
      />
    );
  }

  // Render cafe items
  if (item.type === "cafe" && item.cafe) {
    const cafe = item.cafe;
    const heroPhoto = cafe.photos?.[0];
    
    return (
      <Card className="shadow-warm border-0 overflow-hidden">
        <CardContent className="p-0">
          {/* Hero Photo */}
          <div className="relative h-48 bg-muted">
            {heroPhoto ? (
              <img
                src={heroPhoto}
                alt={cafe.name}
                className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Failed to load cafe image:', cafe.name, heroPhoto);
                  }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#8b5a3c] to-[#6b4423] text-white text-6xl rounded-lg shadow-lg">
                {getCafeEmoji(cafe.id || cafe.placeId)}
              </div>
            )}
              {/* Google Attribution for Cafe Photos */}
              {cafe.photoSource === 'google' && (
                <GoogleAttributionOverlay 
                  type="photo" 
                  sourceUrl={cafe.placeId ? `https://www.google.com/maps/search/?api=1&query_place_id=${cafe.placeId}` : undefined}
                />
              )}
          </div>

          <div className="p-4">
          {/* Cafe Name - Clickable */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/cafe/${cafe.placeId}`);
            }}
            className="text-xl font-bold hover:text-primary transition-smooth text-left w-full mb-2"
          >
            {cafe.name}
          </button>

            {/* Top Tags - Clickable */}
            <div className="flex flex-wrap gap-2 mb-3">
              {cafe.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/20 transition-smooth bg-primary/10 text-primary border-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick?.(tag);
                  }}
                >
                  #{tag}
                </Badge>
              ))}
              {cafe.tags.length > 3 && (
                <Badge variant="secondary" className="bg-muted/50 text-muted-foreground border-0">
                  +{cafe.tags.length - 3}
                </Badge>
              )}
            </div>

            {/* Google Rating + Address */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {cafe.googleRating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-medium">{cafe.googleRating}</span>
                    <span className="text-xs text-muted-foreground">Google</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{cafe.neighborhood}</span>
              </div>
            </div>

            <div className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {cafe.address}
            </div>

            {/* Check In Button */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/checkin?cafeId=${cafe.placeId}`);
              }}
              className="w-full coffee-gradient text-white shadow-coffee hover:shadow-glow transition-smooth"
            >
              Check in here
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}