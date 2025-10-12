import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CafeData {
  place_id: string;
  name: string;
  address: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
  google_rating?: number;
  price_level?: number;
  phone_number?: string;
  website?: string;
  opening_hours?: string[];
  photos?: string[];
  hero_photo_url?: string;
  google_photo_reference?: string;
  parking_info?: string;
  tags?: string[];
  is_active?: boolean;
}

interface SeedingResult {
  success: boolean;
  message: string;
  stats: {
    cafes_processed: number;
    cafes_added: number;
    reviews_added: number;
    api_calls: number;
    errors: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Google Places API key not configured',
          stats: {
            cafes_processed: 0,
            cafes_added: 0,
            reviews_added: 0,
            api_calls: 0,
            errors: ['Missing Google Places API key']
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { action } = await req.json();

    if (action !== 'seed-all') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid action',
          stats: {
            cafes_processed: 0,
            cafes_added: 0,
            reviews_added: 0,
            api_calls: 0,
            errors: ['Invalid action specified']
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Houston coordinates for comprehensive coverage
    const houstonCoordinates = [
      { name: "Downtown", lat: 29.7604, lng: -95.3698, radius: 2000 },
      { name: "Montrose", lat: 29.7367, lng: -95.3964, radius: 1500 },
      { name: "Heights", lat: 29.7949, lng: -95.3995, radius: 1500 },
      { name: "Rice Village", lat: 29.7218, lng: -95.4030, radius: 1000 },
      { name: "West University", lat: 29.7183, lng: -95.4289, radius: 1000 },
      { name: "Midtown", lat: 29.7344, lng: -95.3800, radius: 1500 },
      { name: "Galleria", lat: 29.7374, lng: -95.4619, radius: 1500 },
      { name: "Greenway Plaza", lat: 29.7303, lng: -95.4234, radius: 1000 },
      { name: "Medical Center", lat: 29.7041, lng: -95.3983, radius: 1500 },
      { name: "Memorial", lat: 29.7811, lng: -95.5208, radius: 1500 },
      { name: "Spring Branch", lat: 29.8059, lng: -95.5156, radius: 2000 },
      { name: "Katy", lat: 29.7858, lng: -95.8244, radius: 2000 },
      { name: "Sugar Land", lat: 29.6197, lng: -95.6349, radius: 2000 },
      { name: "Pearland", lat: 29.5636, lng: -95.2860, radius: 2000 },
      { name: "The Woodlands", lat: 30.1658, lng: -95.4613, radius: 2000 }
    ];

    const searchTerms = [
      'coffee shop',
      'cafe',
      'coffee',
      'espresso',
      'latte',
      'cappuccino',
      'specialty coffee',
      'third wave coffee',
      'coffee bar',
      'breakfast coffee',
      'coffee beans',
      'Starbucks',
      'Dunkin',
      'local coffee'
    ];

    // Convert Google's price level strings to integers for database
    function convertPriceLevel(priceLevel: string): number | null {
      switch (priceLevel) {
        case 'PRICE_LEVEL_FREE': return 0;
        case 'PRICE_LEVEL_INEXPENSIVE': return 1;
        case 'PRICE_LEVEL_MODERATE': return 2;
        case 'PRICE_LEVEL_EXPENSIVE': return 3;
        case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4;
        default: return null;
      }
    }

    // Get neighborhood from address
    function extractNeighborhood(address: string): string {
      const parts = address.split(',');
      if (parts.length >= 2) {
        return parts[1].trim();
      }
      return 'Houston';
    }

    // Fetch cafe details from Google Places
    async function getCafeDetails(placeId: string): Promise<any> {
      try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,price_level,photos&key=${GOOGLE_PLACES_API_KEY}`);
        const data = await response.json();
        
        if (data.status === 'OK' && data.result) {
          return {
            phone_number: data.result.formatted_phone_number,
            website: data.result.website,
            opening_hours: data.result.opening_hours?.weekday_text || [],
            price_level: data.result.price_level,
            photos: data.result.photos?.map((p: any) => p.photo_reference) || []
          };
        }
      } catch (error) {
        console.error(`Error fetching details for ${placeId}:`, error);
      }
      
      return null;
    }

    // Fetch Google reviews for a cafe
    async function getCafeReviews(placeId: string): Promise<any[]> {
      try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${GOOGLE_PLACES_API_KEY}`);
        const data = await response.json();
        
        if (data.status === 'OK' && data.result?.reviews) {
          return data.result.reviews
            .filter((review: any) => review.text && review.text.length > 10)
            .slice(0, 5); // Top 5 reviews
        }
      } catch (error) {
        console.error(`Error fetching reviews for ${placeId}:`, error);
      }
      
      return [];
    }

    // Save cafe to database
    async function saveCafeToDatabase(cafeData: CafeData): Promise<{ success: boolean; cafeId?: string; error?: string }> {
      try {
        const { data, error } = await supabaseClient
          .from('cafes')
          .upsert(cafeData, { onConflict: 'place_id' })
          .select('id')
          .single();

        if (error) {
          console.error('Error saving cafe:', error);
          return { success: false, error: error.message };
        }

        return { success: true, cafeId: data.id };
      } catch (error: any) {
        console.error('Error saving cafe:', error);
        return { success: false, error: error.message };
      }
    }

    // Save reviews to database
    async function saveReviewsToDatabase(cafeId: string, reviews: any[]): Promise<number> {
      if (reviews.length === 0) return 0;

      try {
        const reviewData = reviews.map(review => ({
          cafe_id: cafeId,
          reviewer_name: review.author_name,
          rating: review.rating,
          review_text: review.text,
          profile_photo_url: review.profile_photo_url,
          time: new Date(review.time * 1000).toISOString()
        }));

        const { error } = await supabaseClient
          .from('cafe_reviews')
          .insert(reviewData);

        if (error) {
          console.error('Error saving reviews:', error);
          return 0;
        }

        return reviews.length;
      } catch (error) {
        console.error('Error saving reviews:', error);
        return 0;
      }
    }

    // Main seeding logic
    console.log('🌱 Starting comprehensive cafe data seeding...');

    let totalProcessed = 0;
    let totalAdded = 0;
    let totalReviews = 0;
    let totalApiCalls = 0;
    const errors: string[] = [];
    const processedPlaceIds = new Set<string>();

    const startTime = Date.now();

    for (let i = 0; i < houstonCoordinates.length; i++) {
      const location = houstonCoordinates[i];
      console.log(`📍 Zone ${i + 1}/${houstonCoordinates.length}: ${location.name}`);

      for (const searchTerm of searchTerms) {
        const query = `${searchTerm} ${location.name}`;
        console.log(`  🔍 Searching: "${searchTerm}"`);

        try {
          totalApiCalls++;

          const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.photos,places.types,places.businessStatus'
            },
            body: JSON.stringify({
              textQuery: query,
              locationBias: {
                circle: {
                  center: { latitude: location.lat, longitude: location.lng },
                  radius: location.radius
                }
              },
              maxResultCount: 20
            })
          });

          const data = await response.json();

          if (data.error) {
            console.error(`    ❌ Google API Error:`, data.error);
            errors.push(`API Error for ${query}: ${data.error.message}`);
            continue;
          }

          if (!data.places || data.places.length === 0) {
            console.log(`    📊 No results found`);
            continue;
          }

          const resultsCount = data.places.length;
          console.log(`    📊 Found ${resultsCount} results`);

          for (const place of data.places) {
            // Skip duplicates
            if (processedPlaceIds.has(place.id)) {
              continue;
            }

            // Skip permanently closed businesses
            if (place.businessStatus === 'CLOSED_PERMANENTLY') {
              console.log(`    ⏭️ Skipping closed: ${place.displayName?.text}`);
              continue;
            }

            processedPlaceIds.add(place.id);
            totalProcessed++;

            try {
              // Prepare cafe data
              const cafeData: CafeData = {
                place_id: place.id,
                name: place.displayName?.text || 'Unknown Cafe',
                address: place.formattedAddress || '',
                neighborhood: extractNeighborhood(place.formattedAddress || ''),
                latitude: place.location?.latitude || 0,
                longitude: place.location?.longitude || 0,
                google_rating: place.rating,
                price_level: convertPriceLevel(place.priceLevel),
                tags: [],
                is_active: true
              };

              // Get additional details
              const details = await getCafeDetails(place.id);
              if (details) {
                cafeData.phone_number = details.phone_number;
                cafeData.website = details.website;
                cafeData.opening_hours = details.opening_hours;
                cafeData.price_level = details.price_level || cafeData.price_level;
                cafeData.photos = details.photos;
                cafeData.google_photo_reference = details.photos?.[0];
                totalApiCalls++;
              }

              // Save cafe to database
              const saveResult = await saveCafeToDatabase(cafeData);
              if (saveResult.success) {
                totalAdded++;
                console.log(`    ✅ Saved: ${cafeData.name}`);

                // Get and save reviews
                if (saveResult.cafeId) {
                  const reviews = await getCafeReviews(place.id);
                  if (reviews.length > 0) {
                    const reviewsAdded = await saveReviewsToDatabase(saveResult.cafeId, reviews);
                    totalReviews += reviewsAdded;
                    console.log(`    📝 Added ${reviewsAdded} reviews`);
                    totalApiCalls++;
                  }
                }
              } else {
                console.error(`    ❌ Failed to save: ${cafeData.name} - ${saveResult.error}`);
                errors.push(`Failed to save ${cafeData.name}: ${saveResult.error}`);
              }

            } catch (error: any) {
              console.error(`    ❌ Error processing ${place.displayName?.text}:`, error);
              errors.push(`Error processing ${place.displayName?.text}: ${error.message}`);
            }

            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (error: any) {
          console.error(`    ❌ Search error for "${searchTerm}":`, error);
          errors.push(`Search error for "${searchTerm}": ${error.message}`);
        }

        // Rate limiting delay between searches
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('\n=== Seeding Complete ===');
    console.log(`⏱️ Duration: ${duration}s`);
    console.log(`📍 Zones processed: ${houstonCoordinates.length}`);
    console.log(`🔍 Search terms: ${searchTerms.length}`);
    console.log(`📊 Total places found: ${processedPlaceIds.size}`);
    console.log(`✅ Cafes added: ${totalAdded}`);
    console.log(`📝 Reviews added: ${totalReviews}`);
    console.log(`🌐 API calls made: ${totalApiCalls}`);
    console.log(`❌ Errors: ${errors.length}`);

    const success = totalAdded > 0 && errors.length < totalProcessed * 0.1; // Less than 10% error rate

    const result: SeedingResult = {
      success,
      message: success 
        ? `Successfully seeded ${totalAdded} cafes with ${totalReviews} reviews` 
        : `Seeding completed with ${errors.length} errors`,
      stats: {
        cafes_processed: totalProcessed,
        cafes_added: totalAdded,
        reviews_added: totalReviews,
        api_calls: totalApiCalls,
        errors
      }
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Seeding function error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Seeding failed with error: ' + error.message,
        stats: {
          cafes_processed: 0,
          cafes_added: 0,
          reviews_added: 0,
          api_calls: 0,
          errors: [error.message]
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})
