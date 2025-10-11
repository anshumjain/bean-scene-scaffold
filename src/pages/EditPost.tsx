import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Star, X, Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/Layout/AppLayout";
import { updatePost } from "@/services/postService";
import { uploadImage } from "@/services/cloudinaryService";
import { useToast } from "@/hooks/use-toast";
import type { Post } from "@/services/types";

const predefinedTags = [
  "cozy", "wifi", "study-spot", "date-spot", "pet-friendly", 
  "outdoor-seating", "latte-art", "bakery", "quiet", "busy"
];

export default function EditPost() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [post, setPost] = useState<Post | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [textReview, setTextReview] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (location.state?.post) {
      const postData = location.state.post;
      setPost(postData);
      setRating(postData.rating || 0);
      setTextReview(postData.textReview || "");
      setSelectedTags(postData.tags || []);
    } else {
      // No post data, redirect back
      navigate('/profile');
    }
  }, [location.state, navigate]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const normalizedTag = customTag.trim().toLowerCase().replace(/\s+/g, '-');
    if (normalizedTag && !selectedTags.includes(normalizedTag)) {
      setSelectedTags(prev => [...prev, normalizedTag]);
      setCustomTag("");
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Limit to 3 images total (existing + new)
    const currentImageCount = (post?.imageUrls?.length || 0) + selectedImages.length;
    const maxNewImages = Math.max(0, 3 - currentImageCount);
    
    if (files.length > maxNewImages) {
      toast({
        title: "Too many images",
        description: `You can only add ${maxNewImages} more image${maxNewImages === 1 ? '' : 's'}. Maximum 3 images per post.`,
        variant: "destructive",
      });
      return;
    }

    const newImages = files.slice(0, maxNewImages);
    const newPreviews: string[] = [];

    newImages.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === newImages.length) {
          setSelectedImages(prev => [...prev, ...newImages]);
          setImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    // This would require updating the post to remove the image
    // For now, we'll just show a message
    toast({
      title: "Remove existing image",
      description: "To remove existing images, you'll need to delete and recreate the post, or replace all images.",
      variant: "destructive",
    });
  };

  const handleSubmit = async () => {
    if (!post) return;

    try {
      setLoading(true);
      
      let imageUrls = [...(post.imageUrls || [])];
      
      // Upload new images if any are selected
      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(file => uploadImage(file));
        const uploadResults = await Promise.all(uploadPromises);
        
        const failedUploads = uploadResults.filter(result => !result.success);
        if (failedUploads.length > 0) {
          toast({
            title: "Error",
            description: `Failed to upload ${failedUploads.length} image(s). Please try again.`,
            variant: "destructive",
          });
          return;
        }
        
        // Add new image URLs to existing ones
        const newImageUrls = uploadResults.map(result => result.data);
        imageUrls = [...imageUrls, ...newImageUrls];
      }
      
      const result = await updatePost(post.id, {
        rating: rating || undefined,
        textReview: textReview.trim() || undefined,
        tags: selectedTags,
        imageUrls: imageUrls
      });

      if (result.success) {
        toast({
          title: "Post updated!",
          description: "Your post has been successfully updated.",
        });
        navigate('/profile');
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update post",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!post) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-muted-foreground">Loading post...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/profile')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Post</h1>
        </div>

        {/* Cafe Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{post.cafe?.name || 'Unknown Cafe'}</span>
              <span className="text-sm text-muted-foreground">{post.cafe?.neighborhood}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Rating */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star 
                      className={`w-6 h-6 ${
                        star <= rating 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-muted-foreground'
                      }`} 
                    />
                  </button>
                ))}
                <span className="text-sm text-muted-foreground ml-2">
                  {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'No rating'}
                </span>
              </div>
            </div>

            {/* Review Text */}
            <div className="space-y-3 mt-6">
              <label className="text-sm font-medium">Review</label>
              <textarea
                value={textReview}
                onChange={(e) => setTextReview(e.target.value)}
                placeholder="Share your thoughts about this cafe..."
                className="w-full p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={4}
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground text-right">
                {textReview.length}/500 characters
              </div>
            </div>

            {/* Photo Section */}
            <div className="space-y-3 mt-6">
              <label className="text-sm font-medium">Photos (Max 3)</label>
              
              {/* Current Photos */}
              {post.imageUrls && post.imageUrls.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {post.imageUrls.map((imageUrl, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={imageUrl} 
                        alt={`Current photo ${index + 1}`} 
                        className="w-full h-48 object-cover rounded-lg border border-border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeExistingImage(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* New Photo Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={preview} 
                        alt={`New photo ${index + 1}`} 
                        className="w-full h-48 object-cover rounded-lg border border-border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeSelectedImage(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload Button */}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const currentCount = (post?.imageUrls?.length || 0) + selectedImages.length;
                      if (currentCount >= 3) return 'Maximum 3 photos reached';
                      return `Add photos (${currentCount}/3)`;
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click to select images
                  </p>
                </label>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3 mt-6">
              <label className="text-sm font-medium">Tags</label>
              
              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedTags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="cursor-pointer"
                      onClick={() => handleTagToggle(tag)}
                    >
                      #{tag}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Predefined Tags */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Quick tags:</p>
                <div className="flex flex-wrap gap-2">
                  {predefinedTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Tag */}
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Add custom tag..."
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddCustomTag}
                  disabled={!customTag.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate('/profile')}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1 coffee-gradient text-white"
            onClick={handleSubmit}
            disabled={loading || (!rating && !textReview.trim() && selectedTags.length === 0)}
          >
            {loading ? 'Updating...' : 'Update Post'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
