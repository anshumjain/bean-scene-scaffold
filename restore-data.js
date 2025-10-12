const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('🔍 Checking current data...');
  
  // Check cafes
  const { data: cafes, error: cafeError } = await supabase
    .from('cafes')
    .select('id, name, address')
    .limit(5);
    
  if (cafeError) {
    console.error('❌ Error checking cafes:', cafeError);
  } else {
    console.log(`📊 Cafes found: ${cafes?.length || 0}`);
    if (cafes && cafes.length > 0) {
      console.log('Sample cafes:', cafes.map(c => c.name));
    }
  }
  
  // Check posts
  const { data: posts, error: postError } = await supabase
    .from('posts')
    .select('id, text_review, created_at')
    .limit(5);
    
  if (postError) {
    console.error('❌ Error checking posts:', postError);
  } else {
    console.log(`📊 Posts found: ${posts?.length || 0}`);
  }
  
  // Check users
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, name, email')
    .limit(5);
    
  if (userError) {
    console.error('❌ Error checking users:', userError);
  } else {
    console.log(`📊 Users found: ${users?.length || 0}`);
  }
}

checkData().then(() => {
  console.log('✅ Data check complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
