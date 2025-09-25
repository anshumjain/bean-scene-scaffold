// /api/migrate-photos-cloudinary.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const CLOUDINARY_CLOUD_NAME = process.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GOOGLE_PLACES_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Missing required environment variables' });
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return res.status(500).json({ error: 'Cloudinary configuration missing' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get cafes needing photo fixes
    const { data: cafesNeedingFix, error } = await supabase
      .from('cafes')
      .select('id, name, google_photo_reference, hero_photo_url, place_id')
      .not('google_photo_reference', 'is', null)
      .is('hero_photo_url', null);

    if (error) {
      throw new Error(error.message);
    }

    console.log(`Found ${cafesNeedingFix?.length || 0} cafes needing photo fixes`);
    let fixedCount = 0;
    let errorCount = 0;

    for (const cafe of cafesNeedingFix || []) {
      if (cafe.google_photo_reference) {
        console.log(`Processing: ${cafe.name}`);
        
        try {
          const photoRef = cafe.google_photo_reference;
          const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=600&photoreference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;

          // Step 1: Download the image from Google with proper headers
          const imageResponse = await fetch(googlePhotoUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://maps.google.com/',
              'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            },
          });

          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
          }

          // Step 2: Get image as buffer
          const imageBuffer = await imageResponse.arrayBuffer();
          const imageBlob = new Blob([imageBuffer], { 
            type: imageResponse.headers.get('content-type') || 'image/jpeg' 
          });

          // Step 3: Upload buffer to Cloudinary
          const formData = new FormData();
          formData.append('file', imageBlob, `cafe-${cafe.place_id}.jpg`);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          formData.append('folder', 'cafe-heroes');
          formData.append('public_id', `cafe-${cafe.place_id}`);
          formData.append('transformation', 'w_800,h_600,c_fill,q_auto');

          const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Cloudinary upload failed (${uploadResponse.status}): ${errorText}`);
          }

          const uploadResult = await uploadResponse.json();
          console.log(`Uploaded to Cloudinary: ${uploadResult.secure_url}`);

          // Step 4: Update database with Cloudinary URL
          const { error: updateError } = await supabase
            .from('cafes')
            .update({ 
              hero_photo_url: uploadResult.secure_url,
            })
            .eq('id', cafe.id);

          if (updateError) {
            console.error(`Error updating cafe ${cafe.name}:`, updateError);
            errorCount++;
          } else {
            console.log(`✅ Fixed photo for: ${cafe.name}`);
            fixedCount++;
          }

        } catch (uploadError) {
          console.error(`❌ Error processing ${cafe.name}:`, uploadError);
          errorCount++;
        }

        // Rate limiting - pause between requests
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log(`Migration completed. Fixed: ${fixedCount}, Errors: ${errorCount}`);
    
    res.status(200).json({
      success: true,
      message: `Migrated ${fixedCount} cafe photos to Cloudinary! (${errorCount} errors)`,
      fixedCount,
      errorCount
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    });
  }
}
