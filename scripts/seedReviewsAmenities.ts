import { createClient } from '@supabase/supabase-js';
import { googlePlacesService } from '../src/services/googlePlacesService';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Cafe {
  id: string;
  place_id: string;
  name: string;
}

interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  profile_photo_url?: string;
}

interface GooglePlaceDetails {
  reviews?: GoogleReview[];
  opening_hours?: {
    weekday_text: string[];
  };
  website?: string;
  formatted_phone_number?: string;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
  }>;
}

async function fetchCafes(): Promise<Cafe[]> {
  const { data, error } = await supabase
    .from('cafes')
    .select('id, place_id, name')
    .eq('is_active', true)
    .limit(50); // Process 50 cafes per batch

  if (error) {
    console.error('Error fetching cafes:', error);
    return [];
  }

  return data || [];
}

async function checkExistingReviews(cafeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('cafe_reviews')
    .select('id')
    .eq('cafe_id', cafeId)
    .limit(1);

  if (error) {
    console.error('Error checking existing reviews:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

async function insertReviews(cafeId: string, reviews: GoogleReview[]): Promise<void> {
  const reviewData = reviews.map(review => ({
    cafe_id: cafeId,
    reviewer_name: review.author_name,
    rating: review.rating,
    review_text: review.text,
    profile_photo_url: review.profile_photo_url,
    time: new Date(review.time * 1000).toISOString()
  }));

  const { error } = await supabase
    .from('cafe_reviews')
    .insert(reviewData);

  if (error) {
    console.error('Error inserting reviews:', error);
    throw error;
  }
}

async function updateCafeDetails(cafeId: string, details: GooglePlaceDetails): Promise<void> {
  const updateData: any = {};

  if (details.opening_hours?.weekday_text) {
    updateData.opening_hours = details.opening_hours.weekday_text;
  }

  if (details.website) {
    updateData.website = details.website;
  }

  if (details.formatted_phone_number) {
    updateData.phone_number = details.formatted_phone_number;
  }

  if (details.price_level) {
    updateData.price_level = details.price_level;
  }

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('cafes')
      .update(updateData)
      .eq('id', cafeId);

    if (error) {
      console.error('Error updating cafe details:', error);
      throw error;
    }
  }
}

async function processCafe(cafe: Cafe): Promise<void> {
  try {
    console.log(`Processing cafe: ${cafe.name} (${cafe.place_id})`);

    // Check if reviews already exist
    const hasReviews = await checkExistingReviews(cafe.id);
    if (hasReviews) {
      console.log(`  Skipping ${cafe.name} - reviews already exist`);
      return;
    }

    // Fetch Google Places details
    const details = await googlePlacesService.getPlaceDetails(cafe.place_id);
    
    if (!details) {
      console.log(`  No details found for ${cafe.name}`);
      return;
    }

    // Insert reviews if available
    if (details.reviews && details.reviews.length > 0) {
      const topReviews = details.reviews
        .filter(review => review.text && review.text.length > 10)
        .slice(0, 5); // Top 5 reviews

      if (topReviews.length > 0) {
        await insertReviews(cafe.id, topReviews);
        console.log(`  Added ${topReviews.length} reviews for ${cafe.name}`);
      }
    }

    // Update cafe details
    await updateCafeDetails(cafe.id, details);
    console.log(`  Updated details for ${cafe.name}`);

    // Add delay to respect API rate limits
    await new Promise(resolve => setTimeout(resolve, 100));

  } catch (error) {
    console.error(`  Error processing ${cafe.name}:`, error);
  }
}

async function seedReviewsAndAmenities(): Promise<void> {
  console.log('Starting reviews and amenities seeding...');
  
  try {
    const cafes = await fetchCafes();
    console.log(`Found ${cafes.length} cafes to process`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const cafe of cafes) {
      try {
        await processCafe(cafe);
        succeeded++;
      } catch (error) {
        console.error(`Failed to process ${cafe.name}:`, error);
        failed++;
      }
      
      processed++;
      console.log(`Progress: ${processed}/${cafes.length} (${Math.round((processed / cafes.length) * 100)}%)`);
    }

    console.log('\n=== Seeding Complete ===');
    console.log(`Total processed: ${processed}`);
    console.log(`Succeeded: ${succeeded}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success rate: ${Math.round((succeeded / processed) * 100)}%`);

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding script
if (require.main === module) {
  seedReviewsAndAmenities()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedReviewsAndAmenities };
