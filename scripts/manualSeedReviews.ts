import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://hhdcequsdmosxzjebdyj.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA'
);

async function manualSeedReviews() {
  console.log('🌱 Manual seeding of reviews and visits...\n');
  
  try {
    // Get all cafe_reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('cafe_reviews')
      .select('*');
      
    if (reviewsError) {
      console.error('❌ Error fetching cafe_reviews:', reviewsError);
      return;
    }
    
    console.log(`📊 Found ${reviews?.length || 0} cafe_reviews`);
    
    // Get all cafe_visits
    const { data: visits, error: visitsError } = await supabase
      .from('cafe_visits')
      .select('*');
      
    if (visitsError) {
      console.error('❌ Error fetching cafe_visits:', visitsError);
      return;
    }
    
    console.log(`📊 Found ${visits?.length || 0} cafe_visits\n`);
    
    // Get cafes to map cafe_id to place_id
    const { data: cafes, error: cafesError } = await supabase
      .from('cafes')
      .select('id, place_id, name');
      
    if (cafesError) {
      console.error('❌ Error fetching cafes:', cafesError);
      return;
    }
    
    const cafeMap = new Map(cafes?.map(cafe => [cafe.id, cafe]) || []);
    console.log(`📊 Loaded ${cafes?.length || 0} cafes for mapping\n`);
    
    let convertedCount = 0;
    
    // Convert cafe_reviews to posts
    if (reviews && reviews.length > 0) {
      console.log('🔄 Converting cafe_reviews to posts...');
      
      for (const review of reviews) {
        const cafe = cafeMap.get(review.cafe_id);
        if (!cafe) {
          console.log(`⚠️ Skipping review ${review.id} - cafe not found`);
          continue;
        }
        
        // Check if this review already has a corresponding post
        const { data: existingPost } = await supabase
          .from('posts')
          .select('id')
          .eq('username', review.reviewer_name)
          .eq('place_id', cafe.place_id)
          .eq('text_review', review.review_text)
          .limit(1);
          
        if (existingPost && existingPost.length > 0) {
          console.log(`⏭️ Skipping review ${review.id} - post already exists`);
          continue;
        }
        
        // Create post from review
        const postData = {
          place_id: cafe.place_id,
          username: review.reviewer_name,
          image_url: review.profile_photo_url || 'https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Coffee+Review',
          text_review: review.review_text,
          rating: review.rating,
          tags: [], // Can be enhanced later
          source: 'user', // These are user reviews, not Google
          photo_source: 'user',
          likes: 0,
          comments: 0
        };
        
        const { data: newPost, error: postError } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();
          
        if (postError) {
          console.error(`❌ Error creating post for review ${review.id}:`, postError);
        } else {
          console.log(`✅ Created post ${newPost.id} from review by ${review.reviewer_name}`);
          convertedCount++;
        }
      }
    }
    
    // Convert cafe_visits to posts (for visits without reviews)
    if (visits && visits.length > 0) {
      console.log('\n🔄 Converting cafe_visits to posts...');
      
      for (const visit of visits) {
        const cafe = cafeMap.get(visit.cafe_id);
        if (!cafe) {
          console.log(`⚠️ Skipping visit ${visit.id} - cafe not found`);
          continue;
        }
        
        // Check if this visit already has a corresponding post
        const { data: existingPost } = await supabase
          .from('posts')
          .select('id')
          .eq('username', visit.username)
          .eq('place_id', cafe.place_id)
          .limit(1);
          
        if (existingPost && existingPost.length > 0) {
          console.log(`⏭️ Skipping visit ${visit.id} - post already exists`);
          continue;
        }
        
        // Create post from visit
        const postData = {
          place_id: cafe.place_id,
          username: visit.username,
          image_url: 'https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Cafe+Visit',
          text_review: `Visited ${cafe.name} - great coffee spot!`,
          rating: 4, // Default rating for visits
          tags: ['visit', 'great-coffee'],
          source: 'user',
          photo_source: 'user',
          likes: 0,
          comments: 0
        };
        
        const { data: newPost, error: postError } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();
          
        if (postError) {
          console.error(`❌ Error creating post for visit ${visit.id}:`, postError);
        } else {
          console.log(`✅ Created post ${newPost.id} from visit by ${visit.username}`);
          convertedCount++;
        }
      }
    }
    
    console.log(`\n🎉 Conversion complete! Created ${convertedCount} new posts`);
    
    // Show updated post counts
    const { data: updatedPosts, error: postsError } = await supabase
      .from('posts')
      .select('username')
      .not('username', 'is', null);
      
    if (!postsError && updatedPosts) {
      const usernameCounts = updatedPosts.reduce((acc, post) => {
        acc[post.username] = (acc[post.username] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\n📊 Updated post counts by username:');
      Object.entries(usernameCounts).forEach(([username, count]) => {
        console.log(`  ${username}: ${count} posts`);
      });
    }
    
  } catch (err) {
    console.error('💥 Error:', err);
  }
}

// Function to manually add a review
async function addManualReview(cafeName: string, reviewerName: string, reviewText: string, rating: number) {
  console.log(`\n➕ Adding manual review for ${cafeName}...`);
  
  try {
    // Find cafe by name
    const { data: cafes, error: cafeError } = await supabase
      .from('cafes')
      .select('id, place_id, name')
      .ilike('name', `%${cafeName}%`)
      .limit(1);
      
    if (cafeError || !cafes || cafes.length === 0) {
      console.error(`❌ Cafe "${cafeName}" not found`);
      return;
    }
    
    const cafe = cafes[0];
    console.log(`📍 Found cafe: ${cafe.name} (${cafe.place_id})`);
    
    // Add to cafe_reviews table
    const reviewData = {
      cafe_id: cafe.id,
      reviewer_name: reviewerName,
      review_text: reviewText,
      rating: rating,
      time: new Date().toISOString(),
      source: 'user'
    };
    
    const { data: newReview, error: reviewError } = await supabase
      .from('cafe_reviews')
      .insert(reviewData)
      .select()
      .single();
      
    if (reviewError) {
      console.error('❌ Error creating review:', reviewError);
      return;
    }
    
    console.log(`✅ Created review ${newReview.id}`);
    
    // Also create a post for the feed
    const postData = {
      place_id: cafe.place_id,
      username: reviewerName,
      image_url: 'https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Coffee+Review',
      text_review: reviewText,
      rating: rating,
      tags: ['review', 'great-coffee'],
      source: 'user',
      photo_source: 'user',
      likes: 0,
      comments: 0
    };
    
    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();
      
    if (postError) {
      console.error('❌ Error creating post:', postError);
    } else {
      console.log(`✅ Created post ${newPost.id} for feed`);
    }
    
  } catch (err) {
    console.error('💥 Error:', err);
  }
}

// Run the conversion
(async () => {
  await manualSeedReviews();
  
  // Example: Add a manual review
  // await addManualReview('The Alley', 'heights_regular', 'Amazing coffee and atmosphere!', 5);
})();



