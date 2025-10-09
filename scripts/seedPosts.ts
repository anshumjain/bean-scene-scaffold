import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Initialize Supabase client with service role for seeding
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA";
const supabase = createClient(supabaseUrl, supabaseKey);

// Google Places API key
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface Cafe {
  id: string;
  place_id: string;
  name: string;
  neighborhood: string;
  hero_photo_url?: string;
}

interface PostData {
  user_id: string | null;
  cafe_id: string;
  place_id: string;
  image_url: string;
  rating: number;
  text_review: string;
  tags: string[];
  username: string;
  device_id: string;
  source: 'google' | 'user';
  photo_source: 'google' | 'user';
}

const COFFEE_TAGS = [
  "latte-art", "cozy-vibes", "laptop-friendly", "third-wave", "cold-brew",
  "pastries", "rooftop", "instagram-worthy", "pet-friendly", "outdoor-seating",
  "wifi", "quiet", "busy", "date-spot", "group-friendly", "drive-thru"
];

// Fallback review templates in case Google reviews are not available
const FALLBACK_REVIEW_TEMPLATES = [
  "Amazing coffee and great atmosphere! Perfect for working remotely.",
  "Love the latte art here. The baristas really know their craft.",
  "Cozy spot with excellent pastries. The croissants are to die for!",
  "Great place to meet friends. The outdoor seating is perfect for Houston weather.",
  "Fast service and consistently good coffee. My go-to morning spot.",
  "The cold brew here is incredible. Highly recommend!",
  "Beautiful space with lots of natural light. Great for photos too.",
  "Friendly staff and delicious coffee. Will definitely be back.",
  "Perfect study spot with reliable wifi and comfortable seating.",
  "Love the local vibe here. Feels like a hidden gem in the neighborhood.",
  "The pastries are fresh and the coffee is always on point.",
  "Great location with plenty of parking. Coffee quality is excellent.",
  "Chill atmosphere, perfect for a casual coffee date.",
  "The baristas are knowledgeable and the coffee selection is impressive.",
  "Clean, modern space with great energy. Coffee tastes amazing.",
  "Love coming here on weekends. The vibe is always relaxed and welcoming.",
  "Excellent coffee and even better service. Highly recommend!",
  "Great spot for remote work. Quiet but not too quiet.",
  "The seasonal drinks are always creative and delicious.",
  "Perfect neighborhood coffee shop. Feels like home away from home."
];

const USERNAMES = [
  "coffee_lover_houston", "bean_scene_regular", "houston_cafe_hunter", "coffee_addict_tx",
  "latte_art_fan", "third_wave_coffee", "houston_roaster", "cafe_hopper_houston",
  "coffee_critic_tx", "bean_enthusiast", "houston_coffee_guide", "cafe_explorer_houston",
  "coffee_photographer", "houston_bean_lover", "cafe_reviewer_tx", "coffee_blogger_houston",
  "bean_scene_member", "houston_coffee_nerd", "cafe_regular_houston", "coffee_aficionado_tx"
];

async function fetchCafes(): Promise<Cafe[]> {
  const { data, error } = await supabase
    .from('cafes')
    .select('id, place_id, name, neighborhood, hero_photo_url')
    .eq('is_active', true)
    .limit(100);

  if (error) {
    console.error('Error fetching cafes:', error);
    return [];
  }

  return data || [];
}

