import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Cafe {
  id: string;
  place_id: string;
  name: string;
  neighborhood: string;
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
}

const COFFEE_TAGS = [
  "latte-art", "cozy-vibes", "laptop-friendly", "third-wave", "cold-brew",
  "pastries", "rooftop", "instagram-worthy", "pet-friendly", "outdoor-seating",
  "wifi", "quiet", "busy", "date-spot", "group-friendly", "drive-thru"
];

const REVIEW_TEMPLATES = [
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
    .select('id, place_id, name, neighborhood')
    .eq('is_active', true)
    .limit(100);

  if (error) {
    console.error('Error fetching cafes:', error);
    return [];
  }

  return data || [];
}

function generateRandomPost(cafe: Cafe): PostData {
  const username = faker.helpers.arrayElement(USERNAMES);
  const deviceId = faker.string.uuid();
  const rating = faker.number.int({ min: 3, max: 5 });
  const reviewText = faker.helpers.arrayElement(REVIEW_TEMPLATES);
  const tags = faker.helpers.arrayElements(COFFEE_TAGS, { min: 1, max: 4 });
  
  // Generate realistic image URL (using Unsplash coffee images)
  const imageUrl = `https://images.unsplash.com/photo-${faker.helpers.arrayElement([
    '1509042239860-f550ce710b93', // Coffee cup
    '1495474472287-4d71bcdd2085', // Coffee beans
    '1447933601403-0c6688de566e', // Latte art
    '1461023051463-6d8b0c3d0b8a', // Coffee shop
    '1506905925346-21bda4d32df4', // Coffee brewing
    '1511920170033-f8396924c348', // Coffee cup with art
    '1498804103079-a6351b050096', // Coffee and pastries
    '1501339847302-ac426a4a7cbb', // Coffee shop interior
    '1514432324607-a09d9b4aefdd', // Coffee cup close up
    '1506905925346-21bda4d32df4'  // Coffee brewing
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
    device_id: deviceId
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
  console.log('Starting posts seeding...');
  
  try {
    const cafes = await fetchCafes();
    console.log(`Found ${cafes.length} cafes`);

    if (cafes.length === 0) {
      console.log('No cafes found. Please seed cafes first.');
      return;
    }

    const postsToCreate = 50;
    const posts: PostData[] = [];

    console.log(`Generating ${postsToCreate} posts...`);

    for (let i = 0; i < postsToCreate; i++) {
      const randomCafe = faker.helpers.arrayElement(cafes);
      const post = generateRandomPost(randomCafe);
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

  } catch (error) {
    console.error('Posts seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding script
if (require.main === module) {
  seedPosts()
    .then(() => {
      console.log('Posts seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Posts seeding failed:', error);
      process.exit(1);
    });
}

export { seedPosts };
