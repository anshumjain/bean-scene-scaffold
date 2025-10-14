import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { uploadImage } from '@/services/cloudinaryService';
import { supabase } from '@/integrations/supabase/client';

interface CafePhotoUploadProps {
  cafeId: string;
  placeId: string;
  cafeName: string;
  onPhotoAdded?: (photoUrl: string) => void;
}

export function CafePhotoUpload({ cafeId, placeId, cafeName, onPhotoAdded }: CafePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploading(true);
    try {
      // Upload to Cloudinary
      const uploadResult = await uploadImage(file);
      
      if (uploadResult.success && uploadResult.data) {
        const uploadedUrl = uploadResult.data.secure_url;
        
        // Add photo to cafe directly via Supabase
        const { data: photoData, error: photoError } = await supabase
          .from('cafe_photos')
          .insert({
            cafe_id: cafeId,
            photo_url: uploadedUrl,
            uploaded_by: 'current-user', // Note: Will be replaced with actual user ID from auth context
            is_hero: false, // Will be set to true if this becomes the hero
            photo_source: 'user'
          })
          .select()
          .single();

        if (photoError) {
          console.error('Error adding photo to cafe_photos:', photoError);
          toast({
            title: "Database Error",
            description: `Failed to save photo to database: ${photoError.message}`,
            variant: "destructive"
          });
          return;
        }

        // Check if this cafe has a hero photo, if not, set this as the hero
        const { data: cafeData, error: cafeError } = await supabase
          .from('cafes')
          .select('hero_photo_url')
          .eq('id', cafeId)
          .single();

        if (cafeError) {
          console.error('Error fetching cafe:', cafeError);
          toast({
            title: "Database Error",
            description: `Failed to fetch cafe details: ${cafeError.message}`,
            variant: "destructive"
          });
          return;
        }

        console.log('Current cafe hero_photo_url:', cafeData.hero_photo_url);
        console.log('Uploaded URL:', uploadedUrl);

        let isHero = false;

        // If no hero photo exists, set this as the hero
        if (!cafeData.hero_photo_url) {
          console.log('Setting as hero photo...');
          const { error: updateError } = await supabase
            .from('cafes')
            .update({ 
              hero_photo_url: uploadedUrl,
              photo_source: 'user', // Set photo source to user to remove Google overlay
              updated_at: new Date().toISOString()
            })
            .eq('id', cafeId);

          if (updateError) {
            console.error('Error updating hero photo:', updateError);
            toast({
              title: "Warning",
              description: "Photo uploaded but failed to set as hero image. You may need to refresh the page.",
              variant: "destructive"
            });
          } else {
            console.log('Successfully updated hero photo in database');
            isHero = true;
            // Mark this photo as the hero
            await supabase
              .from('cafe_photos')
              .update({ is_hero: true })
              .eq('id', photoData.id);
          }
        } else {
          console.log('Cafe already has a hero photo, not replacing');
        }

        toast({
          title: "Photo uploaded!",
          description: isHero 
            ? "Your photo has been set as the cafe's hero image!" 
            : "Your photo has been added to the cafe"
        });

        if (onPhotoAdded) {
          onPhotoAdded(uploadedUrl);
        }
      } else {
        console.error('Cloudinary upload failed:', uploadResult.error);
        toast({
          title: "Upload Failed",
          description: uploadResult.error || 'Failed to upload image to cloud storage',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div 
        className="h-full flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 transition-colors rounded-lg"
        onClick={handleUploadClick}
      >
        <div className="flex flex-col items-center text-center p-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-primary" />
            )}
          </div>
          <h3 className="font-medium text-foreground mb-1">
            {isUploading ? "Uploading..." : "Add a photo"}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {isUploading ? "Please wait..." : `Help others discover ${cafeName}`}
          </p>
          {!isUploading && (
            <Button size="sm" variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Choose Photo
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}