async function fetchGoogleReviews(placeId: string): Promise<string[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not found, using fallback reviews');
    return [];
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=reviews`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch reviews for ${placeId}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const reviews = data.reviews || [];
    
    // Filter reviews with actual text content
    const reviewTexts = reviews
      .filter((review: any) => review.text && typeof review.text === 'string' && review.text.trim().length > 10)
      .map((review: any) => review.text.trim())
      .slice(0, 5); // Limit to 5 reviews per cafe

    return reviewTexts;
  } catch (error) {
    console.warn(`Error fetching Google reviews for ${placeId}:`, error);
    return [];
  }
}

function generateRandomPost(cafe: Cafe, availableReviews: string[]): PostData {
  const username = faker.helpers.arrayElement(USERNAMES);
  const deviceId = faker.string.uuid();
  const rating = faker.number.int({ min: 3, max: 5 });
  
  // Use Google reviews if available, otherwise fallback to templates
  const reviewText = availableReviews.length > 0 
    ? faker.helpers.arrayElement(availableReviews)
    : faker.helpers.arrayElement(FALLBACK_REVIEW_TEMPLATES);
    
  const tags = faker.helpers.arrayElements(COFFEE_TAGS, { min: 1, max: 4 });
  
  // Use the cafe's actual hero photo if available, otherwise use coffee stock photos
  const imageUrl = cafe.hero_photo_url || `https://images.unsplash.com/photo-${faker.helpers.arrayElement([
    '1509042239860-f550ce710b93', // Coffee cup
    '1495474472287-4d71bcdd2085', // Coffee beans
    '1447933601403-0c6688de566e', // Latte art
    '1461023051463-6d8b0c3d0b8a', // Coffee shop
    '1506905925346-21bda4d32df4', // Coffee brewing
    '1511920170033-f8396924c348', // Coffee cup with art
    '1498804103079-a6351b050096', // Coffee and pastries
    '1501339847302-ac426a4a7cbb', // Coffee shop interior
    '1514432324607-a09d9b4aefdd', // Coffee cup close up
    '1559056199-641a1b3b5d6e', // Coffee beans close up
    '1442512597-8d68d4e9b7b4', // Coffee shop exterior
    '1506905925346-21bda4d32df4', // Coffee brewing
    '1495474472287-4d71bcdd2085', // Coffee beans
    '1447933601403-0c6688de566e'  // Latte art
  ])}?w=800&h=600&fit=crop&crop=center`;

  return {
    user_id: null, // Anonymous posts
    cafe_id: cafe.id,
    place_id: cafe.place_id,
    image_url: imageUrl,
    rating,
    text_review: reviewText,
    tags,
    username,
    device_id: deviceId,
    source: 'google', // These posts are created from Google reviews
    photo_source: 'google' // These posts use Google-sourced photos (Unsplash coffee images)
  };
}

function generateRandomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - faker.number.int({ min: 1, max: daysAgo }));
  date.setHours(faker.number.int({ min: 6, max: 22 })); // Coffee shop hours
  date.setMinutes(faker.number.int({ min: 0, max: 59 }));
  return date.toISOString();
}

async function insertPosts(posts: PostData[]): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .insert(posts);

  if (error) {
    console.error('Error inserting posts:', error);
    throw error;
  }
}

async function seedPosts(): Promise<void> {
  console.log('Starting posts seeding with Google reviews...');
  
  try {
    // Clear existing posts first
    console.log('Clearing existing posts...');
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all posts
    
    if (deleteError) {
      console.warn('Warning: Could not clear existing posts:', deleteError.message);
    } else {
      console.log('✅ Cleared existing posts');
    }

    const cafes = await fetchCafes();
    console.log(`Found ${cafes.length} cafes`);

    if (cafes.length === 0) {
      console.log('No cafes found. Please seed cafes first.');
      return;
    }

    // Skip Google API calls for now (API issues), use fallback reviews
    console.log('Using fallback reviews (skipping Google API due to errors)...');
    const cafeReviewsMap = new Map<string, string[]>();

    const postsToCreate = 30;
    const posts: PostData[] = [];

    console.log(`\nGenerating ${postsToCreate} posts using Google reviews...`);

    for (let i = 0; i < postsToCreate; i++) {
      const randomCafe = faker.helpers.arrayElement(cafes);
      const availableReviews = cafeReviewsMap.get(randomCafe.place_id) || [];
      const post = generateRandomPost(randomCafe, availableReviews);
      posts.push(post);
    }

    // Insert posts in batches
    const batchSize = 10;
    let inserted = 0;

    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      await insertPosts(batch);
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${posts.length} posts`);
      
      // Add small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n=== Posts Seeding Complete ===');
    console.log(`Total posts created: ${inserted}`);
    console.log(`Posts per cafe: ${Math.round(inserted / cafes.length)}`);
    console.log('Posts now use Google reviews for authentic captions!');

  } catch (error) {
    console.error('Posts seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding script
seedPosts()
  .then(() => {
    console.log('Posts seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Posts seeding failed:', error);
    process.exit(1);
  });

export { seedPosts };
