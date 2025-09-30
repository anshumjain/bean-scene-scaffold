/**
 * Enrich Cafes Script
 * 
 * This script fetches missing data from Google Places Details API and updates Supabase.
 * It will:
 * 1. Fetch cafes needing enrichment (missing opening_hours or other data)
 * 2. Call Google Places Details API for each cafe
 * 3. Update cafes table with opening_hours, phone_number, website, and parking_info
 * 4. Insert Google Reviews into cafe_reviews table (top 5 per cafe)
 * 
 * Usage: bun scripts/enrichCafes.ts
 * 
 * Note: Requires GOOGLE_PLACES_API_KEY environment variable
 * Cost: ~$0.017 per cafe (Details API)
 * For 1200 cafes: ~$20.40 (well within $200 monthly free credit)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.VITE_API_BASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!GOOGLE_PLACES_API_KEY) {
  console.error('❌ Missing GOOGLE_PLACES_API_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    profile_photo_url?: string;
    time: number;
  }>;
  editorial_summary?: {
    overview?: string;
  };
}

/**
 * Fetch Place Details from Google Places API
 */
async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  try {
    const fields = 'opening_hours,formatted_phone_number,website,reviews,editorial_summary';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error(`  ⚠️  Places API error for ${placeId}:`, data.status, data.error_message || '');
      return null;
    }
    
    return data.result;
  } catch (error) {
    console.error(`  ❌ Error fetching place details for ${placeId}:`, error);
    return null;
  }
}

/**
 * Infer parking info from editorial summary and reviews using heuristic patterns
 * Option 2: Text-based heuristics
 */
function inferParkingInfo(editorial?: string, reviews?: PlaceDetails['reviews']): string {
  // Combine all text sources
  const text = [
    editorial || '',
    ...(reviews || []).map(r => r.text)
  ].join(' ').toLowerCase();
  
  // Heuristic pattern matching
  if (text.includes('parking lot') || text.includes('free parking') || text.includes('ample parking')) {
    return 'Free parking lot available';
  }
  if (text.includes('street parking')) {
    return 'Street parking available';
  }
  if (text.includes('parking garage') || text.includes('garage parking')) {
    return 'Parking garage nearby';
  }
  if (text.includes('valet')) {
    return 'Valet parking available';
  }
  if (text.includes('no parking') || text.includes('limited parking') || text.includes('difficult to park')) {
    return 'Limited parking - street only';
  }
  if (text.includes('validated parking')) {
    return 'Validated parking available';
  }
  
  // Default for Houston cafes (most have street parking)
  return 'Street parking available';
}

/**
 * Main enrichment function
 */
async function enrichCafes() {
  console.log('🚀 Starting cafe enrichment...\n');
  
  // Fetch cafes needing enrichment (those without opening_hours)
  const { data: cafes, error } = await supabase
    .from('cafes')
    .select('id, place_id, name, neighborhood')
    .is('opening_hours', null)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching cafes:', error);
    return;
  }
  
  if (!cafes || cafes.length === 0) {
    console.log('✅ All cafes are already enriched!');
    return;
  }
  
  console.log(`📊 Found ${cafes.length} cafes to enrich\n`);
  
  let successCount = 0;
  let failCount = 0;
  let reviewsInserted = 0;
  
  // Process cafes with rate limiting (10 requests/second = 100ms between requests)
  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];
    const progress = ((i + 1) / cafes.length * 100).toFixed(1);
    
    console.log(`[${i + 1}/${cafes.length}] (${progress}%) Processing: ${cafe.name} (${cafe.neighborhood})`);
    
    // Fetch place details
    const details = await fetchPlaceDetails(cafe.place_id);
    
    if (!details) {
      console.log(`  ⚠️  Skipped (API error)\n`);
      failCount++;
      await sleep(100); // Rate limiting
      continue;
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (details.opening_hours?.weekday_text) {
      updateData.opening_hours = details.opening_hours.weekday_text;
    }
    
    if (details.formatted_phone_number) {
      updateData.phone_number = details.formatted_phone_number;
    }
    
    if (details.website) {
      updateData.website = details.website;
    }
    
    // Infer parking info
    const parkingInfo = inferParkingInfo(
      details.editorial_summary?.overview,
      details.reviews
    );
    updateData.parking_info = parkingInfo;
    
    // Update cafe in database
    const { error: updateError } = await supabase
      .from('cafes')
      .update(updateData)
      .eq('id', cafe.id);
    
    if (updateError) {
      console.log(`  ❌ Failed to update cafe:`, updateError.message);
      failCount++;
    } else {
      console.log(`  ✅ Updated cafe data`);
      successCount++;
    }
    
    // Insert reviews (top 5)
    if (details.reviews && details.reviews.length > 0) {
      const reviewsToInsert = details.reviews.slice(0, 5).map(review => ({
        cafe_id: cafe.id,
        reviewer_name: review.author_name,
        rating: review.rating,
        review_text: review.text,
        profile_photo_url: review.profile_photo_url || null,
        time: new Date(review.time * 1000).toISOString()
      }));
      
      const { error: reviewError } = await supabase
        .from('cafe_reviews')
        .upsert(reviewsToInsert, { 
          onConflict: 'cafe_id,reviewer_name,review_text',
          ignoreDuplicates: true 
        });
      
      if (reviewError) {
        console.log(`  ⚠️  Failed to insert reviews:`, reviewError.message);
      } else {
        console.log(`  📝 Inserted ${reviewsToInsert.length} reviews`);
        reviewsInserted += reviewsToInsert.length;
      }
    }
    
    console.log(); // Empty line for readability
    
    // Rate limiting: 10 requests per second
    await sleep(100);
    
    // Progress update every 50 cafes
    if ((i + 1) % 50 === 0) {
      console.log(`\n📈 Progress Report:`);
      console.log(`   Processed: ${i + 1}/${cafes.length}`);
      console.log(`   Success: ${successCount}`);
      console.log(`   Failed: ${failCount}`);
      console.log(`   Reviews: ${reviewsInserted}\n`);
    }
  }
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('🎉 ENRICHMENT COMPLETE!\n');
  console.log(`📊 Final Statistics:`);
  console.log(`   Total Processed: ${cafes.length}`);
  console.log(`   ✅ Successfully Enriched: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📝 Reviews Inserted: ${reviewsInserted}`);
  console.log(`   💰 Estimated Cost: $${(cafes.length * 0.017).toFixed(2)}`);
  console.log('='.repeat(50) + '\n');
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
