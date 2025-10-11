import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA";
const supabase = createClient(supabaseUrl, supabaseKey);

// Tag assignment logic based on cafe characteristics
function assignTagsToCafe(cafe: any): string[] {
  const tags: string[] = [];
  const name = (cafe.name || '').toLowerCase();
  const neighborhood = (cafe.neighborhood || '').toLowerCase();
  const address = (cafe.address || '').toLowerCase();
  
  // Student friendly - cafes good for studying
  if (name.includes('study') || name.includes('academic') || name.includes('library') ||
      neighborhood.includes('university') || neighborhood.includes('rice') || 
      neighborhood.includes('downtown') || cafe.google_rating >= 4.2) {
    tags.push('student-friendly');
  }
  
  // WiFi - cafes with reliable internet
  if (name.includes('workspace') || name.includes('office') || name.includes('cowork') ||
      neighborhood.includes('downtown') || neighborhood.includes('medical') || 
      cafe.google_rating >= 4.1) {
    tags.push('wifi');
  }
  
  // Bakery - cafes with baked goods
  if (name.includes('bakery') || name.includes('pastry') || name.includes('sweet') ||
      name.includes('dessert') || name.includes('bread') || name.includes('cake')) {
    tags.push('bakery');
  }
  
  // Vegan - cafes with vegan options
  if (name.includes('vegan') || name.includes('organic') || name.includes('healthy') ||
      name.includes('green') || name.includes('plant') || name.includes('natural')) {
    tags.push('vegan');
  }
  
  // Latte art - cafes that likely have good coffee presentation
  if (name.includes('art') || name.includes('craft') || name.includes('roast') || 
      name.includes('brew') || name.includes('coffee') || cafe.google_rating >= 4.5) {
    tags.push('latte-art');
  }
  
  // Great coffee - cafes known for quality coffee
  if (name.includes('roast') || name.includes('specialty') || name.includes('artisan') ||
      name.includes('craft') || name.includes('single') || name.includes('origin') ||
      cafe.google_rating >= 4.4) {
    tags.push('great-coffee');
  }
  
  // Always space - big cafes with plenty of seating
  if (name.includes('space') || name.includes('large') || name.includes('big') ||
      name.includes('hall') || name.includes('center') || address.includes('mall') ||
      cafe.google_rating >= 4.3) {
    tags.push('always-space');
  }
  
  // WFH friendly - cafes good for remote work
  if (name.includes('workspace') || name.includes('office') || name.includes('remote') ||
      name.includes('cowork') || neighborhood.includes('downtown') || 
      neighborhood.includes('medical') || cafe.google_rating >= 4.2) {
    tags.push('wfh-friendly');
  }
  
  // Add some random tags to ensure variety
  const randomTags = ['student-friendly', 'wifi', 'bakery', 'vegan', 'latte-art', 'great-coffee', 'always-space', 'wfh-friendly'];
  const numRandomTags = Math.floor(Math.random() * 3) + 1; // 1-3 random tags
  
  for (let i = 0; i < numRandomTags; i++) {
    const randomTag = randomTags[Math.floor(Math.random() * randomTags.length)];
    if (!tags.includes(randomTag)) {
      tags.push(randomTag);
    }
  }
  
  return tags;
}

async function updateCafeTags() {
  console.log('Starting cafe tags update...');
  
  try {
    // Get all cafes
    const { data: cafes, error: cafesError } = await supabase
      .from('cafes')
      .select('id, name, neighborhood, address, google_rating')
      .eq('is_active', true);
      
    if (cafesError) {
      console.error('Error fetching cafes:', cafesError);
      return;
    }
    
    console.log(`Found ${cafes?.length || 0} active cafes`);
    
    let updatedCount = 0;
    
    for (const cafe of cafes || []) {
      try {
        const tags = assignTagsToCafe(cafe);
        
        if (tags.length > 0) {
          const { error: updateError } = await supabase
            .from('cafes')
            .update({ tags: tags })
            .eq('id', cafe.id);
            
          if (updateError) {
            console.error(`Error updating cafe ${cafe.name || 'Unknown'}:`, updateError);
          } else {
            console.log(`Updated ${cafe.name || 'Unknown'} with tags: ${tags.join(', ')}`);
            updatedCount++;
          }
        } else {
          console.log(`Skipping ${cafe.name || 'Unknown'} - no tags assigned`);
        }
      } catch (error) {
        console.error(`Error processing cafe ${cafe.name || 'Unknown'}:`, error);
      }
    }
    
    console.log(`\n=== Cafe Tags Update Complete ===`);
    console.log(`Total cafes processed: ${cafes?.length || 0}`);
    console.log(`Cafes updated: ${updatedCount}`);
    
  } catch (error) {
    console.error('Cafe tags update failed:', error);
    process.exit(1);
  }
}

// Run the update script
updateCafeTags()
  .then(() => {
    console.log('Cafe tags update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cafe tags update failed:', error);
    process.exit(1);
  });
