/**
 * Script to ensure all existing posts appear in the moments feed
 * This addresses any posts that might have been created before proper cafe association
 */

import { supabase } from '../src/integrations/supabase/client';

async function migratePostsToMoments() {
  console.log('🔄 Starting posts to moments migration...');
  
  try {
    // First, let's check how many posts we have
    const { count: totalPosts, error: countError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting posts:', countError);
      return;
    }
    
    console.log(`📊 Total posts in database: ${totalPosts}`);
    
    // Check posts with NULL cafe_id
    const { count: postsWithoutCafe, error: nullCafeError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .is('cafe_id', null);
    
    if (nullCafeError) {
      console.error('❌ Error counting posts without cafe:', nullCafeError);
      return;
    }
    
    console.log(`📊 Posts without cafe_id: ${postsWithoutCafe}`);
    
    // Check posts with NULL place_id
    const { count: postsWithoutPlace, error: nullPlaceError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .is('place_id', null);
    
    if (nullPlaceError) {
      console.error('❌ Error counting posts without place_id:', nullPlaceError);
      return;
    }
    
    console.log(`📊 Posts without place_id: ${postsWithoutPlace}`);
    
    // Get posts with NULL cafe_id but valid place_id
    const { data: postsToUpdate, error: fetchUpdateError } = await supabase
      .from('posts')
      .select('id, place_id')
      .is('cafe_id', null)
      .not('place_id', 'is', null);
    
    if (fetchUpdateError) {
      console.error('❌ Error fetching posts to update:', fetchUpdateError);
      return;
    }
    
    console.log(`🔄 Found ${postsToUpdate?.length || 0} posts to update with cafe associations`);
    
    // Update each post individually
    let updatedCount = 0;
    for (const post of postsToUpdate || []) {
      // Find the cafe by place_id
      const { data: cafe, error: cafeError } = await supabase
        .from('cafes')
        .select('id')
        .eq('place_id', post.place_id)
        .single();
      
      if (cafeError || !cafe) {
        console.log(`⚠️  No cafe found for place_id: ${post.place_id}`);
        continue;
      }
      
      // Update the post with the cafe_id
      const { error: updateError } = await supabase
        .from('posts')
        .update({ cafe_id: cafe.id })
        .eq('id', post.id);
      
      if (updateError) {
        console.error(`❌ Error updating post ${post.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
    
    console.log(`✅ Updated ${updatedCount} posts with cafe associations`);
    
    // Test the fetchPosts function to ensure all posts are returned
    console.log('🔄 Testing fetchPosts function...');
    const { data: allPosts, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        cafes (name, neighborhood, place_id, address)
      `)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ Error fetching posts:', fetchError);
      return;
    }
    
    console.log(`✅ Successfully fetched ${allPosts?.length || 0} posts for moments feed`);
    
    // Check if all posts have proper data
    const postsWithCafe = allPosts?.filter(post => post.cafes) || [];
    const postsWithoutCafeAfter = allPosts?.filter(post => !post.cafes) || [];
    
    console.log(`📊 Posts with cafe data: ${postsWithCafe.length}`);
    console.log(`📊 Posts without cafe data (quick posts): ${postsWithoutCafeAfter.length}`);
    
    console.log('✅ Migration completed successfully!');
    console.log('📝 All posts should now appear in the moments feed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
if (require.main === module) {
  migratePostsToMoments()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migratePostsToMoments };
