import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceDetails {
  regularOpeningHours?: { 
    openNow?: boolean;
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
    weekdayDescriptions?: string[];
  };
  internationalPhoneNumber?: string;
  websiteUri?: string;
  priceLevel?: number;
  reviews?: Array<{
    authorAttribution?: {
      displayName: string;
      uri?: string;
      photoUri?: string;
    };
    text?: {
      text: string;
    };
    rating?: number;
    publishTime?: string;
  }>;
  editorialSummary?: { 
    text: string;
  };
}

function inferParkingInfo(editorial?: string, reviews?: PlaceDetails['reviews']): string {
  const reviewTexts = reviews?.map(r => r.text?.text || '').join(' ') || '';
  const text = `${editorial || ''} ${reviewTexts}`.toLowerCase();
  
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
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

    // Parse request body to get batch information
    let requestBody = null;
    let batchNumber = 1;
    let totalBatches = 1;
    
    try {
      requestBody = await req.json();
      batchNumber = requestBody?.batchNumber || 1;
      totalBatches = requestBody?.totalBatches || 1;
    } catch (e) {
      // Request body parsing failed, use defaults
    }

    if (!googleApiKey) {
      console.error('GOOGLE_PLACES_API_KEY environment variable is not set');
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Google Places API key not configured. Please set GOOGLE_PLACES_API_KEY environment variable.',
        error: 'Missing API key configuration'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch cafes missing key data (opening_hours OR phone_number OR website OR price_level OR parking_info)
    const { data: cafes, error: cafesError } = await supabase
      .from('cafes')
      .select('id, place_id, name, neighborhood, opening_hours, phone_number, website, price_level, parking_info')
      .eq('is_active', true)
      .or('opening_hours.is.null,phone_number.is.null,website.is.null,price_level.is.null,parking_info.is.null');

    if (cafesError) {
      console.error('Database error fetching cafes:', cafesError);
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Database error: ' + cafesError.message,
        error: cafesError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting enrichment for ${cafes.length} cafes missing data`);
    
    // Process in smaller batches to avoid timeouts
    const batchSize = 20;
    const calculatedTotalBatches = Math.ceil(cafes.length / batchSize);
    
    // Use provided totalBatches if available, otherwise calculate it
    const finalTotalBatches = totalBatches > 1 ? totalBatches : calculatedTotalBatches;

    let enriched = 0;
    let totalReviewsInserted = 0;
    let failed = 0;
    let processed = 0;

    // Calculate which batch to process
    const startIndex = (batchNumber - 1) * batchSize;
    const endIndex = Math.min(startIndex + batchSize, cafes.length);
    const cafesToProcess = cafes.slice(startIndex, endIndex);
    
    console.log(`Processing batch ${batchNumber}/${finalTotalBatches} (cafes ${startIndex + 1}-${endIndex} of ${cafes.length})`);

    for (let i = 0; i < cafesToProcess.length; i++) {
      const cafe = cafesToProcess[i];
      
      try {
        const url = `https://places.googleapis.com/v1/places/${cafe.place_id}?fields=regularOpeningHours,internationalPhoneNumber,websiteUri,reviews,editorialSummary,priceLevel&key=${googleApiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          failed++;
          console.log(`[${i + 1}/${cafesToProcess.length}] ❌ ${cafe.name} - API error: ${response.status} ${response.statusText}`);
          continue;
        }

        const data = await response.json();
        
        // Check for Google Places API errors
        if (data.error) {
          failed++;
          console.log(`[${i + 1}/${cafesToProcess.length}] ❌ ${cafe.name} - Google API error: ${data.error.message || 'Unknown error'}`);
          continue;
        }
        
        // New API returns data directly, not in a 'result' wrapper
        const details: PlaceDetails = data;

        // Always update the cafe record if we got a response (even if no data)
        if (details && Object.keys(details).length > 0) {
          processed++;
          
          // Update cafe
          const updateData: any = {
            updated_at: new Date().toISOString(),
          };

          let hasNewData = false;

          // Only update if the field is currently null/empty
          if (details.regularOpeningHours?.weekdayDescriptions && !cafe.opening_hours) {
            updateData.opening_hours = details.regularOpeningHours.weekdayDescriptions;
            hasNewData = true;
          }
          if (details.internationalPhoneNumber && !cafe.phone_number) {
            updateData.phone_number = details.internationalPhoneNumber;
            hasNewData = true;
          }
          if (details.websiteUri && !cafe.website) {
            updateData.website = details.websiteUri;
            hasNewData = true;
          }
          if (details.priceLevel !== undefined && !cafe.price_level) {
            updateData.price_level = details.priceLevel;
            hasNewData = true;
          }
          
          // Add parking info
          updateData.parking_info = inferParkingInfo(
            details.editorialSummary?.text,
            details.reviews
          );

          await supabase.from('cafes').update(updateData).eq('id', cafe.id);
        
        // Add small delay to be gentle on the API
        await new Promise(resolve => setTimeout(resolve, 100));

          // Insert reviews (top 5)
          if (details.reviews && details.reviews.length > 0) {
            const reviewsToInsert = details.reviews.slice(0, 5).map(review => ({
              cafe_id: cafe.id,
              reviewer_name: review.authorAttribution?.displayName || 'Anonymous',
              review_text: review.text?.text || '',
              rating: review.rating || 0,
              time: review.publishTime ? new Date(review.publishTime).toISOString() : new Date().toISOString(),
              profile_photo_url: review.authorAttribution?.photoUri || null,
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

          if (hasNewData) {
            enriched++;
            const updates = [];
            if (updateData.opening_hours) updates.push('hours');
            if (updateData.phone_number) updates.push('phone');
            if (updateData.website) updates.push('website');
            if (updateData.price_level !== undefined) updates.push('price');
            if (updateData.parking_info) updates.push('parking');
            console.log(`[${i + 1}/${cafesToProcess.length}] ✅ ${cafe.name} (${cafe.neighborhood}) - Added: ${updates.join(', ')}`);
          } else {
            console.log(`[${i + 1}/${cafesToProcess.length}] ⚠️ ${cafe.name} (${cafe.neighborhood}) - Already complete or no data available`);
          }
        } else {
          failed++;
          console.log(`[${i + 1}/${cafesToProcess.length}] ❌ ${cafe.name} - No data from Google Places`);
        }

        // Rate limiting: 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to enrich ${cafe.name}:`, error);
        failed++;
      }
    }

    const message = `✅ Processed ${processed} cafés (batch ${batchNumber}/${finalTotalBatches}), enriched ${enriched} with new data, inserted ${totalReviewsInserted} reviews. Failed: ${failed}`;
    console.log(message);

    // Auto-continue to next batch if there are more batches
    if (batchNumber < finalTotalBatches) {
      console.log(`🔄 Auto-continuing to batch ${batchNumber + 1}/${finalTotalBatches}...`);
      
      // Trigger the next batch by calling the function again
      try {
        const nextBatchResponse = await fetch(`https://${supabaseUrl.split('//')[1]}/functions/v1/enrich-cafes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            action: 'continue',
            batchNumber: batchNumber + 1,
            totalBatches: finalTotalBatches
          })
        });
        
        if (nextBatchResponse.ok) {
          const nextBatchData = await nextBatchResponse.json();
          console.log(`✅ Next batch completed: ${nextBatchData.message}`);
        } else {
          console.log(`⚠️ Next batch failed to start automatically`);
        }
      } catch (error) {
        console.log(`⚠️ Error starting next batch: ${error.message}`);
      }
    } else {
      console.log(`🎉 All batches completed! Total: ${finalTotalBatches} batches`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message,
      stats: {
        processed: processed,
        enriched: enriched,
        failed: failed,
        reviewsAdded: totalReviewsInserted,
        apiCalls: cafesToProcess.length,
        totalCafes: cafes.length,
        batchProcessed: batchNumber,
        totalBatches: finalTotalBatches,
        estimatedCost: cafesToProcess.length * 0.017
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
      status: 500, // Return 500 for server errors
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
