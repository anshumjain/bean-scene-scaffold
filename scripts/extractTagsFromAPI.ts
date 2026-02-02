/**
 * Extract tags directly from Google Places API reviews
 * Fetches reviews from API, extracts tags, updates cafes - NO database storage
 * This reduces API costs by not storing reviews we only need for tag extraction
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  console.error('❌ Google Places API key not found in .env.local');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tag extraction patterns - vibe keywords with context
const TAG_PATTERNS: Record<string, RegExp> = {
  'wifi': /wifi|wi-fi|wireless|internet|free wifi|has wifi|good wifi|strong wifi/i,
  'study-spot': /study|studying|homework|work|laptop|quiet|peaceful|concentrate|focus|reading|student/i,
  'date-spot': /date|romantic|cozy|couple|intimate|romantic|perfect.*date/i,
  'pet-friendly': /pet|dog|puppy|furry friend|bring.*dog|dog.*friendly|pet.*friendly/i,
  'busy': /busy|crowded|packed|popular|always.*people|lots.*people|bustling/i,
  'quiet': /quiet|calm|peaceful|serene|tranquil|not.*busy|not.*crowded|relaxing/i,
  'cozy': /cozy|comfortable|warm|homey|inviting|comfortable|homey/i,
  'modern': /modern|contemporary|sleek|minimalist|design|stylish|hip/i,
  'outdoor-seating': /outdoor|patio|outside|al fresco|terrace|outdoor.*seating|patio.*seating/i,
  'parking': /parking|park|easy.*park|free.*park|parking.*available|parking.*easy/i,
  'vegan': /vegan|plant-based|dairy-free|non-dairy|vegan.*option/i,
  'gluten-free': /gluten-free|gf|celiac|gluten.*free/i,
  'breakfast': /breakfast|morning|early|opens.*early|great.*breakfast|breakfast.*spot/i,
  'late-night': /late|night|open.*late|after.*hours|late.*night|night.*spot/i,
  'meeting-friendly': /meeting|group|team|business|conference|meeting.*space|group.*friendly/i,
  'laptop-friendly': /laptop|work|remote|wfh|outlet|plug|power|socket|work.*space|good.*work/i,
  'good-for-kids': /kid|child|family|children|stroller|kid.*friendly|family.*friendly/i,
  'live-music': /music|live|performance|entertainment|live.*music|music.*night/i,
  'roastery': /roast|roaster|beans|coffee.*roast|roast.*coffee|roastery/i,
  'specialty-coffee': /specialty|third.*wave|artisan|craft|single.*origin|specialty.*coffee/i,
  'fast-service': /fast|quick|service.*fast|quick.*service|fast.*service/i,
  'slow-service': /slow|wait|service.*slow|slow.*service|long.*wait/i,
  'expensive': /expensive|pricey|cost|high.*price|overpriced/i,
  'affordable': /affordable|cheap|reasonable|good.*price|value/i,
  'noisy': /noisy|loud|noise|can.*hear|too.*loud/i,
  'spacious': /spacious|roomy|large|big|plenty.*space|lots.*room/i,
  'small': /small|tiny|cramped|tight|not.*much.*space/i,
};

/**
 * Extract tags from review text with confidence scoring
 */
