import { Post, SearchFilters, ApiResponse, CheckInData } from './types';
import { fetchCafeDetails } from './cafeService';
import { uploadImage } from './cloudinaryService';
import { generateId, formatTimeAgo } from './utils';
import { ImageOptimizationService } from './imageOptimizationService';
import { MonitoringService } from './monitoringService';
import { supabase } from '@/integrations/supabase/client';
import { getUsername, getDeviceId } from './userService';
import { logActivity } from './activityService';

function apiErrorResponse<T>(defaultValue: T): ApiResponse<T> {
  return {
    data: defaultValue,
    success: false,
    error: 'Failed to call API'
  };
}

/**
 * Fetch posts for the main feed with optional filters
 */
export async function fetchPosts(filters: SearchFilters = {}): Promise<ApiResponse<Post[]>> {
  try {
    let query = supabase
      .from('posts')
      .select(`
        *,
        cafes (name, neighborhood, place_id)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }
    
    if (filters.neighborhoods && filters.neighborhoods.length > 0) {
      query = query.in('cafes.neighborhood', filters.neighborhoods);
    }
    
    if (filters.query) {
      query = query.or(`text_review.ilike.%${filters.query}%,cafes.name.ilike.%${filters.query}%,tags.cs.{${filters.query}}`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Transform database format to app format
    const posts: Post[] = (data || []).map(post => ({
      id: post.id,
      userId: post.user_id,
      cafeId: post.cafe_id,
      placeId: post.place_id,
      imageUrl: post.image_url,
      rating: post.rating,
      textReview: post.text_review,
      tags: post.tags || [],
      likes: post.likes,
      comments: post.comments,
      createdAt: post.created_at,
      cafe: post.cafes ? {
        name: post.cafes.name,
        neighborhood: post.cafes.neighborhood,
        placeId: post.cafes.place_id
      } : undefined
    }));

    return {
      data: posts,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch posts'
    };
  }
}

/**
 * Fetch posts for a specific cafe
 */
export async function fetchCafePostsById(placeId: string): Promise<ApiResponse<Post[]>> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        cafes (name, neighborhood, place_id)
      `)
      .or(`place_id.eq.${placeId},cafe_id.eq.${placeId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Transform database format to app format
    const posts: Post[] = (data || []).map(post => ({
      id: post.id,
      userId: post.user_id,
      cafeId: post.cafe_id,
      placeId: post.place_id,
      imageUrl: post.image_url,
      rating: post.rating,
      textReview: post.text_review,
      tags: post.tags || [],
      likes: post.likes,
      comments: post.comments,
      createdAt: post.created_at,
      cafe: post.cafes ? {
        name: post.cafes.name,
        neighborhood: post.cafes.neighborhood,
        placeId: post.cafes.place_id
      } : undefined
    }));
    
    return {
      data: posts,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cafe posts'
    };
  }
}

/**
 * Filter feed posts by specific tag
 */
export async function filterFeedByTag(tag: string): Promise<ApiResponse<Post[]>> {
  return await fetchPosts({ tags: [tag] });
}

/**
 * Submit a new check-in post
 */
export async function submitCheckin(checkinData: CheckInData): Promise<ApiResponse<Post>> {
  try {
    let imageUrl = checkinData.imageUrl || '';
    
    // Upload image to Cloudinary if file provided
    if (checkinData.imageFile) {
      const uploadResult = await uploadImage(checkinData.imageFile);
      if (uploadResult.success && uploadResult.data) {
        imageUrl = uploadResult.data.secure_url;
      } else {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }
    }
    
    // Get current user and username
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = getDeviceId();
    let username = null;
    
    // Get username (works for both authenticated and anonymous users)
    const usernameRes = await getUsername();
    username = usernameRes.success ? usernameRes.data : null;

    // Get or create user profile (only for authenticated users)
    let userProfile = null;
    if (user) {
      let { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) {
        // Create user profile if it doesn't exist
        const { data: newProfile, error: profileError } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            name: user.user_metadata?.name || 'Anonymous User',
            email: user.email || ''
          })
          .select('id')
          .single();

        if (profileError) throw new Error(profileError.message);
        profile = newProfile;
      }
      userProfile = profile;
    }
    
    // Create post data
    const postData = {
      user_id: userProfile?.id || null,
      cafe_id: checkinData.cafeId,
      place_id: checkinData.placeId,
      image_url: imageUrl,
      rating: checkinData.rating,
      text_review: checkinData.review,
      tags: checkinData.tags,
      username: username,
      device_id: deviceId
    };
    
    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select(`
        *,
        cafes (name, neighborhood, place_id)
      `)
      .single();
    
    if (error) {
      throw new Error(error.message);
    }

    // Transform to app format
    const newPost: Post = {
      id: data.id,
      userId: data.user_id,
      cafeId: data.cafe_id,
      placeId: data.place_id,
      imageUrl: data.image_url,
      rating: data.rating,
      textReview: data.text_review,
      tags: data.tags || [],
      likes: data.likes,
      comments: data.comments,
      createdAt: data.created_at,
      cafe: data.cafes ? {
        name: data.cafes.name,
        neighborhood: data.cafes.neighborhood,
        placeId: data.cafes.place_id
      } : undefined
    };
    
    // Log activity
    try {
      await logActivity('check-in', checkinData.cafeId, { 
        cafeName: data.cafes?.name,
        rating: checkinData.rating,
        hasImage: !!checkinData.imageFile
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
    
    return {
      data: newPost,
      success: true
    };
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
    // First get current likes count
    const { data: currentPost, error: fetchError } = await supabase
      .from('posts')
      .select('likes')
      .eq('id', postId)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const { error } = await supabase
      .from('posts')
      .update({ likes: (currentPost?.likes || 0) + 1 })
      .eq('id', postId);
    
    if (error) {
      throw new Error(error.message);
    }
    
    return {
      data: true,
      success: true
    };
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
    // First get current likes count
    const { data: currentPost, error: fetchError } = await supabase
      .from('posts')
      .select('likes')
      .eq('id', postId)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const newLikes = Math.max((currentPost?.likes || 0) - 1, 0);

    const { error } = await supabase
      .from('posts')
      .update({ likes: newLikes })
      .eq('id', postId);
    
    if (error) {
      throw new Error(error.message);
    }
    
    return {
      data: true,
      success: true
    };
  } catch (error) {
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlike post'
    };
  }
}

/**
 * Get posts by search query across all fields
 */
export async function searchPosts(query: string): Promise<ApiResponse<Post[]>> {
  return await fetchPosts({ query });
}

/**
 * Get trending posts (most liked in last 7 days)
 */
export async function fetchTrendingPosts(): Promise<ApiResponse<Post[]>> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        cafes (name, neighborhood, place_id)
      `)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('likes', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(error.message);
    }

    // Transform database format to app format
    const posts: Post[] = (data || []).map(post => ({
      id: post.id,
      userId: post.user_id,
      cafeId: post.cafe_id,
      placeId: post.place_id,
      imageUrl: post.image_url,
      rating: post.rating,
      textReview: post.text_review,
      tags: post.tags || [],
      likes: post.likes,
      comments: post.comments,
      createdAt: post.created_at,
      cafe: post.cafes ? {
        name: post.cafes.name,
        neighborhood: post.cafes.neighborhood,
        placeId: post.cafes.place_id
      } : undefined
    }));
    
    return {
      data: posts,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trending posts'
    };
  }
}