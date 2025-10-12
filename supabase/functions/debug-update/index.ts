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

    // Get 5 sample cafes to test
    const { data: sampleCafes, error: cafesError } = await supabase
      .from('cafes')
      .select('id, place_id, name, neighborhood, opening_hours, phone_number, website, price_level')
      .eq('is_active', true)
      .or('opening_hours.is.null,phone_number.is.null,website.is.null,price_level.is.null')
      .limit(5);

    if (cafesError) {
      return new Response(JSON.stringify({ 
        error: 'Database error: ' + cafesError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!sampleCafes || sampleCafes.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No cafes found that need enrichment'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const cafe of sampleCafes) {
      console.log(`Testing database update for: ${cafe.name}`);
      console.log(`Current data: opening_hours=${cafe.opening_hours}, phone_number=${cafe.phone_number}, website=${cafe.website}`);

      // Get data from Google Places API
      const url = `https://places.googleapis.com/v1/places/${cafe.place_id}?fields=regularOpeningHours,internationalPhoneNumber,websiteUri,reviews,editorialSummary,priceLevel&key=${googleApiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      console.log(`API Response status: ${response.status}`);
      console.log(`API Response data keys: ${Object.keys(data)}`);

      if (data.error) {
        results.push({
          cafe: cafe.name,
          error: 'Google API error: ' + data.error.message
        });
        continue;
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      let hasNewData = false;

      // Only update if the field is currently null/empty
      if (data.regularOpeningHours?.weekdayDescriptions && !cafe.opening_hours) {
        updateData.opening_hours = data.regularOpeningHours.weekdayDescriptions;
        hasNewData = true;
        console.log(`Will update opening_hours with: ${data.regularOpeningHours.weekdayDescriptions.length} days`);
      }
      if (data.internationalPhoneNumber && !cafe.phone_number) {
        updateData.phone_number = data.internationalPhoneNumber;
        hasNewData = true;
        console.log(`Will update phone_number with: ${data.internationalPhoneNumber}`);
      }
      if (data.websiteUri && !cafe.website) {
        updateData.website = data.websiteUri;
        hasNewData = true;
        console.log(`Will update website with: ${data.websiteUri}`);
      }
      if (data.priceLevel !== undefined && !cafe.price_level) {
        updateData.price_level = data.priceLevel;
        hasNewData = true;
        console.log(`Will update price_level with: ${data.priceLevel}`);
      }

      console.log(`Update data: ${JSON.stringify(updateData, null, 2)}`);

      // Perform the database update
      const { data: updateResult, error: updateError } = await supabase
        .from('cafes')
        .update(updateData)
        .eq('id', cafe.id)
        .select();

      console.log(`Database update result: ${JSON.stringify(updateResult)}`);
      console.log(`Database update error: ${JSON.stringify(updateError)}`);

      // Verify the update by fetching the cafe again
      const { data: verifyCafe, error: verifyError } = await supabase
        .from('cafes')
        .select('id, name, opening_hours, phone_number, website, price_level')
        .eq('id', cafe.id)
        .single();

      console.log(`Verification query result: ${JSON.stringify(verifyCafe)}`);
      console.log(`Verification query error: ${JSON.stringify(verifyError)}`);

      results.push({
        cafe: {
          id: cafe.id,
          name: cafe.name,
          originalData: {
            opening_hours: cafe.opening_hours,
            phone_number: cafe.phone_number,
            website: cafe.website,
            price_level: cafe.price_level
          },
          apiData: {
            openingHours: data.regularOpeningHours?.weekdayDescriptions,
            phoneNumber: data.internationalPhoneNumber,
            websiteUri: data.websiteUri,
            priceLevel: data.priceLevel
          },
          updateData: updateData,
          hasNewData: hasNewData,
          updateResult: updateResult,
          updateError: updateError,
          verifiedData: verifyCafe
        }
      });

      // Add delay between API calls
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Response(JSON.stringify({ 
      success: true,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in debug-update function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
