import { supabase } from '@/integrations/supabase/client';
import type { ApiResponse } from './types';

export interface GoogleReview {
  cafe_id: string;
  author_name: string;
  review_text: string;
  rating: number;
  time: number;
  profile_photo_url?: string;
}

/**
 * Upsert reviews, deduplicating by (cafe_id, author_name, review_text)
 * Enforces SQL constraint:
 *   ALTER TABLE google_reviews ADD CONSTRAINT unique_review UNIQUE(cafe_id, author_name, review_text);
 */
export async function upsertReviews(reviews: GoogleReview[]): Promise<ApiResponse<number>> {
  try {
    const { data, error } = await supabase
      .from('google_reviews')
      .upsert(reviews, { onConflict: ['cafe_id', 'author_name', 'review_text'] });
    if (error) throw new Error(error.message);
    return { data: data?.length || 0, success: true };
  } catch (error: any) {
    return { data: 0, success: false, error: error.message };
  }
}

// Ensure the following SQL constraint exists in your DB:
// ALTER TABLE google_reviews ADD CONSTRAINT unique_review UNIQUE(cafe_id, author_name, review_text);