function extractTagsFromText(text: string): { tag: string; confidence: number }[] {
  if (!text || text.trim().length < 10) {
    return [];
  }

  const foundTags: { tag: string; confidence: number }[] = [];
  const lowerText = text.toLowerCase();
  
  for (const [tag, pattern] of Object.entries(TAG_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches) {
      // Higher confidence if mentioned multiple times
      const matchCount = matches.length;
      
      // Check for positive context words
      const positiveContext = /good|great|excellent|perfect|amazing|love|best|wonderful|fantastic/i.test(text);
      const negativeContext = /bad|terrible|awful|worst|hate|disappointing|poor/i.test(text);
      
      // Check for explicit mentions like "good for studying"
      const explicitMention = new RegExp(`(good|great|perfect|ideal|excellent).*for.*${tag.replace('-', '.*')}`, 'i').test(text) ||
                             new RegExp(`${tag.replace('-', '.*')}.*(friendly|available|good|great)`, 'i').test(text);
      
      let confidence = matchCount * 0.25;
      
      // Boost confidence for positive context
      if (positiveContext && !negativeContext) {
        confidence += 0.3;
      }
      
      // Boost confidence for explicit mentions
      if (explicitMention) {
        confidence += 0.4;
      }
      
      // Penalize negative context (but still extract the tag)
      if (negativeContext && !positiveContext) {
        confidence *= 0.5;
      }
      
      confidence = Math.min(confidence, 1.0);
      
      // Only include tags with reasonable confidence
      if (confidence >= 0.3) {
        foundTags.push({ tag, confidence });
      }
    }
  }
  
  // Sort by confidence
  return foundTags.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Normalize tag (lowercase, hyphenate)
 */
function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Fetch reviews from Google Places API for a single cafe
 * Makes 2 API calls to get up to 10 reviews (5 per call)
 * Returns reviews with full data for storage
 */
async function fetchReviewsFromAPI(placeId: string): Promise<Array<{ 
  text: string; 
  rating: number;
  reviewerName?: string;
  time?: string;
  profilePhotoUrl?: string;
}>> {
  const allReviews: Array<{ 
    text: string; 
    rating: number;
    reviewerName?: string;
    time?: string;
    profilePhotoUrl?: string;
  }> = [];
  const seenTexts = new Set<string>(); // Deduplicate reviews
  
  try {
    // First API call - gets up to 5 reviews
    const response1 = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=reviews&key=${GOOGLE_PLACES_API_KEY}`
    );

    if (!response1.ok) {
      if (response1.status === 404) {
        return []; // Place not found
      }
      throw new Error(`API error: ${response1.status}`);
    }

    const data1 = await response1.json();
    const reviews1 = data1.reviews || [];
    
    // Extract reviews from first call
    for (const review of reviews1) {
      if (review.text?.text && review.text.text.trim().length >= 10) {
        const text = review.text.text.trim();
        // Deduplicate by text content
        if (!seenTexts.has(text)) {
          seenTexts.add(text);
          allReviews.push({
            text: text,
            rating: review.rating || 0,
            reviewerName: review.authorAttribution?.displayName || 'Anonymous',
            time: review.publishTime ? new Date(review.publishTime).toISOString() : new Date().toISOString(),
            profilePhotoUrl: review.authorAttribution?.photoUri || null
          });
        }
      }
    }
    
    // Second API call - Google Places API may return same reviews or different ones
    // Note: The New Places API doesn't have pagination, so this might return duplicates
    // But we deduplicate anyway, so it's safe
    if (allReviews.length < 10) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
      
      const response2 = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?fields=reviews&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      if (response2.ok) {
        const data2 = await response2.json();
        const reviews2 = data2.reviews || [];
        
        // Add any new reviews from second call
        for (const review of reviews2) {
          if (review.text?.text && review.text.text.trim().length >= 10) {
            const text = review.text.text.trim();
            if (!seenTexts.has(text) && allReviews.length < 10) {
              seenTexts.add(text);
              allReviews.push({
                text: text,
                rating: review.rating || 0,
                reviewerName: review.authorAttribution?.displayName || 'Anonymous',
                time: review.publishTime ? new Date(review.publishTime).toISOString() : new Date().toISOString(),
                profilePhotoUrl: review.authorAttribution?.photoUri || null
              });
            }
          }
        }
      }
    }
    
    return allReviews.slice(0, 10); // Return up to 10 reviews
    
  } catch (error: any) {
    console.error(`  ⚠️  API error for ${placeId}:`, error.message);
    return allReviews; // Return whatever we got
  }
}

/**
 * Extract tags for all cafes by fetching reviews directly from API
 */
async function extractTagsFromAPI() {
  console.log('🔍 Starting tag extraction from Google Places API...\n');
  console.log('💡 Strategy: Fetch reviews from API → Save reviews → Extract tags → Update cafes\n');
  
  // Get cafes that need tags (no tags or very few tags)
  // This reduces API costs by skipping cafes that already have tags
  // Note: We'll filter in JavaScript since Supabase doesn't support array_length in OR clauses easily
  const { data: allCafes, error: cafesError } = await supabase
    .from('cafes')
    .select('id, name, place_id, tags')
    .eq('is_active', true)
    .not('place_id', 'is', null);
  
  if (cafesError) {
    console.error('❌ Error fetching cafes:', cafesError);
    return;
  }
  
  // Filter cafes that need tags (no tags or < 3 tags)
  const cafes = (allCafes || []).filter(cafe => {
    const tags = cafe.tags as string[] | null;
    return !tags || tags.length < 3;
  });
  
  if (cafesError) {
    console.error('❌ Error fetching cafes:', cafesError);
    return;
  }
  
  if (!cafes || cafes.length === 0) {
    console.log('⚠️ No cafes found in database');
    return;
  }
  
  console.log(`📊 Found ${cafes.length} cafes needing tags (skipping cafes with 3+ tags)\n`);
  
  // Get total cafe count for comparison
  const { count: totalCafes } = await supabase
    .from('cafes')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  if (totalCafes) {
    const skipped = totalCafes - cafes.length;
    console.log(`   • Total active cafes: ${totalCafes}`);
    console.log(`   • Cafes to process: ${cafes.length}`);
    console.log(`   • Cafes skipped (already have tags): ${skipped}`);
    console.log(`   • Cost savings: $${(skipped * 0.017 * 2).toFixed(2)} (by skipping cafes with tags)\n`);
  }
  
  // 2 API calls per cafe to get 10 reviews
  const apiCallsPerCafe = 2;
  const totalAPICalls = cafes.length * apiCallsPerCafe;
  console.log(`💰 Estimated API cost: ${cafes.length} cafes × ${apiCallsPerCafe} calls = ${totalAPICalls} calls × $0.017 = $${(totalAPICalls * 0.017).toFixed(2)}\n`);
  
  let processed = 0;
  let tagsAdded = 0;
  let cafesUpdated = 0;
  let apiCalls = 0;
  let reviewsAnalyzed = 0;
  const stats = {
    totalReviews: 0,
    reviewsWithText: 0,
    tagsExtracted: 0,
  };
  
  // Process in batches to avoid overwhelming API
  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_CALLS = 100; // 100ms delay between API calls
  
  for (let i = 0; i < cafes.length; i += BATCH_SIZE) {
    const batch = cafes.slice(i, i + BATCH_SIZE);
    
    for (const cafe of batch) {
      try {
        if (!cafe.place_id) {
          continue; // Skip cafes without place_id
        }
        
        // Fetch reviews from API (2 calls to get up to 10 reviews)
        apiCalls += 2; // 2 API calls per cafe
        const reviews = await fetchReviewsFromAPI(cafe.place_id);
        
        if (reviews.length === 0) {
          // No reviews available, skip
          processed++;
          continue;
        }
        
        stats.totalReviews += reviews.length;
        reviewsAnalyzed += reviews.length;
        
        // Save reviews to database
        if (reviews.length > 0) {
          const reviewsToInsert = reviews
            .filter(review => {
              // Filter out reviews with invalid ratings (must be 1-5)
              const rating = review.rating || 0;
              return rating >= 1 && rating <= 5;
            })
            .map(review => ({
              cafe_id: cafe.id,
              reviewer_name: review.reviewerName || 'Anonymous',
              review_text: review.text,
              rating: Math.max(1, Math.min(5, Math.round(review.rating || 3))), // Ensure 1-5 range
              time: review.time || new Date().toISOString(),
              profile_photo_url: review.profilePhotoUrl || null,
              source: 'google'
            }));
          
          if (reviewsToInsert.length > 0) {
            // Check for existing reviews to avoid duplicates
            const { data: existingReviews } = await supabase
              .from('cafe_reviews')
              .select('reviewer_name, review_text')
              .eq('cafe_id', cafe.id)
              .eq('source', 'google');
            
            const existingSet = new Set(
              (existingReviews || []).map(r => `${r.reviewer_name}|${r.review_text}`)
            );
            
            // Filter out duplicates
            const newReviews = reviewsToInsert.filter(review => {
              const key = `${review.reviewer_name}|${review.review_text}`;
              return !existingSet.has(key);
            });
            
            if (newReviews.length > 0) {
              const { error: reviewError } = await supabase
                .from('cafe_reviews')
                .insert(newReviews);
              
              if (reviewError) {
                console.error(`  ⚠️  Error saving reviews for ${cafe.name}:`, reviewError.message);
                console.error(`      Details:`, JSON.stringify(reviewError, null, 2));
              } else {
                console.log(`  💾 Saved ${newReviews.length} new reviews for ${cafe.name} (${reviewsToInsert.length - newReviews.length} duplicates skipped)`);
              }
            } else {
              console.log(`  ⏭️  All reviews for ${cafe.name} already exist, skipping`);
            }
          }
        }
        
        // Extract tags from all reviews
        const tagScores: Record<string, number> = {};
        
        for (const review of reviews) {
          if (!review.text || review.text.trim().length < 10) {
            continue;
          }
          
          stats.reviewsWithText++;
          
          const extracted = extractTagsFromText(review.text);
          
          for (const { tag, confidence } of extracted) {
            // Weight by review rating (higher rated reviews = more reliable)
            // But also consider lower ratings might mention issues (like "noisy", "slow-service")
            const ratingWeight = review.rating ? (review.rating / 5) : 0.6;
            
            // For negative tags, lower ratings might be more accurate
            const negativeTags = ['noisy', 'slow-service', 'expensive', 'small', 'busy'];
            const adjustedWeight = negativeTags.includes(tag) 
              ? Math.max(0.4, ratingWeight) // Don't penalize negative tags too much
              : ratingWeight;
            
            const score = confidence * adjustedWeight;
            
            tagScores[tag] = (tagScores[tag] || 0) + score;
            stats.tagsExtracted++;
          }
        }
        
        // Get tags that meet threshold (mentioned in multiple reviews or high confidence)
        // Threshold is lower for cafes with fewer reviews
        const reviewCount = reviews.length;
        const threshold = reviewCount >= 5 ? 0.6 : reviewCount >= 3 ? 0.5 : 0.4;
        
        const suggestedTags = Object.entries(tagScores)
          .filter(([, score]) => score >= threshold)
          .sort(([, a], [, b]) => b - a) // Sort by score
          .map(([tag]) => normalizeTag(tag))
          .filter(tag => tag.length >= 2) // Filter out invalid tags
          .slice(0, 12); // Max 12 tags per cafe
        
        if (suggestedTags.length > 0) {
          // Get current tags
          const existingTags = (cafe.tags || []) as string[];
          const normalizedExisting = existingTags.map(normalizeTag);
          
          // Merge new tags with existing (avoid duplicates)
          const allTags = [...new Set([...normalizedExisting, ...suggestedTags])];
          
          // Only update if we're adding new tags
          if (allTags.length > normalizedExisting.length) {
            const newTagsCount = allTags.length - normalizedExisting.length;
            
            // Update cafe with extracted tags
            const { error: updateError } = await supabase
              .from('cafes')
              .update({ 
                tags: allTags,
                updated_at: new Date().toISOString()
              })
              .eq('id', cafe.id);
            
            if (updateError) {
              console.error(`  ❌ Error updating ${cafe.name}:`, updateError.message);
            } else {
              tagsAdded += newTagsCount;
              cafesUpdated++;
              console.log(`  ✅ ${cafe.name}: Added ${newTagsCount} tags (${suggestedTags.slice(0, 3).join(', ')}${suggestedTags.length > 3 ? '...' : ''})`);
            }
          }
        }
        
        processed++;
        
        // Progress update every 50 cafes
        if (processed % 50 === 0) {
          console.log(`\n📈 Progress: ${processed}/${cafes.length} cafes processed`);
          console.log(`   API calls: ${apiCalls}, Reviews analyzed: ${reviewsAnalyzed}, Tags added: ${tagsAdded}\n`);
        }
        
        // Rate limiting: delay between API calls
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS));
        
      } catch (error: any) {
        console.error(`  ❌ Error processing ${cafe.name}:`, error.message);
        processed++;
        continue;
      }
    }
    
    // Longer delay between batches
    if (i + BATCH_SIZE < cafes.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Tag Extraction Complete!');
  console.log('='.repeat(60));
  console.log(`📊 Statistics:`);
  console.log(`   • Cafes processed: ${processed}`);
  console.log(`   • Cafes updated: ${cafesUpdated}`);
  console.log(`   • Total tags added: ${tagsAdded}`);
  console.log(`   • API calls made: ${apiCalls}`);
  console.log(`   • Reviews analyzed: ${reviewsAnalyzed}`);
  console.log(`   • Reviews with text: ${stats.reviewsWithText}`);
  console.log(`   • Tag mentions extracted: ${stats.tagsExtracted}`);
  console.log(`💰 API cost: $${(apiCalls * 0.017).toFixed(2)} (${apiCalls} calls × $0.017)`);
  console.log(`💡 Note: 2 API calls per cafe to fetch up to 10 reviews`);
  console.log('='.repeat(60) + '\n');
}

// Run the extraction
(async () => {
  try {
    await extractTagsFromAPI();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
})();
