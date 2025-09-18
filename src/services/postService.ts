// src/services/postService.ts

import { Post, SearchFilters, ApiResponse, CheckInData } from './types';
import { fetchCafeDetails } from './cafeService';
import { uploadImage } from './cloudinaryService';
import { generateId } from './utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Fetch posts for the main feed with optional filters
 */
export async function fetchPosts(filters: SearchFilters = {}): Promise<ApiResponse<Post[]>> {
  try {
    const params = new URLSearchParams();
    if (filters.tags) params.append('tags', filters.tags.join(','));
    if (filters.neighborhoods) params.append('neighborhoods', filters.neighborhoods.join(','));
    if (filters.query) params.append('query', filters.query);

    const response = await fetch(`${API_BASE_URL}/api/posts?${params.toString()}`);
    const data: Post[] = await response.json();

    return { data, success: true };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch posts'
    };
  }
}

/**
 * Fetch posts for a specific cafe by placeId
 */
export async function fetchCafePostsById(place_id: string): Promise<ApiResponse<Post[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/posts?placeId=${encodeURIComponent(placeId)}`);
    const data: Post[] = await response.json();

    return { data, success: true };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cafe posts'
    };
  }
}

/**
 * Filter feed posts by a specific tag
 */
export async function filterFeedByTag(tag: string): Promise<ApiResponse<Post[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/posts?tag=${encodeURIComponent(tag)}`);
    const data: Post[] = await response.json();

    return { data, success: true };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch posts by tag'
    };
  }
}

/**
 * Submit a new check-in post
 */
export async function submitCheckin(checkinData: CheckInData): Promise<ApiResponse<Post>> {
  try {
    let imageUrl = checkinData.imageUrl || '';

    // Upload image to Cloudinary if file is provided
    if (checkinData.imageFile) {
      const uploadResult = await uploadImage(checkinData.imageFile);
      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }
      imageUrl = uploadResult.data.url;
    }

    // Fetch cafe details
    const cafeResult = await fetchCafeDetails(checkinData.placeId);
    const cafe = cafeResult.data;
    if (!cafe) throw new Error('Cafe not found');

    const payload = {
      id: generateId(),
      userId: 'current_user', // TODO: Replace with actual user auth
      cafeId: checkinData.cafeId,
      place_id: checkinData.place_id,
      imageUrl,
      rating: checkinData.rating,
      textReview: checkinData.review,
      tags: checkinData.tags,
      createdAt: new Date().toISOString(),
      cafe: {
        name: cafe.name,
        neighborhood: cafe.neighborhood,
        place_id: cafe.place_id
      }
    };

    const response = await fetch(`${API_BASE_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data: Post = await response.json();

    return { data, success: true };
  } catch (error) {
    return {
      data: {} as Post,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit check-in'
    };
  }
}

/**
 * Like a post
 */
export async function likePost(postId: string): Promise<ApiResponse<boolean>> {
  try {
    await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, { method: 'POST' });
    return { data: true, success: true };
  } catch (error) {
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to like post'
    };
  }
}

/**
 * Unlike a post
 */
export async function unlikePost(postId: string): Promise<ApiResponse<boolean>> {
  try {
    await fetch(`${API_BASE_URL}/api/posts/${postId}/unlike`, { method: 'POST' });
    return { data: true, success: true };
  } catch (error) {
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlike post'
    };
  }
}

/**
 * Search posts by query string
 */
export async function searchPosts(query: string): Promise<ApiResponse<Post[]>> {
  return fetchPosts({ query });
}

/**
 * Fetch trending posts (most liked in last 7 days)
 */
export async function fetchTrendingPosts(): Promise<ApiResponse<Post[]>> {
  try {
    const { data: allPosts } = await fetchPosts();

    // Simple trending: sort by likes
    const trendingPosts = allPosts
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 10);

    return { data: trendingPosts, success: true };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trending posts'
    };
  }
}
