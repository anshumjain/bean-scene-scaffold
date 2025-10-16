import { useState, useEffect } from "react";
import { Heart, MessageCircle, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoogleAttribution, GoogleAttributionOverlay } from "@/components/Attribution/GoogleAttribution";
import { UserLevelDisplay } from "@/components/ui/level-badge";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatTimeAgo } from "@/services/utils";
import { getUserStats } from "@/services/gamificationService";
import { hasPhoto, getPostLayoutType, tagsToVibes, getTextPostTags } from "@/utils/tagMappings";

interface PostCardProps {
  post: {
    id: string;
    cafeName: string;
    neighborhood: string;
    imageUrl: string; // Keep for backward compatibility
    imageUrls?: string[]; // New field for multiple images
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
}

export function PostCard({ post, type = 'post' }: PostCardProps) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [liking, setLiking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageUrlsError, setImageUrlsError] = useState<boolean[]>([]);
  const [userLevel, setUserLevel] = useState<number>(1);
  
  // Determine layout type
  const layoutType = getPostLayoutType(post);
  const postHasPhoto = hasPhoto(post);

  // Fetch user level when component mounts
  useEffect(() => {
    const fetchUserLevel = async () => {
      if (post.username) {
        try {
          const stats = await getUserStats(undefined, undefined, post.username);
          if (stats) {
            setUserLevel(stats.current_level);
          }
        } catch (error) {
          console.error('Error fetching user level:', error);
        }
      }
    };

    fetchUserLevel();
  }, [post.username]);

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

  // Render photo layout (existing behavior)
  if (layoutType === 'photo') {
    return (
      <Card className="overflow-hidden shadow-coffee border-0 bg-card/80 backdrop-blur-sm">
        {/* Label */}
        {type === 'check-in' && (
          <div className="px-4 pt-4">
            <div className="text-xs font-medium text-green-700 mb-2">
              {post.username ? (
                <UserLevelDisplay username={post.username} level={userLevel} className="text-green-700" />
              ) : (
                'Anonymous'
              )} checked in to @{post.cafeName}
            </div>
          </div>
        )}
        
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
            {post.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{post.rating}</span>
              </div>
            )}
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
          {/* Review Text */}
          {post.textReview && (
            <p className="text-sm text-foreground mb-3 leading-relaxed">
              {post.textReview}
            </p>
          )}
          
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
          
          {/* Tags as small pills for photo posts */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Username */}
          {post.username && (
            <div className="mb-3">
              <UserLevelDisplay username={post.username} level={userLevel} />
            </div>
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
            <span className="text-xs text-muted-foreground">{formatTimeAgo(post.createdAt)}</span>
          </div>
        </div>
      </Card>
    );
  }

  // Render text layout (no photo, compact)
  if (layoutType === 'text') {
    const tagDisplay = post.tags ? getTextPostTags(post.tags) : { mapped: [], unmapped: [] };
    
    // Calculate dynamic height based on content
    const hasCaption = Boolean(post.textReview?.trim());
    const hasTags = tagDisplay.mapped.length > 0 || tagDisplay.unmapped.length > 0;
    const hasRating = post.rating > 0;
    const contentHeight = hasCaption && hasTags ? 'h-auto' : 'h-auto'; // Let it grow naturally
    
    return (
      <Card className={`overflow-hidden shadow-coffee border-0 bg-card/80 backdrop-blur-sm ${contentHeight}`}>
        {/* Header with username and timestamp */}
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            {post.username ? (
              <UserLevelDisplay username={post.username} level={userLevel} />
            ) : (
              <span className="text-sm font-medium text-muted-foreground">Anonymous</span>
            )}
            <span className="text-xs text-muted-foreground">{formatTimeAgo(post.createdAt)}</span>
          </div>
          
          {/* Cafe info */}
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-3 h-3 text-primary" />
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
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{post.neighborhood}</span>
          </div>
          
          {/* Rating */}
          {post.rating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${star <= post.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          {/* Caption */}
          {post.textReview && (
            <p className="text-sm text-foreground mb-3 leading-relaxed">
              {post.textReview}
            </p>
          )}
          
          {/* Tags/Vibes - unified display */}
          {(tagDisplay.mapped.length > 0 || tagDisplay.unmapped.length > 0) && (
            <div className="mb-3">
              {/* Show mapped vibes as emoji list */}
              {tagDisplay.mapped.length > 0 && (
                <div className="space-y-1 mb-2">
                  {tagDisplay.mapped.map((vibe, index) => (
                    <p key={index} className="text-sm text-foreground">
                      {vibe}
                    </p>
                  ))}
                </div>
              )}
              
              {/* Show unmapped tags as simple pills */}
              {tagDisplay.unmapped.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tagDisplay.unmapped.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
          </div>
        </div>
      </Card>
    );
  }

  // Render minimal layout (very compact)
  return (
    <Card className="overflow-hidden shadow-coffee border-0 bg-card/80 backdrop-blur-sm">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {post.username ? (
              <UserLevelDisplay username={post.username} level={userLevel} />
            ) : (
              <span className="text-sm font-medium text-muted-foreground">Anonymous</span>
            )}
            <span className="text-xs text-muted-foreground">checked in at</span>
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
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-6 px-2 transition-smooth ${liked ? 'text-red-500' : ''}`}
              onClick={handleLike}
              disabled={liking}
            >
              <Heart className={`w-3 h-3 mr-1 transition-smooth ${liked ? 'fill-current' : ''} ${liking ? 'scale-110' : ''}`} />
              <span className="text-xs">{likeCount}</span>
            </Button>
            <span className="text-xs text-muted-foreground">{formatTimeAgo(post.createdAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}