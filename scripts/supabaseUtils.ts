import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Export clients for use in other scripts
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const supabaseAdmin = SUPABASE_SERVICE_KEY ? 
  createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null;

// Utility functions
export async function getCafeCount(): Promise<number> {
  const { count, error } = await supabase
    .from('cafes')
    .select('*', { count: 'exact', head: true });
  
  if (error) throw error;
  return count || 0;
}

export async function getUserCount(): Promise<number> {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  if (error) throw error;
  return count || 0;
}

export async function getPostCount(): Promise<number> {
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true });
  
  if (error) throw error;
  return count || 0;
}

export async function getAllCounts() {
  try {
    const [cafes, users, posts] = await Promise.all([
      getCafeCount(),
      getUserCount(),
      getPostCount()
    ]);
    
    return { cafes, users, posts };
  } catch (error) {
    console.error('Error getting counts:', error);
    throw error;
  }
}

export async function getSampleCafes(limit: number = 5) {
  const { data, error } = await supabase
    .from('cafes')
    .select('id, name, address, google_rating, latitude, longitude')
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

export async function getSamplePosts(limit: number = 5) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, content, created_at, user_id')
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

// Quick connection test
export async function quickTest() {
  console.log('🔗 Quick Supabase Test...');
  
  try {
    const counts = await getAllCounts();
    console.log(`📊 Database Stats:`);
    console.log(`   Cafes: ${counts.cafes}`);
    console.log(`   Users: ${counts.users}`);
    console.log(`   Posts: ${counts.posts}`);
    
    const sampleCafes = await getSampleCafes(3);
    if (sampleCafes.length > 0) {
      console.log(`\n☕ Sample Cafes:`);
      sampleCafes.forEach((cafe, i) => {
        console.log(`   ${i + 1}. ${cafe.name} (${cafe.google_rating || 'N/A'} ⭐)`);
      });
    }
    
    console.log('\n✅ Connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return false;
  }
}

// Run quick test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  quickTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}
