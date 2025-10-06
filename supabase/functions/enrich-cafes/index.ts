import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceDetails {
  opening_hours?: { weekday_text: string[] };
  formatted_phone_number?: string;
  website?: string;
  reviews?: Array<{
    author_name: string;
    text: string;
    rating: number;
    time: number;
    profile_photo_url?: string;
  }>;
  editorial_summary?: { overview: string };
}

function inferParkingInfo(editorial?: string, reviews?: PlaceDetails['reviews']): string {
  const text = `${editorial || ''} ${reviews?.map(r => r.text).join(' ') || ''}`.toLowerCase();
  
  if (text.includes('no parking') || text.includes('limited parking')) {
    return 'Limited or no parking available';
  } else if (text.includes('parking') || text.includes('garage') || text.includes('lot')) {
    return 'Parking available nearby';
  } else if (text.includes('street parking')) {
    return 'Street parking available';
  }
  
  return 'Parking information not available';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('VITE_GOOGLE_PLACES_API_KEY');

    if (!googleApiKey) {
      throw new Error('VITE_GOOGLE_PLACES_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch cafes missing opening_hours
    const { data: cafes, error: cafesError } = await supabase
      .from('cafes')
      .select('id, place_id, name, neighborhood')
      .eq('is_active', true)
      .is('opening_hours', null);

    if (cafesError) throw cafesError;

    console.log(`Starting enrichment for ${cafes.length} cafes missing data`);

    let enriched = 0;
    let totalReviewsInserted = 0;
    let failed = 0;

    for (let i = 0; i < cafes.length; i++) {
      const cafe = cafes[i];
      
      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${cafe.place_id}&fields=opening_hours,formatted_phone_number,website,reviews,editorial_summary&key=${googleApiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          failed++;
          continue;
        }

        const data = await response.json();
        const details: PlaceDetails = data.result;

        if (details) {
          // Update cafe
          const updateData: any = {
            updated_at: new Date().toISOString(),
          };

          if (details.opening_hours?.weekday_text) {
            updateData.opening_hours = details.opening_hours.weekday_text;
          }
          if (details.formatted_phone_number) {
            updateData.phone_number = details.formatted_phone_number;
          }
          if (details.website) {
            updateData.website = details.website;
          }
          
          updateData.parking_info = inferParkingInfo(
            details.editorial_summary?.overview,
            details.reviews
          );

          await supabase.from('cafes').update(updateData).eq('id', cafe.id);

          // Insert reviews (top 5)
          if (details.reviews && details.reviews.length > 0) {
            const reviewsToInsert = details.reviews.slice(0, 5).map(review => ({
              cafe_id: cafe.id,
              reviewer_name: review.author_name,
              review_text: review.text,
              rating: review.rating,
              time: new Date(review.time * 1000).toISOString(),
              profile_photo_url: review.profile_photo_url,
            }));

            const { error: reviewError } = await supabase
              .from('cafe_reviews')
              .upsert(reviewsToInsert, {
                onConflict: 'cafe_id,reviewer_name,review_text',
                ignoreDuplicates: true
              });

            if (!reviewError) {
              totalReviewsInserted += reviewsToInsert.length;
              console.log(`📝 Inserted ${reviewsToInsert.length} reviews for ${cafe.name}`);
            }
          }

          enriched++;
          console.log(`[${i + 1}/${cafes.length}] ✅ ${cafe.name} (${cafe.neighborhood})`);
        }

        // Rate limiting: 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to enrich ${cafe.name}:`, error);
        failed++;
      }
    }

    const message = `✅ Enriched ${enriched} cafés, inserted ${totalReviewsInserted} reviews. Failed: ${failed}`;
    console.log(message);

    return new Response(JSON.stringify({ 
      success: true, 
      message,
      stats: {
        processed: cafes.length,
        succeeded: enriched,
        failed: failed,
        reviewsAdded: totalReviewsInserted,
        apiCalls: cafes.length,
        estimatedCost: cafes.length * 0.017
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in enrich-cafes function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      message: error.message || 'Failed to run enrichment',
      error: error.message
    }), {
      status: 200, // Return 200 to match expected format
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
