import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleReview {
  author_name: string;
  text: string;
  rating: number;
  time: number;
  profile_photo_url?: string;
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

    // Fetch all active cafes
    const { data: cafes, error: cafesError } = await supabase
      .from('cafes')
      .select('id, place_id, name, neighborhood')
      .eq('is_active', true);

    if (cafesError) throw cafesError;

    console.log(`Starting review enrichment for ${cafes.length} cafes`);

    let totalReviews = 0;
    let apiCalls = 0;
    const MAX_API_CALLS = 2000;
    const reviewSet = new Set();

    for (const cafe of cafes) {
      if (apiCalls >= MAX_API_CALLS) break;

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${cafe.place_id}&fields=reviews&key=${googleApiKey}`;
      
      apiCalls++;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Failed to fetch reviews for ${cafe.name}`);
        continue;
      }

      const data = await response.json();
      const googleReviews: GoogleReview[] = data.result?.reviews || [];

      // Take top 3 reviews
      const reviewsToInsert = [];
      for (const review of googleReviews.slice(0, 3)) {
        const key = `${cafe.place_id}|${review.author_name}|${review.text}`;
        if (!reviewSet.has(key)) {
          reviewSet.add(key);
          reviewsToInsert.push({
            cafe_id: cafe.id,
            reviewer_name: review.author_name,
            review_text: review.text,
            rating: review.rating,
            time: new Date(review.time * 1000).toISOString(),
            profile_photo_url: review.profile_photo_url,
          });
        }
      }

      if (reviewsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('cafe_reviews')
          .upsert(reviewsToInsert, { 
            onConflict: 'cafe_id,reviewer_name,review_text',
            ignoreDuplicates: true 
          });

        if (insertError) {
          console.error(`Error inserting reviews for ${cafe.name}:`, insertError);
        } else {
          totalReviews += reviewsToInsert.length;
          console.log(`✅ ${cafe.name}: ${reviewsToInsert.length} reviews added`);
        }
      }

      // Rate limiting: 100ms delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const message = `✅ Added ${totalReviews} reviews from ${cafes.length} cafés. API calls used: ${apiCalls} of ${MAX_API_CALLS}`;
    console.log(message);

    return new Response(JSON.stringify({ 
      success: true, 
      message,
      totalReviews,
      apiCalls 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in add-reviews function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
