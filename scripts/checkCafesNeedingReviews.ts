/**
 * Check which cafes need reviews without making API calls
 * Shows statistics to help decide which cafes to fetch reviews for
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCafesNeedingReviews() {
  console.log('🔍 Analyzing cafes that need reviews...\n');
  
  // Get all active cafes
  const { data: cafes, error: cafesError } = await supabase
    .from('cafes')
    .select('id, name, place_id, neighborhood, google_rating')
    .eq('is_active', true);
  
  if (cafesError) {
    console.error('❌ Error fetching cafes:', cafesError);
    return;
  }
  
  console.log(`📊 Total active cafes: ${cafes?.length || 0}\n`);
  
  // Get all reviews grouped by cafe
  const { data: reviews, error: reviewsError } = await supabase
    .from('cafe_reviews')
    .select('cafe_id, source');
  
  if (reviewsError) {
    console.error('❌ Error fetching reviews:', reviewsError);
    return;
  }
  
  // Count reviews per cafe
  const reviewsByCafe = new Map<string, number>();
  reviews?.forEach(review => {
    const count = reviewsByCafe.get(review.cafe_id) || 0;
    reviewsByCafe.set(review.cafe_id, count + 1);
  });
  
  // Categorize cafes
  const cafesWithReviews = cafes?.filter(c => (reviewsByCafe.get(c.id) || 0) > 0) || [];
  const cafesWithoutReviews = cafes?.filter(c => (reviewsByCafe.get(c.id) || 0) === 0) || [];
  const cafesWithFewReviews = cafes?.filter(c => {
    const count = reviewsByCafe.get(c.id) || 0;
    return count > 0 && count < 3;
  }) || [];
  
  console.log('📈 Review Coverage:');
  console.log(`   • Cafes with reviews: ${cafesWithReviews.length} (${((cafesWithReviews.length / (cafes?.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`   • Cafes without reviews: ${cafesWithoutReviews.length} (${((cafesWithoutReviews.length / (cafes?.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`   • Cafes with <3 reviews: ${cafesWithFewReviews.length} (${((cafesWithFewReviews.length / (cafes?.length || 1)) * 100).toFixed(1)}%)\n`);
  
  // Show top cafes by rating that need reviews
  const topRatedNeedingReviews = cafesWithoutReviews
    .filter(c => c.google_rating && c.google_rating >= 4.0)
    .sort((a, b) => (b.google_rating || 0) - (a.google_rating || 0))
    .slice(0, 20);
  
  console.log('⭐ Top-rated cafes without reviews (priority for fetching):');
  topRatedNeedingReviews.forEach((cafe, i) => {
    console.log(`   ${i + 1}. ${cafe.name} (${cafe.neighborhood}) - ${cafe.google_rating}⭐`);
  });
  
  console.log(`\n💰 API Cost Estimate:`);
  console.log(`   • To fetch reviews for all cafes without reviews: ${cafesWithoutReviews.length} API calls`);
  console.log(`   • Cost at $0.017 per call: $${(cafesWithoutReviews.length * 0.017).toFixed(2)}`);
  console.log(`   • To fetch reviews for top 50 rated cafes: 50 API calls = $${(50 * 0.017).toFixed(2)}`);
  console.log(`   • To fetch reviews for cafes with <3 reviews: ${cafesWithFewReviews.length} API calls = $${(cafesWithFewReviews.length * 0.017).toFixed(2)}\n`);
  
  // Export list for batch processing
  console.log('💡 Recommendation:');
  console.log(`   Start with top ${Math.min(50, topRatedNeedingReviews.length)} rated cafes without reviews`);
  console.log(`   Then fetch for cafes with <3 reviews`);
  console.log(`   Total estimated cost: $${((Math.min(50, topRatedNeedingReviews.length) + cafesWithFewReviews.length) * 0.017).toFixed(2)}\n`);
}

(async () => {
  try {
    await checkCafesNeedingReviews();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
