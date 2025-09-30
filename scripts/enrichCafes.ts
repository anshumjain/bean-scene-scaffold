/**
 * Enrich existing cafes with data from Google Places Details API
 * - Fetches opening_hours, phone_number, website, reviews
 * - Infers parking_info from editorial_summary and reviews
 * - Inserts top 5 Google Reviews into cafe_reviews table
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hhdcequsdmosxzjebdyj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

if (!GOOGLE_PLACES_API_KEY) {
  console.error('❌ GOOGLE_PLACES_API_KEY is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PlaceDetails {
  opening_hours?: {
    weekday_text: string[];
  };
  formatted_phone_number?: string;
  website?: string;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
    profile_photo_url?: string;
  }>;
  editorial_summary?: {
    overview?: string;
  };
}

/**
 * Fetch place details from Google Places API
 */
async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const fields = [
    'opening_hours',
    'formatted_phone_number',
    'website',
    'reviews',
    'editorial_summary'
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error(`  ❌ Failed to fetch details: ${data.status} - ${data.error_message || ''}`);
      return null;
    }

    return data.result;
  } catch (error) {
    console.error(`  ❌ Error fetching place details:`, error);
    return null;
  }
}

/**
 * Infer parking info from text descriptions (Option 2 heuristics)
 */
function inferParkingInfo(summary?: string, reviews?: Array<{ text: string }>): string {
  const text = [
    summary || '',
    ...(reviews?.map(r => r.text) || [])
  ].join(' ').toLowerCase();

  // Heuristic patterns
  if (text.includes('parking lot') || text.includes('free parking')) {
    return 'Free parking lot available';
  }
  if (text.includes('garage') || text.includes('parking garage')) {
    return 'Parking garage nearby';
  }
  if (text.includes('valet')) {
    return 'Valet parking available';
  }
  if (text.includes('no parking') || text.includes('limited parking')) {
    return 'Limited parking - street only';
  }
  if (text.includes('street parking')) {
    return 'Street parking available';
  }

  // Default for Houston urban areas
  return 'Street parking available';
}

/**
 * Sleep for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main enrichment function
 */
async function enrichCafes() {
  console.log('🚀 Starting cafe enrichment...\n');

  // Fetch cafes that need enrichment (missing opening_hours or other data)
  const { data: cafes, error } = await supabase
    .from('cafes')
    .select('id, place_id, name')
    .is('opening_hours', null)
    .eq('is_active', true)
    .limit(1200);

  if (error) {
    console.error('❌ Failed to fetch cafes:', error.message);
    process.exit(1);
  }

  if (!cafes || cafes.length === 0) {
    console.log('✅ No cafes need enrichment!');
    return;
  }

  console.log(`📊 Found ${cafes.length} cafes to enrich\n`);

  let successCount = 0;
  let failCount = 0;
  let reviewsInserted = 0;

  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];
    const progress = ((i + 1) / cafes.length * 100).toFixed(1);

    console.log(`[${i + 1}/${cafes.length}] (${progress}%) Enriching: ${cafe.name}`);

    try {
      // Fetch place details from Google
      const details = await fetchPlaceDetails(cafe.place_id);

      if (!details) {
        console.log(`  ⚠️  No details found, skipping...`);
        failCount++;
        continue;
      }

      // Prepare cafe update data
      const cafeUpdate: any = {
        updated_at: new Date().toISOString()
      };

      if (details.opening_hours?.weekday_text) {
        cafeUpdate.opening_hours = details.opening_hours.weekday_text;
      }

      if (details.formatted_phone_number) {
        cafeUpdate.phone_number = details.formatted_phone_number;
      }

      if (details.website) {
        cafeUpdate.website = details.website;
      }

      // Infer parking info
      const parkingInfo = inferParkingInfo(
        details.editorial_summary?.overview,
        details.reviews
      );
      cafeUpdate.parking_info = parkingInfo;

      // Update cafe in database
      const { error: updateError } = await supabase
        .from('cafes')
        .update(cafeUpdate)
        .eq('id', cafe.id);

      if (updateError) {
        console.log(`  ❌ Failed to update cafe: ${updateError.message}`);
        failCount++;
        continue;
      }

      // Insert reviews if available
      if (details.reviews && details.reviews.length > 0) {
        const reviewsToInsert = details.reviews.slice(0, 5).map(review => ({
          cafe_id: cafe.id,
          reviewer_name: review.author_name,
          rating: review.rating,
          review_text: review.text,
          profile_photo_url: review.profile_photo_url,
          time: new Date(review.time * 1000).toISOString()
        }));

        const { error: reviewError } = await supabase
          .from('cafe_reviews')
          .upsert(reviewsToInsert, {
            onConflict: 'cafe_id,reviewer_name,review_text'
          });

        if (reviewError) {
          console.log(`  ⚠️  Failed to insert reviews: ${reviewError.message}`);
        } else {
          reviewsInserted += reviewsToInsert.length;
          console.log(`  ✅ Inserted ${reviewsToInsert.length} reviews`);
        }
      }

      successCount++;
      console.log(`  ✅ Enriched successfully`);

    } catch (error) {
      console.log(`  ❌ Error:`, error);
      failCount++;
    }

    // Rate limiting: 10 requests per second
    await sleep(100);

    // Progress update every 50 cafes
    if ((i + 1) % 50 === 0) {
      console.log(`\n📈 Progress: ${i + 1}/${cafes.length} (${progress}%)`);
      console.log(`   ✅ Success: ${successCount} | ❌ Failed: ${failCount} | 📝 Reviews: ${reviewsInserted}\n`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 ENRICHMENT COMPLETE!');
  console.log('='.repeat(60));
  console.log(`✅ Successfully enriched: ${successCount} cafes`);
  console.log(`❌ Failed: ${failCount} cafes`);
  console.log(`📝 Reviews inserted: ${reviewsInserted}`);
  console.log(`📊 API calls made: ${cafes.length}`);
  console.log(`💰 Estimated cost: $${(cafes.length * 0.017).toFixed(2)} (Details API)`);
  console.log('='.repeat(60) + '\n');
}

// Run the script
enrichCafes()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
