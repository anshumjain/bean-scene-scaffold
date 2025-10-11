import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Initialize Supabase client with service role
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA";
const supabase = createClient(supabaseUrl, supabaseKey);

// Houston local cafe names for tag updates
const SEEDED_CAFE_NAMES = [
  "Blacksmith", "Boomtown Coffee", "Catalina Coffee", "Double Trouble Caffeine & Cocktails",
  "Greenway Coffee Co", "Inversion Coffee House", "Katz Coffee", "Luce Ave Coffee",
  "Mercantile Coffee", "Minuti Coffee", "Morningstar Coffee", "Paper Co. Coffee",
  "Retrospect Coffee Bar", "Southside Espresso", "Tenfold Coffee", 
  "The Coffee House at West End", "Throughgood Coffee", "Tout Suite",
  "Two Guns Coffee", "Vibrant Coffee Roasters"
];

// Our popular tags that users can filter by
const POPULAR_TAGS = [
  "student-friendly", "wifi", "bakery", "vegan", "latte-art", 
  "great-coffee", "always-space", "wfh-friendly", "quiet", "group-friendly",
  "instagram-worthy", "coffee-lover", "laptop-friendly", "cold-brew", 
  "artisanal", "cozy-vibes", "date-spot", "pet-friendly", "outdoor-seating", "study-spot"
];

// Assign realistic tags to each cafe based on their characteristics
function assignTagsToCafe(cafeName: string, neighborhood: string): string[] {
  const tags: string[] = [];
  
  // All cafes get these basic tags
  tags.push("great-coffee");
  tags.push("wifi");
  
  // Assign tags based on cafe name and characteristics
  const name = cafeName.toLowerCase();
  const hood = neighborhood.toLowerCase();
  
  // Based on cafe names and neighborhoods
  if (name.includes("blacksmith") || name.includes("boomtown") || name.includes("catalina")) {
    tags.push("artisanal", "cozy-vibes");
  }
  
  if (name.includes("double trouble") || name.includes("retrospect") || name.includes("throughgood")) {
    tags.push("date-spot", "instagram-worthy");
  }
  
  if (name.includes("inversion") || name.includes("katz") || name.includes("mercantile")) {
    tags.push("laptop-friendly", "wfh-friendly");
  }
  
  if (name.includes("morningstar") || name.includes("paper co") || name.includes("southside")) {
    tags.push("student-friendly", "quiet");
  }
  
  if (name.includes("tenfold") || name.includes("vibrant") || name.includes("two guns")) {
    tags.push("cold-brew", "coffee-lover");
  }
  
  // Based on neighborhoods
  if (hood.includes("heights") || hood.includes("rice village")) {
    tags.push("group-friendly", "outdoor-seating");
  }
  
  if (hood.includes("montrose") || hood.includes("midtown")) {
    tags.push("instagram-worthy", "pet-friendly");
  }
  
  if (hood.includes("downtown") || hood.includes("greenway")) {
    tags.push("wfh-friendly", "always-space");
  }
  
  if (hood.includes("east end") || hood.includes("west end")) {
    tags.push("study-spot", "quiet");
  }
  
  // Add latte-art to most cafes
  if (Math.random() > 0.3) {
    tags.push("latte-art");
  }
  
  // Add bakery to some cafes
  if (Math.random() > 0.7) {
    tags.push("bakery");
  }
  
  // Remove duplicates and limit to 4-6 tags
  const uniqueTags = [...new Set(tags)];
  return uniqueTags.slice(0, Math.min(6, uniqueTags.length));
}

async function updateSeededCafeTags() {
  try {
    console.log('🔄 Updating tags for seeded cafes...');
    
    // Get all cafes from the database
    const { data: allCafes, error: fetchError } = await supabase
      .from('cafes')
      .select('id, name, place_id, neighborhood');
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!allCafes) {
      console.log('No cafes found in database');
      return;
    }
    
    console.log(`📊 Found ${allCafes.length} total cafes in database`);
    
    // Find the seeded cafes
    const seededCafes = allCafes.filter(cafe => 
      SEEDED_CAFE_NAMES.includes(cafe.name)
    );
    
    console.log(`🎯 Found ${seededCafes.length} seeded cafes to update`);
    
    if (seededCafes.length === 0) {
      console.log('⚠️  No seeded cafes found. Make sure the cafe names match exactly.');
      console.log('Looking for:', SEEDED_CAFE_NAMES);
      return;
    }
    
    // Update each seeded cafe with appropriate tags
    let updatedCount = 0;
    
    for (const cafe of seededCafes) {
      const tags = assignTagsToCafe(cafe.name, cafe.neighborhood || '');
      
      console.log(`📝 Updating ${cafe.name} with tags:`, tags);
      
      const { error: updateError } = await supabase
        .from('cafes')
        .update({ tags })
        .eq('id', cafe.id);
      
      if (updateError) {
        console.error(`❌ Error updating ${cafe.name}:`, updateError);
      } else {
        updatedCount++;
        console.log(`✅ Updated ${cafe.name} successfully`);
      }
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} seeded cafes with matching tags!`);
    console.log('Now tag filtering should work properly on the explore page.');
    
  } catch (error) {
    console.error('❌ Error updating seeded cafe tags:', error);
  }
}

// Run the update
updateSeededCafeTags().then(() => {
  console.log('✅ Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

