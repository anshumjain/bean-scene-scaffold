import { ApiResponse, GoogleReview } from './types';
import { MonitoringService } from './monitoringService';

// Google Places API calls should be made server-side
// Client-side code will call our API endpoints instead of Google directly

function apiErrorResponse<T>(defaultValue: T): ApiResponse<T> {
  return {
    data: defaultValue,
    success: false,
    error: 'Failed to call API'
  };
}

interface PlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
}

interface PlaceDetails {
  place_id: string;
  photos?: PlacePhoto[];
  name: string;
}

/**
 * Real Google Places API service - OPTIMIZED FOR SINGLE PHOTOS
 */
export class GooglePlacesService {

  /**
   * Fetch place details with SINGLE optimized photo
   */
  static async fetchPlaceDetails(placeId: string): Promise<ApiResponse<PlaceDetails | null>> {

    try {
      await MonitoringService.logApiUsage('google_places', 'place_details');

      // Call our server-side API endpoint instead of Google directly
      const url = `/api/place/details?place_id=${placeId}&fields=name,photos`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(data.error_message || 'Failed to fetch place details');
      }

      const result = data.result;
      const placeDetails: PlaceDetails = {
        place_id: placeId,
        name: result.name,
        // Only include first photo for optimization
        photos: result.photos ? [{
          photo_reference: result.photos[0].photo_reference,
          width: result.photos[0].width,
          height: result.photos[0].height
        }] : undefined
      };

      return {
        data: placeDetails,
        success: true
      };
    } catch (error) {
      return apiErrorResponse(null);
    }
  }

  /**
   * Get OPTIMIZED hero photo URL for a place (800x600 max)
   */
  static async getHeroPhotoUrl(placeId: string): Promise<ApiResponse<string | null>> {

    try {
      await MonitoringService.logApiUsage('google_places', 'hero_photo');

      // First get place details to get photo reference
      const placeDetails = await this.fetchPlaceDetails(placeId);
      
      if (!placeDetails.success || !placeDetails.data?.photos?.[0]) {
        return { data: null, success: true };
      }

      const photoRef = placeDetails.data.photos[0].photo_reference;
      
      // Generate optimized photo URL - single photo only
      // Use server-side API endpoint for photos
      const heroUrl = `/api/place/photo?maxwidth=800&maxheight=600&photoreference=${photoRef}`;

      return {
        data: heroUrl,
        success: true
      };
    } catch (error) {
      return apiErrorResponse(null);
    }
  }

  /**
   * Batch fetch SINGLE hero photos for multiple cafes - COST OPTIMIZED
   */
  static async batchFetchHeroPhotos(placeIds: string[]): Promise<ApiResponse<Record<string, string>>> {

    try {
      const results: Record<string, string> = {};
      
      // Process in smaller batches to respect rate limits
      const BATCH_SIZE = 3; // Reduced batch size for better rate limiting
      
      for (let i = 0; i < placeIds.length; i += BATCH_SIZE) {
        const batch = placeIds.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel for efficiency
        const batchPromises = batch.map(async (placeId) => {
          const photoResult = await this.getHeroPhotoUrl(placeId);
          if (photoResult.success && photoResult.data) {
            results[placeId] = photoResult.data;
          }
        });
        
        await Promise.all(batchPromises);
        
        // Rate limiting delay between batches
        if (i + BATCH_SIZE < placeIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      await MonitoringService.logApiUsage('google_places', 'batch_hero_photos', placeIds.length);

      return {
        data: results,
        success: true
      };
    } catch (error) {
      return apiErrorResponse({});
    }
  }

  /**
   * Fetch Google reviews for a place
   */
  static async fetchPlaceReviews(placeId: string): Promise<ApiResponse<GoogleReview[]>> {
    try {
      await MonitoringService.logApiUsage('google_places', 'place_reviews');

      // Call our server-side API endpoint instead of Google directly
      const url = `/api/place/details?place_id=${placeId}&fields=reviews`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(data.error_message || 'Failed to fetch place reviews');
      }

      const reviews: GoogleReview[] = data.result.reviews || [];

      return {
        data: reviews,
        success: true
      };
    } catch (error) {
      console.error('Failed to fetch place reviews:', error);
      return apiErrorResponse([]);
    }
  }

  /**
   * Get a random Google review for a place (useful for generating post captions)
   */
  static async getRandomPlaceReview(placeId: string): Promise<ApiResponse<GoogleReview | null>> {
    try {
      const reviewsResult = await this.fetchPlaceReviews(placeId);
      
      if (!reviewsResult.success || reviewsResult.data.length === 0) {
        return {
          data: null,
          success: false,
          error: 'No reviews found for this place'
        };
      }

      // Filter for reviews with actual text content
      const reviewsWithText = reviewsResult.data.filter(review => 
        review.text && review.text.trim().length > 10
      );

      if (reviewsWithText.length === 0) {
        return {
          data: null,
          success: false,
          error: 'No reviews with text content found'
        };
      }

      // Get a random review
      const randomIndex = Math.floor(Math.random() * reviewsWithText.length);
      const randomReview = reviewsWithText[randomIndex];

      return {
        data: randomReview,
        success: true
      };
    } catch (error) {
      console.error('Failed to get random place review:', error);
      return apiErrorResponse(null);
    }
  }
}