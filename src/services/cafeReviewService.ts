import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from './types';

export interface CafeReview {
  id: string;
  cafe_id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  profile_photo_url?: string;
  time: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateReviewData {
  cafeId: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  profilePhotoUrl?: string;
}

/**
 * Create a formal cafe review
 */
export async function createCafeReview(data: CreateReviewData): Promise<ApiResponse<CafeReview>> {
  try {
    const reviewData = {
      cafe_id: data.cafeId,
      reviewer_name: data.reviewerName,
      rating: data.rating,
      review_text: data.reviewText,
      profile_photo_url: data.profilePhotoUrl || null,
      time: new Date().toISOString(),
    };

    const { data: insertedReview, error } = await supabase
      .from('cafe_reviews')
      .insert(reviewData)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating cafe review:', error);
      return {
        data: {} as CafeReview,
        success: false,
        error: error.message
      };
    }

    return {
      data: insertedReview,
      success: true
    };
  } catch (error) {
    console.error('Error in createCafeReview:', error);
    return {
      data: {} as CafeReview,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create cafe review'
    };
  }
}

/**
 * Get reviews for a specific cafe
 */
export async function getCafeReviews(cafeId: string): Promise<ApiResponse<CafeReview[]>> {
  try {
    const { data, error } = await supabase
      .from('cafe_reviews')
      .select('*')
      .eq('cafe_id', cafeId)
      .order('time', { ascending: false });

    if (error) {
      console.error('Error fetching cafe reviews:', error);
      return {
        data: [],
        success: false,
        error: error.message
      };
    }

    return {
      data: data || [],
      success: true
    };
  } catch (error) {
    console.error('Error in getCafeReviews:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cafe reviews'
    };
  }
}

/**
 * Update cafe rating based on reviews
 */
export async function updateCafeRating(cafeId: string): Promise<ApiResponse<{ newRating: number; reviewCount: number }>> {
  try {
    // Get all reviews for the cafe
    const { data: reviews, error } = await supabase
      .from('cafe_reviews')
      .select('rating')
      .eq('cafe_id', cafeId);

    if (error) {
      console.error('Error fetching reviews for rating update:', error);
      return {
        data: { newRating: 0, reviewCount: 0 },
        success: false,
        error: error.message
      };
    }

    if (!reviews || reviews.length === 0) {
      return {
        data: { newRating: 0, reviewCount: 0 },
        success: true
      };
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10; // Round to 1 decimal

    // Update cafe rating
    const { error: updateError } = await supabase
      .from('cafes')
      .update({ 
        user_rating: averageRating,
        updated_at: new Date().toISOString()
      })
      .eq('id', cafeId);

    if (updateError) {
      console.error('Error updating cafe rating:', updateError);
      return {
        data: { newRating: 0, reviewCount: 0 },
        success: false,
        error: updateError.message
      };
    }

    return {
      data: { 
        newRating: averageRating, 
        reviewCount: reviews.length 
      },
      success: true
    };
  } catch (error) {
    console.error('Error in updateCafeRating:', error);
    return {
      data: { newRating: 0, reviewCount: 0 },
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update cafe rating'
    };
  }
}

/**
 * Check if user has already reviewed a cafe
 */
export async function hasUserReviewedCafe(
  cafeId: string,
  reviewerName: string
): Promise<ApiResponse<boolean>> {
  try {
    const { data, error } = await supabase
      .from('cafe_reviews')
      .select('id')
      .eq('cafe_id', cafeId)
      .eq('reviewer_name', reviewerName)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking existing review:', error);
      return {
        data: false,
        success: false,
        error: error.message
      };
    }

    return {
      data: !!data,
      success: true
    };
  } catch (error) {
    console.error('Error in hasUserReviewedCafe:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check existing review'
    };
  }
}
