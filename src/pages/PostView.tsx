import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Camera, Settings, X, Calendar, Heart, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/Layout/AppLayout";
import { deletePost, getPostComments, addComment, likePost, unlikePost, hasUserLikedPost } from "@/services/postService";
import { useToast } from "@/hooks/use-toast";
import type { Post, Comment } from "@/services/types";
import { formatTimeAgo } from "@/services/utils";

export default function PostView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { id: postId } = useParams<{ id: string }>();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [showEditDelete, setShowEditDelete] = useState(false);

  // Load post data and comments
  useEffect(() => {
    const loadPostData = async () => {
      if (!postId) {
        navigate('/feed');
        return;
      }

      try {
        setLoading(true);
        
        // For now, get post from location state (passed from PostCard)
        // TODO: Implement fetchPostById function for direct URL access
        if (location.state?.post) {
          setPost(location.state.post);
          setLikeCount(location.state.post.likes || 0);
          
          // Load comments
          const commentsResult = await getPostComments(postId);
          if (commentsResult.success) {
            setComments(commentsResult.data);
          }
          
          // Check if user has liked this post
          const likeResult = await hasUserLikedPost(postId);
          if (likeResult.success) {
            setLiked(likeResult.data);
          }
        } else {
          // No post data, redirect back
          navigate('/feed');
        }
      } catch (error) {
        console.error('Error loading post:', error);
        toast({
          title: "Error",
          description: "Failed to load post",
          variant: "destructive"
        });
        navigate('/feed');
      } finally {
        setLoading(false);
      }
    };

    loadPostData();
  }, [postId, location.state, navigate, toast]);

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
        toast({
          title: "Post deleted",
          description: "Your post has been successfully deleted.",
        });
        navigate('/profile');
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

  const handleEditPost = (postId: string) => {
    navigate('/edit-post', { 
      state: { post: post } 
    });
  };

  // Handle like functionality
  const handleLike = async () => {
    if (!post || liking) return;

    setLiking(true);
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : likeCount - 1;

    // Optimistic update
    setLiked(newLiked);
    setLikeCount(newCount);

    try {
      // Call actual API
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

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!post || !newComment.trim() || commenting) return;

    setCommenting(true);
    const commentText = newComment.trim();

    try {
      const result = await addComment(post.id, commentText);
      
      if (result.success) {
        setComments(prev => [...prev, result.data]);
        setNewComment("");
        toast({
          title: "Comment added",
          description: "Your comment has been posted",
        });
      } else {
        throw new Error(result.error || 'Failed to add comment');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCommenting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading post...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!post) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/feed')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Feed
            </Button>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Post not found</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/feed')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Button>
        </div>

        {/* Post Content */}
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Cafe Info */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Cafe Name and Rating */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">{post.cafe?.name || 'Unknown Cafe'}</h1>
                    {post.cafe?.neighborhood && (
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {post.cafe.neighborhood}
                        </span>
                      </div>
                    )}
                    {post.cafe?.address && post.cafe.address.trim() && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {post.cafe.address}
                      </p>
                    )}
                  </div>
                  {post.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-lg font-semibold">{post.rating}</span>
                    </div>
                  )}
                </div>

                {/* Post Type and Date */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Camera className="w-4 h-4" />
                    <span>{post.imageUrl || (post.imageUrls && post.imageUrls.length > 0) ? 'Shared Photo' : 'Check-in'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatTimeAgo(post.createdAt)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          {(post.imageUrl || (post.imageUrls && post.imageUrls.length > 0)) && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Photos</h3>
                  <div className="grid gap-4">
                    {/* Single image */}
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt={`${post.cafe?.name || 'Cafe'} post`}
                        className="w-full h-64 object-cover rounded-lg border border-border"
                      />
                    )}
                    
                    {/* Multiple images */}
                    {post.imageUrls && post.imageUrls.length > 0 && (
                      post.imageUrls.map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`${post.cafe?.name || 'Cafe'} post ${index + 1}`}
                          className="w-full h-64 object-cover rounded-lg border border-border"
                        />
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review Text */}
          {post.textReview && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Review</h3>
                  <p className="text-foreground leading-relaxed">{post.textReview}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-primary/10 text-primary border-0"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Like and Comments Section */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Like Button */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    disabled={liking}
                    className="flex items-center gap-2"
                  >
                    <Heart 
                      className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} 
                    />
                    <span className={liked ? 'text-red-500' : 'text-gray-500'}>
                      {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                    </span>
                  </Button>
                </div>

                {/* Comments Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Comments ({comments.length})
                  </h3>

                  {/* Comment Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                      disabled={commenting}
                    />
                    <Button
                      size="sm"
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || commenting}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {comment.username?.charAt(0).toUpperCase() || 'A'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {comment.username || 'Anonymous'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowEditDelete(!showEditDelete)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Post
            </Button>
          </div>

          {/* Edit/Delete Options */}
          {showEditDelete && (
            <Card className="border-destructive/20">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-destructive">Manage Post</h3>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEditPost(post.id)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Post
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Delete Post
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
