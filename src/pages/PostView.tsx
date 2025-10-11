import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Camera, Settings, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/Layout/AppLayout";
import { deletePost } from "@/services/postService";
import { useToast } from "@/hooks/use-toast";
import type { Post } from "@/services/types";
import { formatTimeAgo } from "@/services/utils";

export default function PostView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [post, setPost] = useState<Post | null>(null);
  const [showEditDelete, setShowEditDelete] = useState(false);

  useEffect(() => {
    if (location.state?.post) {
      setPost(location.state.post);
    } else {
      // No post data, redirect back
      navigate('/profile');
    }
  }, [location.state, navigate]);

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

  if (!post) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
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
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
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
