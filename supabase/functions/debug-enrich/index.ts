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
      return new Response(JSON.stringify({ 
        error: 'GOOGLE_PLACES_API_KEY not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get a few sample cafes to test
    const { data: sampleCafes, error: cafesError } = await supabase
      .from('cafes')
      .select('id, place_id, name, neighborhood, opening_hours, phone_number, website')
      .eq('is_active', true)
      .or('opening_hours.is.null,phone_number.is.null,website.is.null')
      .limit(3);

    if (cafesError) {
      return new Response(JSON.stringify({ 
        error: 'Database error: ' + cafesError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const cafe of sampleCafes) {
      const url = `https://places.googleapis.com/v1/places/${cafe.place_id}?fields=regularOpeningHours,internationalPhoneNumber,websiteUri,reviews,editorialSummary&key=${googleApiKey}`;
      
      console.log(`Testing API call for: ${cafe.name}`);
      console.log(`URL: ${url.replace(googleApiKey, '[API_KEY]')}`);
      
      const response = await fetch(url);
      const responseText = await response.text();
      
      let apiData = null;
      try {
        apiData = JSON.parse(responseText);
      } catch (e) {
        apiData = { parseError: e.message, rawResponse: responseText.substring(0, 500) };
      }
      
      // Check what data we would update
      const wouldUpdate = {
        opening_hours: !cafe.opening_hours && apiData?.regularOpeningHours?.weekdayDescriptions,
        phone_number: !cafe.phone_number && apiData?.internationalPhoneNumber,
        website: !cafe.website && apiData?.websiteUri
      };
      
      results.push({
        cafe: {
          id: cafe.id,
          name: cafe.name,
          neighborhood: cafe.neighborhood,
          currentData: {
            has_opening_hours: !!cafe.opening_hours,
            has_phone: !!cafe.phone_number,
            has_website: !!cafe.website
          }
        },
        apiResponse: {
          status: response.status,
          ok: response.ok,
          data: apiData
        },
        wouldUpdate: wouldUpdate,
        hasNewData: Object.values(wouldUpdate).some(Boolean)
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in debug-enrich function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});









