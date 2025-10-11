import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from './types';

/**
 * Calculate BeanScene rating for a cafe based on user posts
 */
export async function calculateCafeRating(placeId: string): Promise<ApiResponse<number>> {
  try {
    // Get all posts for this cafe with ratings
    const { data: posts, error } = await supabase
      .from('posts')
      .select('rating')
      .eq('place_id', placeId)
      .not('rating', 'is', null);

    if (error) {
      throw new Error(error.message);
    }

    if (!posts || posts.length === 0) {
      return {
        data: 0,
        success: true
      };
    }

    // Calculate average rating
    const totalRating = posts.reduce((sum, post) => sum + post.rating, 0);
    const averageRating = totalRating / posts.length;
    
    // Round to 1 decimal place
    const roundedRating = Math.round(averageRating * 10) / 10;

    return {
      data: roundedRating,
      success: true
    };
  } catch (error) {
    return {
      data: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate cafe rating'
    };
  }
}

/**
 * Update cafe rating in the database
 */
export async function updateCafeRating(placeId: string, rating: number): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('cafes')
      .update({ user_rating: rating })
      .eq('place_id', placeId);

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
      error: error instanceof Error ? error.message : 'Failed to update cafe rating'
    };
  }
}

/**
 * Recalculate and update cafe rating after a new post
 */
export async function recalculateCafeRating(placeId: string): Promise<ApiResponse<number>> {
  try {
    // Calculate new rating
    const ratingResult = await calculateCafeRating(placeId);
    
    if (!ratingResult.success) {
      return ratingResult;
    }

    // Update in database
    const updateResult = await updateCafeRating(placeId, ratingResult.data);
    
    if (!updateResult.success) {
      return {
        data: ratingResult.data,
        success: false,
        error: updateResult.error
      };
    }

    return ratingResult;
  } catch (error) {
    return {
      data: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to recalculate cafe rating'
    };
  }
}

/**
 * Get rating statistics for a cafe
 */
export async function getCafeRatingStats(placeId: string): Promise<ApiResponse<{
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [key: number]: number };
}>> {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('rating')
      .eq('place_id', placeId)
      .not('rating', 'is', null);

    if (error) {
      throw new Error(error.message);
    }

    if (!posts || posts.length === 0) {
      return {
        data: {
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: {}
        },
        success: true
      };
    }

    // Calculate statistics
    const totalRatings = posts.length;
    const totalRating = posts.reduce((sum, post) => sum + post.rating, 0);
    const averageRating = Math.round((totalRating / totalRatings) * 10) / 10;

    // Calculate rating distribution
    const ratingDistribution: { [key: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = posts.filter(post => post.rating === i).length;
    }

    return {
      data: {
        averageRating,
        totalRatings,
        ratingDistribution
      },
      success: true
    };
  } catch (error) {
    return {
      data: {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: {}
      },
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get rating statistics'
    };
  }
}
