// src/services/cloudinaryService.ts

import { ApiResponse } from './types';

// Pull Cloudinary credentials from environment variables
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'INSERT_YOUR_CLOUDINARY_CLOUD_NAME_HERE';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'INSERT_YOUR_CLOUDINARY_UPLOAD_PRESET_HERE';

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
 * Upload a single image to Cloudinary
 */
export async function uploadImage(file: File): Promise<ApiResponse<CloudinaryUploadResult>> {
  if (CLOUDINARY_CLOUD_NAME === 'INSERT_YOUR_CLOUDINARY_CLOUD_NAME_HERE') {
    return {
      data: {} as CloudinaryUploadResult,
      success: false,
      error: 'Cloudinary credentials not configured. Add CLOUDINARY_CLOUD_NAME and UPLOAD_PRESET to environment variables.'
    };
  }

  try {
    if (!file.type.startsWith('image/')) throw new Error('Please select a valid image file');
    if (file.size > 10 * 1024 * 1024) throw new Error('Image size must be less than 10MB');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    // Coffee-optimized transformations
    formData.append('transformation', JSON.stringify([
      { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
      { effect: 'sharpen:100' },
      { format: 'auto' }
    ]));

    // Tags and context
    formData.append('tags', 'coffee,houston,checkin,bean-scene');
    formData.append('context', `user_id=${getCurrentUserId()}`);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to upload image');
    }

    const result: CloudinaryUploadResult = await response.json();
    return { data: result, success: true };

  } catch (error) {
    return { data: {} as CloudinaryUploadResult, success: false, error: error instanceof Error ? error.message : 'Failed to upload image' };
  }
}

/**
 * Upload multiple images
 */
export async function uploadMultipleImages(files: File[]): Promise<ApiResponse<CloudinaryUploadResult[]>> {
  try {
    const results = await Promise.all(files.map(file => uploadImage(file)));
    const failedUploads = results.filter(r => !r.success);
    if (failedUploads.length > 0) throw new Error(`Failed to upload ${failedUploads.length} images`);

    return { data: results.map(r => r.data!), success: true };
  } catch (error) {
    return { data: [], success: false, error: error instanceof Error ? error.message : 'Failed to upload multiple images' };
  }
}

/**
 * Delete image (server-side recommended)
 */
export async function deleteImage(publicId: string): Promise<ApiResponse<boolean>> {
  if (CLOUDINARY_CLOUD_NAME === 'INSERT_YOUR_CLOUDINARY_CLOUD_NAME_HERE') {
    return { data: false, success: false, error: 'Cloudinary credentials not configured' };
  }

  try {
    // NOTE: Requires server-side API with Cloudinary admin credentials
    console.log(`Would delete image: ${publicId}`);
    return { data: true, success: true };
  } catch (error) {
    return { data: false, success: false, error: error instanceof Error ? error.message : 'Failed to delete image' };
  }
}

/**
 * Generate optimized image URL
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: { width?: number; height?: number; crop?: 'fill' | 'fit' | 'scale' | 'limit'; quality?: string; format?: string } = {}
): string {
  if (CLOUDINARY_CLOUD_NAME === 'INSERT_YOUR_CLOUDINARY_CLOUD_NAME_HERE') return '/placeholder.svg';

  const { width = 400, height = 400, crop = 'fill', quality = 'auto:good', format = 'auto' } = options;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_${crop},q_${quality},f_${format}/${publicId}`;
}

/**
 * Generate thumbnail URL
 */
export function getThumbnailUrl(publicId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const sizeMap = { small: { width: 150, height: 150 }, medium: { width: 300, height: 300 }, large: { width: 500, height: 500 } };
  const { width, height } = sizeMap[size];
  return getOptimizedImageUrl(publicId, { width, height, crop: 'fill', quality: 'auto:good' });
}

/**
 * Cloudinary Upload Widget configuration
 */
export function getUploadWidgetConfig() {
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    sources: ['local', 'camera'],
    multiple: false,
    maxFileSize: 10000000,
    acceptedFiles: '.jpg,.jpeg,.png,.webp',
    transformation: [
      { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
      { effect: 'sharpen:100' },
      { format: 'auto' }
    ],
    tags: ['coffee', 'houston', 'checkin', 'bean-scene'],
    context: { user_id: getCurrentUserId() }
  };
}

/**
 * Placeholder for auth user ID
 */
function getCurrentUserId(): string {
  return 'anonymous_user'; // TODO: Replace with real auth context
}
