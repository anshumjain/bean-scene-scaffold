import { Post, SearchFilters, ApiResponse, CheckInData } from './types';
import { fetchCafeDetails } from './cafeService';
import { uploadImage } from './cloudinaryService';
import { generateId, formatTimeAgo } from './utils';
import { MonitoringService } from './monitoringService';
import { supabase } from '@/integrations/supabase/client';
import { getUsername, getDeviceId } from './userService';
import { logActivity } from './activityService';
import { recalculateCafeRating } from './ratingService';
import { createCafeReview, updateCafeRating } from './cafeReviewService';
import { processPostCreation, processCheckinCreation } from './gamificationService';
import { calculateXP, ShareMode } from '../utils/xpCalculator';

function apiErrorResponse<T>(defaultValue: T): ApiResponse<T> {
  return {
    data: defaultValue,
    success: false,
    error: 'Failed to call API'
  };
}

/**
 * Fetch posts for the main feed with optional filters
 * Now supports city-based filtering to show relevant local content
 */
export async function fetchPosts(filters: SearchFilters & { city?: string } = {}): Promise<ApiResponse<Post[]>> {
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

    // City filtering removed for now - show all posts
    let filteredData = data || [];

    // Transform database format to app format
    const posts: Post[] = filteredData.map(post => {
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
          address: post.cafes.address,
          city: (post.cafes as any).city || 'houston' // Default to houston if city column doesn't exist yet
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
          address: post.cafes.address,
          city: (post.cafes as any).city || 'houston' // Default to houston if city column doesn't exist yet
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
 * Like a post (server-side tracking)
 */
export async function likePost(postId: string): Promise<ApiResponse<boolean>> {
  try {
    const username = await getUsername();
    const deviceId = getDeviceId();
    
    // Check if already liked
    const { data: existingLike, error: checkError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('device_id', deviceId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(checkError.message);
    }

    if (existingLike) {
      return { data: true, success: true }; // Already liked
    }

    // Insert like record
    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        device_id: deviceId,
        username: username.success ? username.data : 'Anonymous'
      });
    
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
 * Unlike a post (server-side tracking)
 */
export async function unlikePost(postId: string): Promise<ApiResponse<boolean>> {
  try {
    const username = await getUsername();
    const deviceId = getDeviceId();
    
    // Delete like record
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('device_id', deviceId);
    
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
 * Check if current user has liked a post (server-side tracking)
 */
export async function hasUserLikedPost(postId: string): Promise<ApiResponse<boolean>> {
  try {
    const username = await getUsername();
    const deviceId = getDeviceId();
    
    const { data, error } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('device_id', deviceId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(error.message);
    }

    return {
      data: !!data,
      success: true
    };
  } catch (error) {
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check like status'
    };
  }
}

/**
 * Get comments for a post (server-side)
 */
export async function getPostComments(postId: string): Promise<ApiResponse<Comment[]>> {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const comments: Comment[] = (data || []).map(comment => ({
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      deviceId: comment.device_id,
      username: comment.username,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    }));

    return {
      data: comments,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch comments'
    };
  }
}

/**
 * Add a comment to a post (server-side)
 */
export async function addComment(postId: string, content: string): Promise<ApiResponse<Comment>> {
  try {
    const username = await getUsername();
    const deviceId = getDeviceId();

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        device_id: deviceId,
        username: username.success ? username.data : 'Anonymous',
        content: content.trim()
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const comment: Comment = {
      id: data.id,
      postId: data.post_id,
      userId: data.user_id,
      deviceId: data.device_id,
      username: data.username,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    return {
      data: comment,
      success: true
    };
  } catch (error) {
    return {
      data: {} as Comment,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add comment'
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

/**
 * Submit a check-in/post with optional content
 * Supports both Post (social) and Check-in (formal review) modes
 */
export async function submitCheckin(data: {
  mode: ShareMode;
  cafeId?: string | null;
  placeId?: string | null;
  rating?: number;
  tags?: string[];
  review?: string;
  imageFiles?: File[];
  location?: { latitude: number; longitude: number };
  username?: string;
}): Promise<ApiResponse<{ postId: string; reviewId?: string }>> {
  try {
    console.log('Submitting with mode:', data.mode, 'data:', data);

    // Get user info
    const usernameResult = await getUsername();
    const deviceId = getDeviceId();
    const username = usernameResult.success ? usernameResult.data : null;

    // Handle image uploads if provided
    let imageUrls: string[] = [];
    if (data.imageFiles && data.imageFiles.length > 0) {
      console.log(`Uploading ${data.imageFiles.length} images...`);
      
      for (const file of data.imageFiles) {
        const uploadResult = await uploadImage(file);
        if (uploadResult.success && uploadResult.data?.secure_url) {
          imageUrls.push(uploadResult.data.secure_url);
        } else {
          console.error('Failed to upload image:', uploadResult.error);
          return {
            data: { postId: '', reviewId: undefined },
            success: false,
            error: `Failed to upload image: ${uploadResult.error}`
          };
        }
      }
    }

    // Check if this is first time at cafe (before tracking the visit)
    let isFirstTimeCafe = false;
    if (data.cafeId) {
      const { count } = await supabase
        .from('cafe_visits')
        .select('*', { count: 'exact', head: true })
        .eq('cafe_id', data.cafeId)
        .or(`device_id.eq.${deviceId}${username ? `,username.eq.${username}` : ''}`);
      
      isFirstTimeCafe = (count || 0) === 0;
    }

    // Calculate XP for gamification
    const xpCalculation = calculateXP({
      mode: data.mode,
      hasPhoto: imageUrls.length > 0,
      hasCaption: Boolean(data.review && data.review.trim().length >= 20),
      hasCafe: Boolean(data.cafeId),
      hasRating: Boolean(data.rating && data.rating > 0),
      tagsCount: data.tags?.length || 0,
      isGPSVerified: false, // TODO: Implement GPS verification
      isFirstTimeCafe: isFirstTimeCafe,
    });

    console.log('XP Calculation:', xpCalculation);

    let reviewId: string | undefined;

    // Handle Check-in mode: Create formal review first
    if (data.mode === 'checkin' && data.cafeId && data.rating && data.review) {
      console.log('Creating formal cafe review...');
      
      const reviewResult = await createCafeReview({
        cafeId: data.cafeId,
        reviewerName: username || 'Anonymous',
        rating: data.rating,
        reviewText: data.review,
        profilePhotoUrl: undefined // TODO: Add profile photo support
      });

      if (!reviewResult.success) {
        console.error('Failed to create cafe review:', reviewResult.error);
        return {
          data: { postId: '', reviewId: undefined },
          success: false,
          error: `Failed to create review: ${reviewResult.error}`
        };
      }

      reviewId = reviewResult.data.id;

      // Update cafe rating based on reviews
      await updateCafeRating(data.cafeId);
    }

    // Prepare post data (both modes create social posts)
    const postData: any = {
      user_id: null, // Will be set by RLS policies
      device_id: deviceId,
      username: username || 'Anonymous',
      place_id: data.placeId,
      cafe_id: data.cafeId,
      image_url: imageUrls.length > 0 ? imageUrls[0] : null, // First image for backward compatibility
      image_urls: imageUrls.length > 0 ? imageUrls : null,
      rating: data.rating || null,
      text_review: data.review || null,
      tags: data.tags || null,
      source: 'user',
      photo_source: imageUrls.length > 0 ? 'user' : null,
      created_at: new Date().toISOString()
    };

    console.log('Inserting post with data:', postData);

    // Insert the social post
    const { data: insertedPost, error: insertError } = await supabase
      .from('posts')
      .insert(postData)
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting post:', insertError);
      return {
        data: { postId: '', reviewId },
        success: false,
        error: insertError.message
      };
    }

    // Process gamification (XP and badges)
    const gamificationData = {
      cafeId: data.cafeId,
      hasImage: imageUrls.length > 0,
      imageCount: imageUrls.length,
      isFirstTimeCafe: isFirstTimeCafe
    };

    if (data.mode === 'checkin') {
      await processCheckinCreation(
        undefined, // userId
        deviceId,
        username,
        xpCalculation.totalXP,
        gamificationData
      );
    } else {
      await processPostCreation(
        undefined, // userId
        deviceId,
        username,
        xpCalculation.totalXP,
        gamificationData
      );
    }

    // Log activity
    await logActivity({
      type: data.mode === 'checkin' ? 'checkin_created' : 'post_created',
      description: `Created a ${data.mode}${data.cafeId ? ' at a cafe' : ''}${imageUrls.length > 0 ? ' with photos' : ''}`,
      metadata: {
        post_id: insertedPost.id,
        review_id: reviewId,
        cafe_id: data.cafeId,
        has_images: imageUrls.length > 0,
        image_count: imageUrls.length,
        has_review: !!data.review,
        has_rating: !!data.rating,
        tags_count: data.tags?.length || 0,
        mode: data.mode,
        xp_earned: xpCalculation.totalXP
      }
    });

    console.log(`${data.mode} created successfully:`, insertedPost.id, reviewId ? `with review: ${reviewId}` : '');

    return {
      data: { postId: insertedPost.id, reviewId },
      success: true
    };

  } catch (error) {
    console.error('Error in submitCheckin:', error);
    return {
      data: { postId: '', reviewId: undefined },
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit check-in'
    };
  }
}