import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { uploadImage } from '@/services/cloudinaryService';

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

  const handleUploadClick = () => {
    navigate(`/cafe/${placeId}/upload`);
  };

  return (
    <Card className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
      <div 
        className="h-full flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 transition-colors rounded-lg"
        onClick={handleUploadClick}
      >
        <div className="flex flex-col items-center text-center p-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Camera className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-medium text-foreground mb-1">Add a photo</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Help others discover {cafeName}
          </p>
          <Button size="sm" variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Choose Photo
          </Button>
        </div>
      </div>
    </Card>
  );
}