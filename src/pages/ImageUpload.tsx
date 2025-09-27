import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Upload, X, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/Layout/AppLayout';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/services/cloudinaryService';
import { fetchCafeDetails } from '@/services/cafeService';
import type { Cafe } from '@/services/types';

export default function ImageUpload() {
  const navigate = useNavigate();
  const { id: placeId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load cafe details
  useEffect(() => {
    const loadCafe = async () => {
      if (!placeId) {
        navigate('/explore');
        return;
      }

      try {
        const result = await fetchCafeDetails(placeId);
        if (result.success && result.data) {
          setCafe(result.data);
        } else {
          toast({
            title: "Error",
            description: "Cafe not found",
            variant: "destructive"
          });
          navigate('/explore');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load cafe details",
          variant: "destructive"
        });
        navigate('/explore');
      } finally {
        setLoading(false);
      }
    };

    loadCafe();
  }, [placeId, navigate, toast]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
  };

  const handleUpload = async () => {
    if (!selectedFile || !cafe) return;

    setIsUploading(true);
    try {
      // Upload to Cloudinary
      const uploadResult = await uploadImage(selectedFile);
      
      if (uploadResult.success && uploadResult.data) {
        const uploadedUrl = uploadResult.data.secure_url;
        
        // Add photo to cafe via API
        const response = await fetch('/api/add-cafe-photo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cafeId: cafe.id,
            photoUrl: uploadedUrl,
            uploadedBy: 'current-user' // TODO: Get from auth context
          })
        });

        const result = await response.json();

        if (result.success) {
          toast({
            title: "Photo uploaded!",
            description: "Your photo has been added to the cafe"
          });
          navigate(`/cafe/${cafe.placeId}`);
        } else {
          throw new Error(result.error || 'Failed to add photo to cafe');
        }
      } else {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading cafe details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!cafe) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center">
          <div className="text-center p-6">
            <h2 className="text-xl font-semibold mb-2">Cafe Not Found</h2>
            <p className="text-muted-foreground mb-4">This cafe could not be found.</p>
            <Button onClick={() => navigate("/explore")}>Back to Explore</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold">Add Photo</h1>
              <p className="text-sm text-muted-foreground">{cafe.name}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Select Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewUrl ? (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                      onClick={handleRemoveFile}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleRemoveFile}
                      className="flex-1"
                    >
                      Choose Different Photo
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="flex-1 coffee-gradient text-white"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-1">Add a photo</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Help others discover {cafe.name}
                      </p>
                      <Button variant="outline" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Choose Photo
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guidelines */}
          <Card className="bg-muted/30 border-0">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Photo Guidelines</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Show the cafe's atmosphere and interior</li>
                <li>• Include coffee, food, or drinks if possible</li>
                <li>• Good lighting and clear focus</li>
                <li>• Maximum file size: 10MB</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
