import { useState } from "react";
import { Heart, MessageCircle, MapPin, Star, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoogleAttribution, GoogleAttributionOverlay } from "@/components/Attribution/GoogleAttribution";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProfilePostCardProps {
  post: {
    id: string;
    cafeName: string;
    neighborhood: string;
    imageUrl: string;
    imageUrls?: string[];
    tags: string[];
    rating: number;
    textReview: string;
    createdAt: string;
    likes: number;
    comments: number;
    username?: string;
    placeId?: string;
    source?: 'google' | 'user';
    photoSource?: 'google' | 'user';
  };
  type?: 'check-in' | 'post';
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export function ProfilePostCard({ post, type = 'post', onEdit, onDelete }: ProfilePostCardProps) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [liking, setLiking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageUrlsError, setImageUrlsError] = useState<boolean[]>([]);

  // Handle like functionality
  const handleLike = async () => {
    if (liking) return;
    
    setLiking(true);
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : likeCount - 1;
    
    // Optimistic update
    setLiked(newLiked);
    setLikeCount(newCount);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      toast({
        title: newLiked ? "Liked!" : "Unliked",
        description: newLiked ? "Added to your favorites" : "Removed from favorites",
      });
    } catch (error) {
      // Revert on error
      setLiked(!newLiked);
      setLikeCount(liked ? likeCount + 1 : likeCount - 1);
      
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLiking(false);
    }
  };

  // Handle disabled comments
  const handleComments = () => {
    toast({
      title: "Coming Soon",
      description: "Comments feature will be available soon!",
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(post.id);
    } else {
      // Fallback: navigate to edit page or show edit modal
      toast({
        title: "Edit Post",
        description: "Edit functionality will open the post editor.",
      });
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(post.id);
    }
  };

  return (
    <Card className="overflow-hidden shadow-coffee border-0 bg-card/80 backdrop-blur-sm">
      {/* Label */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <span className={`inline-block text-xs font-bold rounded px-2 py-1 mb-2 ${type === 'check-in' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            {type === 'check-in' ? 'Check-In' : 'Shared Photo'}
          </span>
          
          {/* Edit/Delete Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (post.placeId) {
                    navigate(`/cafe/${post.placeId}`);
                  }
                }}
                className="font-semibold text-sm hover:text-primary transition-colors text-left"
                disabled={!post.placeId}
              >
                {post.cafeName}
              </button>
              <p className="text-xs text-muted-foreground">{post.neighborhood}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{post.rating}</span>
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="relative">
        {/* Show multiple images if available, otherwise fallback to single image */}
        {post.imageUrls && post.imageUrls.length > 1 ? (
          <div className="grid grid-cols-2 gap-1 h-64">
            {post.imageUrls.slice(0, 4).map((url, index) => (
              <div key={index} className="relative">
                {imageUrlsError[index] ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <div className="text-2xl mb-1">📷</div>
                      <div className="text-xs">Image unavailable</div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`${post.cafeName} post ${index + 1}`}
                    className={`w-full h-full object-cover ${
                      index === 0 && post.imageUrls!.length === 3 ? 'col-span-2' : ''
                    }`}
                    onError={() => {
                      console.error('Failed to load image:', url);
                      setImageUrlsError(prev => {
                        const newErrors = [...prev];
                        newErrors[index] = true;
                        return newErrors;
                      });
                    }}
                  />
                )}
                {/* Show +N indicator for more images */}
                {index === 3 && post.imageUrls!.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      +{post.imageUrls!.length - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-64 bg-muted flex items-center justify-center">
            {imageError || !post.imageUrl || post.imageUrl === 'null' || post.imageUrl === '' ? (
              <div className="text-center text-muted-foreground">
                <div className="text-4xl mb-2">☕</div>
                <div className="text-sm font-medium">{post.cafeName} post</div>
                <div className="text-xs">No image available</div>
              </div>
            ) : (
              <img
                src={post.imageUrl}
                alt={`${post.cafeName} post`}
                className="w-full h-full object-cover"
                onError={() => {
                  console.error('Failed to load image:', post.imageUrl);
                  setImageError(true);
                }}
              />
            )}
          </div>
        )}
        
        {/* Google Attribution for Photos */}
        {post.photoSource === 'google' && (post.imageUrl || (post.imageUrls && post.imageUrls.length > 0)) && (
          <GoogleAttributionOverlay 
            type="photo" 
            sourceUrl={post.placeId ? `https://www.google.com/maps/search/?api=1&query_place_id=${post.placeId}` : undefined}
          />
        )}
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
        
        {/* Google Review Attribution */}
        {post.source === 'google' && post.textReview && (
          <div className="mb-3">
            <GoogleAttribution 
              type="review" 
              sourceUrl={post.placeId ? `https://www.google.com/maps/search/?api=1&query_place_id=${post.placeId}` : undefined}
              size="sm"
            />
          </div>
        )}
        
        {/* Username */}
        {post.username && (
          <p className="text-xs text-muted-foreground mb-3">
            by @{post.username}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Functional Like Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 px-2 transition-smooth ${liked ? 'text-red-500' : ''}`}
              onClick={handleLike}
              disabled={liking}
            >
              <Heart className={`w-4 h-4 mr-1 transition-smooth ${liked ? 'fill-current' : ''} ${liking ? 'scale-110' : ''}`} />
              <span className="text-sm">{likeCount}</span>
            </Button>
            
            {/* Disabled Comments Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 opacity-50 cursor-not-allowed"
              onClick={handleComments}
            >
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
