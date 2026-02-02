import { useState, useEffect } from "react";
import { Heart, MessageCircle, MapPin, Star, UserPlus, UserCheck, Loader2 } from "lucide-react";
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
import { followUser, unfollowUser, isFollowing } from "@/services/followService";
import { getUserByUsername } from "@/services/userService";
import { getUsername } from "@/services/userService";

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFollowingUser, setIsFollowingUser] = useState<boolean>(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  
  // Determine layout type
  const layoutType = getPostLayoutType(post);
  const postHasPhoto = hasPhoto(post);

  // Fetch user level, check if post is liked, and check follow status
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

    const checkLikeStatus = async () => {
      try {
        const { hasUserLikedPost } = await import('@/services/postService');
        const result = await hasUserLikedPost(post.id);
        if (result.success) {
          setLiked(result.data);
        }
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };

    const checkFollowStatus = async () => {
      if (!post.username) return;
      
      try {
        // Get current user's username
        const currentUserResult = await getUsername();
        if (!currentUserResult.success || !currentUserResult.data) return;
        
        const currentUser = currentUserResult.data;
        setCurrentUsername(currentUser);
        
        // Don't show follow button if it's the current user's own post
        if (currentUser === post.username) return;
        
        // Get target user ID from username
        const userResult = await getUserByUsername(post.username);
        if (!userResult.success || !userResult.data?.id) return;
        
        setTargetUserId(userResult.data.id);
        
        // Check if following
        const followResult = await isFollowing(userResult.data.id);
        if (followResult.success) {
          setIsFollowingUser(followResult.data);
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    fetchUserLevel();
    checkLikeStatus();
    checkFollowStatus();
  }, [post.username, post.id]);

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
      // Call actual API
      const { likePost, unlikePost } = await import('@/services/postService');
      const result = newLiked ? await likePost(post.id) : await unlikePost(post.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update like');
      }
      
      toast({
        title: newLiked ? "Liked!" : "Unliked",
        description: newLiked ? "You liked this post" : "You unliked this post",
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

  // Handle comments - navigate to individual post view with post data
  const handleComments = () => {
    navigate(`/post/${post.id}`, { 
      state: { post: post } 
    });
  };

  // Handle image navigation
  const handlePreviousImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.imageUrls && post.imageUrls.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? post.imageUrls!.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.imageUrls && post.imageUrls.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === post.imageUrls!.length - 1 ? 0 : prev + 1
      );
    }
  };

  // Get current image to display
  const getCurrentImage = () => {
    if (post.imageUrls && post.imageUrls.length > 0) {
      return post.imageUrls[currentImageIndex];
    }
    return post.imageUrl;
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
                <UserLevelDisplay 
                  username={post.username} 
                  level={userLevel} 
                  className="text-green-700"
                  clickable={true}
                  onClick={(e) => {
                    e?.stopPropagation();
                    navigate(`/profile/${post.username}`);
                  }}
                />
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
          {/* Image Carousel for multiple images */}
          {post.imageUrls && post.imageUrls.length > 1 ? (
            <div className={`relative w-full ${imageUrlsError[currentImageIndex] ? 'h-24' : 'h-64'} bg-muted overflow-hidden`}>
              {/* Main image display */}
              <div className="w-full h-full flex items-center justify-center">
                {imageUrlsError[currentImageIndex] ? (
                  <div className="text-center text-muted-foreground">
                    <div className="text-2xl mb-1">📷</div>
                    <div className="text-xs">Image unavailable</div>
                  </div>
                ) : (
                  <img
                    src={getCurrentImage()}
                    alt={`${post.cafeName} post ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                    onError={() => {
                      console.error('Failed to load image:', getCurrentImage());
                      setImageUrlsError(prev => {
                        const newErrors = [...prev];
                        newErrors[currentImageIndex] = true;
                        return newErrors;
                      });
                    }}
                  />
                )}
              </div>

              {/* Navigation arrows */}
              {post.imageUrls.length > 1 && (
                <>
                  <button
                    onClick={handlePreviousImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* Image indicators */}
              {post.imageUrls.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {post.imageUrls.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Image counter */}
              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {currentImageIndex + 1}/{post.imageUrls.length}
              </div>
            </div>
          ) : (
            /* Single image display */
            <div className={`w-full ${imageError || !getCurrentImage() || getCurrentImage() === 'null' || getCurrentImage() === '' ? 'h-24' : 'h-64'} bg-muted flex items-center justify-center`}>
              {imageError || !getCurrentImage() || getCurrentImage() === 'null' || getCurrentImage() === '' ? (
                <div className="text-center text-muted-foreground">
                  <div className="text-2xl mb-1">☕</div>
                  <div className="text-xs font-medium">{post.cafeName}</div>
                </div>
              ) : (
                <img
                  src={getCurrentImage()}
                  alt={`${post.cafeName} post`}
                  className="w-full h-full object-cover"
                  onError={() => {
                    console.error('Failed to load image:', getCurrentImage());
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
          
          {/* Username with Follow Button */}
          {post.username && (
            <div className="mb-3 flex items-center justify-between">
              <UserLevelDisplay 
                username={post.username} 
                level={userLevel}
                clickable={true}
                onClick={(e) => {
                  e?.stopPropagation();
                  navigate(`/profile/${post.username}`);
                }}
              />
              {targetUserId && currentUsername && currentUsername !== post.username && (
                <Button
                  variant={isFollowingUser ? "outline" : "default"}
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (followingLoading || !targetUserId) return;
                    
                    setFollowingLoading(true);
                    try {
                      if (isFollowingUser) {
                        const result = await unfollowUser(targetUserId);
                        if (result.success) {
                          setIsFollowingUser(false);
                          toast({
                            title: "Unfollowed",
                            description: `You're no longer following @${post.username}`,
                          });
                        } else {
                          toast({
                            title: "Error",
                            description: result.error || "Failed to unfollow",
                            variant: "destructive",
                          });
                        }
                      } else {
                        const result = await followUser(targetUserId);
                        if (result.success) {
                          setIsFollowingUser(true);
                          toast({
                            title: "Following",
                            description: `You're now following @${post.username}`,
                          });
                        } else {
                          toast({
                            title: "Error",
                            description: result.error || "Failed to follow",
                            variant: "destructive",
                          });
                        }
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Something went wrong",
                        variant: "destructive",
                      });
                    } finally {
                      setFollowingLoading(false);
                    }
                  }}
                  disabled={followingLoading}
                  className="h-7 px-2 text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {followingLoading ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : isFollowingUser ? (
                    <>
                      <UserCheck className="w-3 h-3 mr-1" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Functional Like Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 px-2 transition-all duration-200 hover:scale-105 active:scale-95 ${liked ? 'text-red-500' : ''}`}
                onClick={handleLike}
                disabled={liking}
              >
                <Heart className={`w-4 h-4 mr-1 transition-all duration-200 ${liked ? 'fill-current scale-110' : ''} ${liking ? 'animate-pulse' : ''}`} />
                <span className="text-sm">{likeCount}</span>
              </Button>
              
              {/* Comments Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 transition-smooth hover:bg-muted"
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
            <div className="flex items-center gap-2 flex-1">
              {post.username ? (
                <UserLevelDisplay 
                  username={post.username} 
                  level={userLevel}
                  clickable={true}
                  onClick={(e) => {
                    e?.stopPropagation();
                    navigate(`/profile/${post.username}`);
                  }}
                />
              ) : (
                <span className="text-sm font-medium text-muted-foreground">Anonymous</span>
              )}
              {targetUserId && currentUsername && currentUsername !== post.username && (
                <Button
                  variant={isFollowingUser ? "outline" : "ghost"}
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (followingLoading || !targetUserId) return;
                    
                    setFollowingLoading(true);
                    try {
                      if (isFollowingUser) {
                        const result = await unfollowUser(targetUserId);
                        if (result.success) {
                          setIsFollowingUser(false);
                          toast({
                            title: "Unfollowed",
                            description: `You're no longer following @${post.username}`,
                          });
                        }
                      } else {
                        const result = await followUser(targetUserId);
                        if (result.success) {
                          setIsFollowingUser(true);
                          toast({
                            title: "Following",
                            description: `You're now following @${post.username}`,
                          });
                        }
                      }
                    } finally {
                      setFollowingLoading(false);
                    }
                  }}
                  disabled={followingLoading}
                  className="h-6 px-2 text-xs ml-auto transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {followingLoading ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : isFollowingUser ? (
                    <>
                      <UserCheck className="w-3 h-3 mr-1" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>
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
                className="h-8 px-2 transition-smooth hover:bg-muted"
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
              <UserLevelDisplay 
                username={post.username} 
                level={userLevel}
                clickable={true}
                onClick={(e) => {
                  e?.stopPropagation();
                  navigate(`/profile/${post.username}`);
                }}
              />
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