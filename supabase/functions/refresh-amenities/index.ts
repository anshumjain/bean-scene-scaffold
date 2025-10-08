import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

    if (!googleApiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active cafes
    const { data: cafes, error: cafesError } = await supabase
      .from('cafes')
      .select('id, place_id, name')
      .eq('is_active', true);

    if (cafesError) throw cafesError;

    console.log(`Starting amenities refresh for ${cafes.length} cafes`);

    let updated = 0;
    let apiCalls = 0;
    let failed = 0;
    const MAX_API_CALLS = 2000;

    for (const cafe of cafes) {
      if (apiCalls >= MAX_API_CALLS) break;

      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${cafe.place_id}&fields=opening_hours,formatted_phone_number,website&key=${googleApiKey}`;
        
        apiCalls++;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`Failed to fetch details for ${cafe.name}`);
          failed++;
          continue;
        }

        const data = await response.json();
        const details = data.result;

        if (details) {
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

        const { error: updateError } = await supabase
          .from('cafes')
          .update(updateData)
          .eq('id', cafe.id);

        if (updateError) {
          console.error(`Error updating ${cafe.name}:`, updateError);
          failed++;
        } else {
          updated++;
          console.log(`✅ ${cafe.name}: Updated amenities`);
        }

        // Rate limiting: 100ms delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      } catch (error) {
        console.error(`Failed to process ${cafe.name}:`, error);
        failed++;
      }
    }

    const message = `✅ Updated ${updated} cafés. API calls used: ${apiCalls} of ${MAX_API_CALLS}`;
    console.log(message);

    return new Response(JSON.stringify({ 
      success: true, 
      message,
      stats: {
        processed: cafes.length,
        succeeded: updated,
        failed: cafes.length - updated,
        apiCalls: apiCalls,
        estimatedCost: apiCalls * 0.017
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in refresh-amenities function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      message: error.message || 'Failed to refresh amenities',
      error: error.message
    }), {
      status: 200, // Return 200 to match expected format
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
