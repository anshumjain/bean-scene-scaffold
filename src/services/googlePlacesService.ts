import { ApiResponse } from './types';

interface PlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
}

interface PlaceDetails {
  place_id: string;
  name: string;
  photos?: PlacePhoto[];
  latitude: number;
  longitude: number;
  address: string;
  website?: string;
  google_rating?: number;
  opening_hours?: string[];
}

/**
 * Google Places API service
 */
export class GooglePlacesService {
  private static API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

  /**
   * Fetch place details using real Google Places API
   */
  static async fetchPlaceDetails(place_id: string): Promise<ApiResponse<PlaceDetails | null>> {
    try {
      if (!this.API_KEY) throw new Error('Google Places API key not configured');

      const fields = [
        'name',
        'geometry',
        'formatted_address',
        'photos',
        'website',
        'rating',
        'opening_hours'
      ].join(',');

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&key=${this.API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.result) {
        return { data: null, success: false, error: data.error_message || data.status };
      }

      const result = data.result;

      const details: PlaceDetails = {
        place_id: result.place_id,
        name: result.name,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        address: result.formatted_address,
        website: result.website,
        google_rating: result.rating,
        opening_hours: result.opening_hours?.weekday_text,
        photos: result.photos?.map((p: any) => ({
          photo_reference: p.photo_reference,
          width: p.width,
          height: p.height
        }))
      };

      return { data: details, success: true };
    } catch (error) {
      return { data: null, success: false, error: error instanceof Error ? error.message : 'Failed to fetch place details' };
    }
  }

  /**
   * Get hero photo URL for a place
   */
  static async getHeroPhotoUrl(place_id: string): Promise<ApiResponse<string | null>> {
    try {
      const details = await this.fetchPlaceDetails(place_id);
      if (!details.success || !details.data || !details.data.photos?.length) return { data: null, success: true };

      const photoRef = details.data.photos[0].photo_reference;
      const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${this.API_KEY}`;

      return { data: url, success: true };
    } catch (error) {
      return { data: null, success: false, error: error instanceof Error ? error.message : 'Failed to get hero photo' };
    }
  }

  /**
   * Batch fetch hero photos for multiple cafes
   */
  static async batchFetchHeroPhotos(place_ids: string[]): Promise<ApiResponse<Record<string, string>>> {
    try {
      const results: Record<string, string> = {};

      for (let i = 0; i < place_ids.length; i += 5) {
        const batch = place_ids.slice(i, i + 5);
        await Promise.all(batch.map(async place_id => {
          const photoResult = await this.getHeroPhotoUrl(place_id);
          if (photoResult.success && photoResult.data) results[place_id] = photoResult.data;
        }));

        // optional delay between batches to respect rate limits
        if (i + 5 < place_ids.length) await new Promise(resolve => setTimeout(resolve, 200));
      }

      return { data: results, success: true };
    } catch (error) {
      return { data: {}, success: false, error: error instanceof Error ? error.message : 'Failed to batch fetch photos' };
    }
  }
}
