import { ApiResponse } from './types';

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
 * Placeholder Google Places API service
 * TODO: Replace with real Google Places API integration
 */
export class GooglePlacesService {
  private static mockPhotos = [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop'
  ];

  /**
   * Fetch place details with photos (placeholder implementation)
   */
  static async fetchPlaceDetails(place_id: string): Promise<ApiResponse<PlaceDetails | null>> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock response with random photo
      const mockDetails: PlaceDetails = {
        place_id: placeId,
        name: `Cafe ${placeId.slice(-4)}`,
        photos: [{
          photo_reference: `photo_ref_${placeId}`,
          width: 800,
          height: 600
        }]
      };

      return {
        data: mockDetails,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch place details'
      };
    }
  }

  /**
   * Get hero photo URL for a place (placeholder implementation)
   */
  static async getHeroPhotoUrl(place_id: string): Promise<ApiResponse<string | null>> {
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 300));

      // Return a random hero photo
      const randomIndex = Math.floor(Math.random() * this.mockPhotos.length);
      const heroUrl = this.mockPhotos[randomIndex];

      return {
        data: heroUrl,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get hero photo'
      };
    }
  }

  /**
   * Batch fetch hero photos for multiple cafes
   */
  static async batchFetchHeroPhotos(place_ids: string[]): Promise<ApiResponse<Record<string, string>>> {
    try {
      const results: Record<string, string> = {};
      
      // Process in batches of 5 to simulate rate limiting
      for (let i = 0; i < placeIds.length; i += 5) {
        const batch = placeIds.slice(i, i + 5);
        
        for (const placeId of batch) {
          const photoResult = await this.getHeroPhotoUrl(place_id);
          if (photoResult.success && photoResult.data) {
            results[placeId] = photoResult.data;
          }
        }
        
        // Add delay between batches
        if (i + 5 < place_ids.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        data: results,
        success: true
      };
    } catch (error) {
      return {
        data: {},
        success: false,
        error: error instanceof Error ? error.message : 'Failed to batch fetch photos'
      };
    }
  }
}
