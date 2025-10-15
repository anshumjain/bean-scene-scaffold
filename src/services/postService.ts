import { Post, SearchFilters, ApiResponse, CheckInData } from './types';
import { fetchCafeDetails } from './cafeService';
import { uploadImage } from './cloudinaryService';
import { generateId, formatTimeAgo } from './utils';
import { MonitoringService } from './monitoringService';
import { supabase } from '@/integrations/supabase/client';
import { getUsername, getDeviceId } from './userService';
import { logActivity } from './activityService';
import { recalculateCafeRating } from './ratingService';

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
        cafes (name, neighborhood, place_id, address)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.tags && filters.tags.length > 0) {
      // Use AND logic: post must have ALL selected tags
      query = query.contains('tags', filters.tags);
    }
    
    if (filters.neighborhoods && filters.neighborhoods.length > 0) {
      // Only filter by neighborhood if the post has a cafe association
      query = query.or(`cafe_id.is.null,cafes.neighborhood.in.(${filters.neighborhoods.join(',')})`);
    }
    
    if (filters.query) {
      // Search in text_review, cafe name, and tags (handle posts without cafes)
      query = query.or(`text_review.ilike.%${filters.query}%,cafes.name.ilike.%${filters.query}%,tags.overlaps.{${filters.query}}`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Transform database format to app format
    const posts: Post[] = (data || []).map(post => {
      // Determine source based on available data
      const source = post.source || 'user'; // Default to user for new posts
      // Priority: 1) explicit photo_source field, 2) URL patterns, 3) default to 'user'
      const photoSource = post.photo_source || 
        (post.image_url && (
          post.image_url.includes('bean-scene/google-places') || 
          post.image_url.includes('google') ||
          // Check if it's a Cloudinary URL that might be from Google Places
          (post.image_url.includes('cloudinary') && post.place_id)
        ) ? 'google' : 'user');

      return {
        id: post.id,
        userId: post.user_id,
        cafeId: post.cafe_id,
        placeId: post.place_id,
        imageUrl: post.image_url, // Keep for backward compatibility
        imageUrls: post.image_urls || [], // New field for multiple images
        rating: post.rating,
        textReview: post.text_review,
        tags: post.tags || [],
        likes: post.likes,
        comments: post.comments,
        createdAt: post.created_at,
        source: source as 'google' | 'user',
        photoSource: photoSource as 'google' | 'user',
        username: post.username,
        deviceId: post.device_id,
        cafe: post.cafes ? {
          name: post.cafes.name,
          neighborhood: post.cafes.neighborhood,
          placeId: post.cafes.place_id,
          address: post.cafes.address
        } : undefined
      };
    });

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
      .eq('place_id', placeId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Transform database format to app format
    const posts: Post[] = (data || []).map(post => {
      // Determine source based on available data
      const source = post.source || 'user'; // Default to user for new posts
      // Priority: 1) explicit photo_source field, 2) URL patterns, 3) default to 'user'
      const photoSource = post.photo_source || 
        (post.image_url && (
          post.image_url.includes('bean-scene/google-places') || 
          post.image_url.includes('google') ||
          // Check if it's a Cloudinary URL that might be from Google Places
          (post.image_url.includes('cloudinary') && post.place_id)
        ) ? 'google' : 'user');

      return {
        id: post.id,
        userId: post.user_id,
        cafeId: post.cafe_id,
        placeId: post.place_id,
        imageUrl: post.image_url, // Keep for backward compatibility
        imageUrls: post.image_urls || [], // New field for multiple images
        rating: post.rating,
        textReview: post.text_review,
        tags: post.tags || [],
        likes: post.likes,
        comments: post.comments,
        createdAt: post.created_at,
        source: source as 'google' | 'user',
        photoSource: photoSource as 'google' | 'user',
        username: post.username,
        deviceId: post.device_id,
        cafe: post.cafes ? {
          name: post.cafes.name,
          neighborhood: post.cafes.neighborhood,
          placeId: post.cafes.place_id,
          address: post.cafes.address
        } : undefined
      };
    });
    
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
 * Fetch posts for a specific user (for profile page)
 */
export async function fetchUserPosts(username?: string, deviceId?: string): Promise<ApiResponse<Post[]>> {
  try {
    let query = supabase
      .from('posts')
      .select(`
        *,
        cafes (name, neighborhood, place_id, address)
      `)
      .order('created_at', { ascending: false });

    // Filter by username or device_id for anonymous users
    if (username) {
      query = query.eq('username', username);
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else {
      // If no identifier provided, return empty
      return {
        data: [],
        success: true
      };
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Transform database format to app format
    const posts: Post[] = data.map(post => {
      // Determine source based on available data
      const source = post.source || 'user'; // Default to user for new posts
      // Priority: 1) explicit photo_source field, 2) URL patterns, 3) default to 'user'
      const photoSource = post.photo_source || 
        (post.image_url && (
          post.image_url.includes('bean-scene/google-places') || 
          post.image_url.includes('google') ||
          // Check if it's a Cloudinary URL that might be from Google Places
          (post.image_url.includes('cloudinary') && post.place_id)
        ) ? 'google' : 'user');

      return {
        id: post.id,
        userId: post.user_id,
        cafeId: post.cafe_id,
        placeId: post.place_id,
        imageUrl: post.image_url, // Keep for backward compatibility
        imageUrls: post.image_urls || [], // New field for multiple images
        rating: post.rating,
        textReview: post.text_review,
        tags: post.tags || [],
        likes: post.likes,
        comments: post.comments,
        createdAt: post.created_at,
        source: source as 'google' | 'user',
        photoSource: photoSource as 'google' | 'user',
        username: post.username,
        deviceId: post.device_id,
        cafe: post.cafes ? {
          name: post.cafes.name,
          neighborhood: post.cafes.neighborhood,
          placeId: post.cafes.place_id,
          address: post.cafes.address
        } : undefined
      };
    });

    return {
      data: posts,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user posts'
    };
  }
}

/**
 * Submit a new check-in post
 */
export async function submitCheckin(checkinData: CheckInData): Promise<ApiResponse<Post>> {
  try {
    let imageUrl = checkinData.imageUrl || '';
    let imageUrls: string[] = [];
    
    // Handle single image (for check-ins)
    if (checkinData.imageFile) {
      const uploadResult = await uploadImage(checkinData.imageFile);
      if (uploadResult.success && uploadResult.data) {
        imageUrl = uploadResult.data.secure_url;
        imageUrls = [uploadResult.data.secure_url];
      } else {
        console.warn('Image upload failed, continuing without image:', uploadResult.error);
        // Don't throw error, just continue without image
      }
    }
    
    // Handle multiple images (for posts)
    if (checkinData.imageFiles && checkinData.imageFiles.length > 0) {
      imageUrls = [];
      for (const file of checkinData.imageFiles.slice(0, 3)) { // Limit to 3 images
        const uploadResult = await uploadImage(file);
        if (uploadResult.success && uploadResult.data) {
          imageUrls.push(uploadResult.data.secure_url);
        } else {
          console.warn('Image upload failed for file:', file.name, uploadResult.error);
        }
      }
      
      // Set the first image as the main image for backward compatibility
      if (imageUrls.length > 0) {
        imageUrl = imageUrls[0];
      }
    }
    
    // Use provided URLs if no files were uploaded
    if (checkinData.imageUrls && checkinData.imageUrls.length > 0) {
      imageUrls = checkinData.imageUrls;
      imageUrl = imageUrls[0] || '';
    }
    
    // Get current user and username
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = getDeviceId();
    let username = null;
    
    // Get username (works for both authenticated and anonymous users)
    const usernameRes = await getUsername();
    username = usernameRes.success ? usernameRes.data : null;

    // Get or create user profile (works for both authenticated and anonymous users)
    let userProfile = null;
    
    if (user) {
      // For authenticated users
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
            name: user.user_metadata?.name || username || 'Anonymous User',
            email: user.email || '',
            username: username
          })
          .select('id')
          .single();

        if (profileError) throw new Error(profileError.message);
        profile = newProfile;
      }
      userProfile = profile;
    } else if (username) {
      // For anonymous users, ensure they have a user record
      let { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('device_id', deviceId)
        .single();

      if (!profile) {
        // Create anonymous user profile
        const { data: newProfile, error: profileError } = await supabase
          .from('users')
          .insert({
            device_id: deviceId,
            username: username,
            name: username,
            email: `anonymous-${deviceId}@beanscene.local`
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
      cafe_id: checkinData.cafeId || null,
      place_id: checkinData.placeId || null,
      image_url: imageUrl, // Keep for backward compatibility
      image_urls: imageUrls, // New field for multiple images
      rating: checkinData.rating,
      text_review: checkinData.review,
      tags: checkinData.tags,
      username: username,
      device_id: deviceId,
      source: 'user', // Explicitly set as user-generated content
      photo_source: 'user' // Explicitly set as user-generated photo
    };
    
    // No need to set device context since we allow anyone to create posts
    
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
      imageUrl: data.image_url, // Keep for backward compatibility
      imageUrls: data.image_urls || [], // New field for multiple images
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
    
    // Log activity (optional - don't fail post creation if this fails)
    try {
      if (checkinData.cafeId) {
        await logActivity('check-in', checkinData.cafeId, { 
          cafeName: data.cafes?.name,
          rating: checkinData.rating,
          hasImage: !!checkinData.imageFile || !!checkinData.imageFiles?.length
        });
      }
    } catch (error) {
      console.error('Failed to log activity (non-critical):', error);
      // Don't throw - this is optional logging
    }

    // Recalculate cafe rating (optional - don't fail post creation if this fails)
    try {
      if (checkinData.placeId && checkinData.rating) {
        await recalculateCafeRating(checkinData.placeId);
      }
    } catch (error) {
      console.error('Failed to recalculate cafe rating (non-critical):', error);
      // Don't throw - this is optional
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

/**
 * Update a user's post (edit functionality)
 */
export async function updatePost(postId: string, updates: {
  rating?: number;
  textReview?: string;
  tags?: string[];
  imageUrl?: string;
  imageUrls?: string[];
}): Promise<ApiResponse<Post>> {
  try {
    // Prepare update data, handling imageUrls array properly for PostgreSQL
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Convert imageUrls array to PostgreSQL array format if present
    if (updates.imageUrls) {
      updateData.image_urls = updates.imageUrls; // Map to database column name
      delete updateData.imageUrls; // Remove the camelCase version
      console.log('UpdatePost - sending image_urls:', updateData.image_urls);
    }
    
    console.log('UpdatePost - full update data:', updateData);
    
    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select(`
        *,
        cafes (name, neighborhood, place_id, address)
      `)
      .single();

    if (error) {
      console.error('UpdatePost - Supabase error:', error);
      throw new Error(error.message);
    }

    // Transform to app format
    const updatedPost: Post = {
      id: data.id,
      userId: data.user_id,
      cafeId: data.cafe_id,
      placeId: data.place_id,
      imageUrl: data.image_url,
      imageUrls: data.image_urls || [],
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

    // Recalculate cafe rating if rating was updated
    if (updates.rating && data.place_id) {
      try {
        await recalculateCafeRating(data.place_id);
      } catch (error) {
        console.error('Failed to recalculate cafe rating:', error);
        // Don't fail the update if rating recalculation fails
      }
    }

    return {
      data: updatedPost,
      success: true
    };
  } catch (error) {
    return {
      data: {} as Post,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update post'
    };
  }
}

/**
 * Delete a user's post
 */
export async function deletePost(postId: string): Promise<ApiResponse<boolean>> {
  try {
    // First get the post to get place_id for rating recalculation
    const { data: postData, error: fetchError } = await supabase
      .from('posts')
      .select('place_id')
      .eq('id', postId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    // Delete the post
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      throw new Error(error.message);
    }

    // Recalculate cafe rating after deletion
    if (postData?.place_id) {
      try {
        await recalculateCafeRating(postData.place_id);
      } catch (error) {
        console.error('Failed to recalculate cafe rating:', error);
        // Don't fail the deletion if rating recalculation fails
      }
    }

    return {
      data: true,
      success: true
    };
  } catch (error) {
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete post'
    };
  }
}