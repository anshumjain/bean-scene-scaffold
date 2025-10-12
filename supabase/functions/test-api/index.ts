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

    // Get one sample cafe
    const { data: cafes, error: cafesError } = await supabase
      .from('cafes')
      .select('id, place_id, name, neighborhood')
      .eq('is_active', true)
      .limit(1);

    if (cafesError) {
      return new Response(JSON.stringify({ 
        error: 'Database error: ' + cafesError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!cafes || cafes.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No cafes found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cafe = cafes[0];
    const url = `https://places.googleapis.com/v1/places/${cafe.place_id}?fields=regularOpeningHours,internationalPhoneNumber,websiteUri,reviews,editorialSummary&key=${googleApiKey}`;
    
    console.log(`Testing API call for: ${cafe.name}`);
    console.log(`URL: ${url.replace(googleApiKey, '[API_KEY]')}`);
    
    const response = await fetch(url);
    const responseText = await response.text();
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response text: ${responseText.substring(0, 500)}...`);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON response',
        status: response.status,
        responseText: responseText.substring(0, 500)
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      cafe: cafe,
      apiResponse: {
        status: response.status,
        ok: response.ok,
        data: data
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in test-api function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
