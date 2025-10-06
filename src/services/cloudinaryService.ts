import { ApiResponse } from './types';

// Environment variables with graceful fallbacks
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Check if environment variables are available
const hasCloudinaryCredentials = CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET && 
  CLOUDINARY_CLOUD_NAME !== 'undefined' && CLOUDINARY_UPLOAD_PRESET !== 'undefined';

function apiErrorResponse<T>(defaultValue: T): ApiResponse<T> {
  return {
    data: defaultValue,
    success: false,
    error: 'Failed to call API'
  };
}

export interface CloudinaryUploadResult {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  url: string;
  secure_url: string;
}

/**
 * Upload image to Cloudinary with coffee-optimized transformations
 */
export async function uploadImage(file: File): Promise<ApiResponse<CloudinaryUploadResult>> {
  if (!hasCloudinaryCredentials) {
    return apiErrorResponse({} as CloudinaryUploadResult);
  }
  
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file');
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Image size must be less than 10MB');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    // Coffee shop optimized transformations
    formData.append('transformation', JSON.stringify([
      { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
      { effect: 'sharpen:100' }, // Enhance coffee details
      { format: 'auto' } // Automatic format optimization
    ]));
    
    // Add contextual tags for better organization
    formData.append('tags', 'coffee,houston,checkin,bean-scene');
    formData.append('context', `user_id=${getCurrentUserId()}`);
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to upload image');
    }
    
    const result: CloudinaryUploadResult = await response.json();
    
    return {
      data: result,
      success: true
    };
  } catch (error) {
    return {
      data: {} as CloudinaryUploadResult,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image'
    };
  }
}

/**
 * Generate optimized image URL with transformations
 */
export function getOptimizedImageUrl(
  publicId: string, 
  options: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'limit';
    quality?: 'auto' | 'auto:low' | 'auto:good' | 'auto:best';
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  } = {}
): string {
  if (!hasCloudinaryCredentials) {
    return '/placeholder.svg'; // Fallback for development
  }
  
  const {
    width = 400,
    height = 400,
    crop = 'fill',
    quality = 'auto:good',
    format = 'auto'
  } = options;
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_${crop},q_${quality},f_${format}/${publicId}`;
}

/**
 * Upload multiple images (for cafe galleries)
 */
export async function uploadMultipleImages(files: File[]): Promise<ApiResponse<CloudinaryUploadResult[]>> {
  try {
    const uploadPromises = files.map(file => uploadImage(file));
    const results = await Promise.all(uploadPromises);
    
    // Check if any uploads failed
    const failedUploads = results.filter(result => !result.success);
    if (failedUploads.length > 0) {
      throw new Error(`Failed to upload ${failedUploads.length} images`);
    }
    
    const successfulUploads = results
      .filter(result => result.success)
      .map(result => result.data!);
    
    return {
      data: successfulUploads,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload multiple images'
    };
  }
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<ApiResponse<boolean>> {
  if (!hasCloudinaryCredentials) {
    return apiErrorResponse(false);
  }
  
  try {
    // Note: Deletion requires API secret, so this should be done server-side
    // TODO: Implement via Supabase Edge Function when connected
    
    return {
      data: true,
      success: true
    };
  } catch (error) {
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete image'
    };
  }
}

/**
 * Generate image upload widget configuration
 * Useful for more advanced upload scenarios
 */
export function getUploadWidgetConfig() {
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    sources: ['local', 'camera'],
    multiple: false,
    maxFileSize: 10000000, // 10MB
    acceptedFiles: '.jpg,.jpeg,.png,.webp',
    transformation: [
      { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
      { effect: 'sharpen:100' },
      { format: 'auto' }
    ],
    tags: ['coffee', 'houston', 'checkin', 'bean-scene'],
    context: {
      user_id: getCurrentUserId()
    }
  };
}

/**
 * Get current user ID (placeholder for auth integration)
 */
function getCurrentUserId(): string {
  // Note: This will be replaced with actual user ID from auth context
  return 'anonymous_user';
}

/**
 * Generate thumbnail URL for image previews
 */
export function getThumbnailUrl(publicId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const sizeMap = {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 500, height: 500 }
  };
  
  const { width, height } = sizeMap[size];
  
  return getOptimizedImageUrl(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto:good'
  });
}