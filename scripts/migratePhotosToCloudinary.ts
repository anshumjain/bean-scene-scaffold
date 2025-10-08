#!/usr/bin/env bun
/**
 * Migrate Google Places photos to Cloudinary
 * One-time script to download photos from Google and upload to Cloudinary
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import fetch from 'node-fetch';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.VITE_API_BASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!GOOGLE_PLACES_API_KEY) {
  console.error('❌ Missing GOOGLE_PLACES_API_KEY');
  process.exit(1);
}

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
  console.error('❌ Missing Cloudinary credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Rate limiting
const DELAY_MS = 150; // 150ms between requests
const MAX_RETRIES = 3;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadGooglePhoto(photoReference: string, placeId: string): Promise<Buffer> {
  let photoUrl: string;
  
  // Handle different photo reference formats
  if (photoReference.startsWith('places/')) {
    // New format with prefix: places/ChIJ.../photos/AciIO2cI...
    photoUrl = `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=800&key=${GOOGLE_PLACES_API_KEY}`;
  } else if (photoReference.length > 200) {
    // Long photo reference - construct new format using place_id
    photoUrl = `https://places.googleapis.com/v1/places/${placeId}/photos/${photoReference}/media?maxWidthPx=800&key=${GOOGLE_PLACES_API_KEY}`;
  } else {
    // Short photo reference (old format)
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(photoUrl);
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Google API quota exceeded or invalid key');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    } catch (error: any) {
      console.log(`   ⚠️  Attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);
      
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      
      // Exponential backoff
      const delay = DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  
  throw new Error('All retry attempts failed');
}

async function uploadToCloudinary(imageBuffer: Buffer, publicId: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer]), 'image.jpg');
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'bean-scene/cafes');
  formData.append('public_id', `cafe_${publicId}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Cloudinary upload failed: ${response.status} ${errorData}`);
  }

  const result = await response.json();
  return result.secure_url;
}

async function updateCafePhoto(cafeId: string, photoUrl: string) {
  const { error } = await supabase
    .from('cafes')
    .update({ hero_photo_url: photoUrl })
    .eq('id', cafeId);

  if (error) {
    throw new Error(`Database update failed: ${error.message}`);
  }
}

async function migratePhotos() {
  console.log('🔄 Starting photo migration...\n');
  
  // Get total count first
  const { count: totalCount } = await supabase
    .from('cafes')
    .select('*', { count: 'exact', head: true })
    .not('google_photo_reference', 'is', null)
    .is('hero_photo_url', null)
    .eq('is_active', true);

  console.log(`📊 Total cafes needing migration: ${totalCount || 0}`);

  // Get cafes that need migration
  const { data: cafes, error } = await supabase
    .from('cafes')
    .select('id, name, place_id, google_photo_reference')
    .not('google_photo_reference', 'is', null)
    .is('hero_photo_url', null)
    .eq('is_active', true)
    .limit(100); // Process in batches

  if (error) {
    throw new Error(`Failed to fetch cafes: ${error.message}`);
  }

  if (!cafes || cafes.length === 0) {
    console.log('✅ No cafes need migration');
    return;
  }

  console.log(`📊 Processing batch of ${cafes.length} cafes\n`);
  console.log(`📊 Progress: ${(totalCount || 0) - cafes.length}/${totalCount || 0} remaining\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];
    console.log(`[${i + 1}/${cafes.length}] 📸 ${cafe.name}`);

    try {
      // Download photo from Google
      const imageBuffer = await downloadGooglePhoto(cafe.google_photo_reference, cafe.place_id);
      console.log(`   ✅ Downloaded (${Math.round(imageBuffer.length / 1024)}KB)`);

      // Upload to Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(imageBuffer, cafe.place_id);
      console.log(`   ✅ Uploaded to Cloudinary`);

      // Update database
      await updateCafePhoto(cafe.id, cloudinaryUrl);
      console.log(`   ✅ Updated database`);

      successCount++;
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
      errorCount++;
    }

    // Rate limiting
    if (i < cafes.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n📊 Batch Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📈 Batch Total: ${cafes.length}`);
  console.log(`   📊 Overall Progress: ${successCount}/${totalCount || 0} completed`);
  
  if (totalCount && cafes.length < totalCount) {
    console.log(`\n🔄 Run the script again to continue migration:`);
    console.log(`   npm run migrate:photos`);
  } else {
    console.log(`\n🎉 Migration Complete!`);
  }
}

// Run migration
migratePhotos().catch(console.error);
