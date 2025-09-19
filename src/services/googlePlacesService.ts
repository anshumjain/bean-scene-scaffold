import { ApiResponse } from './types';
import { MonitoringService } from './monitoringService';

// Environment variables with graceful fallbacks
const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
const hasGooglePlacesKey = GOOGLE_PLACES_API_KEY && GOOGLE_PLACES_API_KEY !== 'undefined';

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
    if (!hasGooglePlacesKey) {
      return apiErrorResponse(null);
    }

    try {
      await MonitoringService.logApiUsage('google_places', 'place_details');

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,photos&key=${GOOGLE_PLACES_API_KEY}`;
      
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
    if (!hasGooglePlacesKey) {
      return apiErrorResponse(null);
    }

    try {
      await MonitoringService.logApiUsage('google_places', 'hero_photo');

      // First get place details to get photo reference
      const placeDetails = await this.fetchPlaceDetails(placeId);
      
      if (!placeDetails.success || !placeDetails.data?.photos?.[0]) {
        return { data: null, success: true };
      }

      const photoRef = placeDetails.data.photos[0].photo_reference;
      
      // Generate optimized photo URL - single photo only
      const heroUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=600&photoreference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;

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
    if (!hasGooglePlacesKey) {
      return apiErrorResponse({});
    }

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
}