import { Heart, MessageCircle, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PostCardProps {
  post: {
    id: string;
    cafeName: string;
    neighborhood: string;
    imageUrl: string;
    tags: string[];
    rating: number;
    textReview: string;
    createdAt: string;
    likes: number;
    comments: number;
  };
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Card className="overflow-hidden shadow-coffee border-0 bg-card/80 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <div>
              <h3 className="font-semibold text-sm">{post.cafeName}</h3>
              <p className="text-xs text-muted-foreground">{post.neighborhood}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{post.rating}</span>
          </div>
        </div>
      </div>

      {/* Image */}
      <div className="relative">
        <img
          src={post.imageUrl}
          alt={`${post.cafeName} post`}
          className="w-full h-64 object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {post.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs px-2 py-1 bg-accent/50 text-accent-foreground border-0"
            >
              #{tag}
            </Badge>
          ))}
        </div>

        {/* Review Text */}
        <p className="text-sm text-foreground mb-3 leading-relaxed">
          {post.textReview}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Heart className="w-4 h-4 mr-1" />
              <span className="text-sm">{post.likes}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <MessageCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">{post.comments}</span>
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">{post.createdAt}</span>
        </div>
      </div>
    </Card>
  );
}