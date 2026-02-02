import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://hhdcequsdmosxzjebdyj.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA'
);

async function fixPostSourceAttribution() {
  console.log('🔧 Fixing post source attribution...\n');
  
  try {
    // Get all posts
    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select('*');
      
    if (fetchError) {
      console.error('❌ Error fetching posts:', fetchError);
      return;
    }
    
    console.log(`📊 Found ${posts?.length || 0} posts to check\n`);
    
    if (!posts || posts.length === 0) {
      console.log('No posts found to fix.');
      return;
    }
    
    let updatedCount = 0;
    
    for (const post of posts) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Fix source field - should be 'user' for user-created posts
      if (!post.source || post.source === 'google') {
        // Check if this is actually a user post (has username, not from Google Places API)
        if (post.username && post.username !== 'Anonymous' && !post.username.includes('Google')) {
          updates.source = 'user';
          needsUpdate = true;
          console.log(`📝 Post ${post.id}: Setting source to 'user' (username: ${post.username})`);
        }
      }
      
      // Fix photo_source field - should be 'user' for user-uploaded photos
      if (!post.photo_source || post.photo_source === 'google') {
        // Check if this is a user-uploaded photo
        if (post.image_url && !post.image_url.includes('bean-scene/google-places') && !post.image_url.includes('googleapis.com')) {
          updates.photo_source = 'user';
          needsUpdate = true;
          console.log(`📸 Post ${post.id}: Setting photo_source to 'user' (URL: ${post.image_url.substring(0, 50)}...)`);
        }
      }
      
      // Update the post if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('posts')
          .update(updates)
          .eq('id', post.id);
          
        if (updateError) {
          console.error(`❌ Error updating post ${post.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`✅ Updated post ${post.id}`);
        }
      }
    }
    
    console.log(`\n🎉 Fixed ${updatedCount} posts`);
    
    // Show final stats
    const { data: finalPosts, error: finalError } = await supabase
      .from('posts')
      .select('source, photo_source')
      .order('created_at', { ascending: false });
      
    if (!finalError && finalPosts) {
      const userSourcePosts = finalPosts.filter(p => p.source === 'user').length;
      const googleSourcePosts = finalPosts.filter(p => p.source === 'google').length;
      const userPhotoPosts = finalPosts.filter(p => p.photo_source === 'user').length;
      const googlePhotoPosts = finalPosts.filter(p => p.photo_source === 'google').length;
      
      console.log('\n📊 Final source attribution:');
      console.log(`Source - User: ${userSourcePosts}, Google: ${googleSourcePosts}`);
      console.log(`Photo Source - User: ${userPhotoPosts}, Google: ${googlePhotoPosts}`);
    }
    
  } catch (err) {
    console.error('💥 Error:', err);
  }
}

fixPostSourceAttribution();



