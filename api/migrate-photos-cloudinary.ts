// /api/migrate-photos-cloudinary.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

  if (!cloudinary.config().cloud_name) {
    return res.status(500).json({ error: 'Cloudinary configuration missing' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('🔍 Starting Cloudinary photo migration...');

    // Get cafes needing photo fixes
    const { data: cafesNeedingFix, error } = await supabase
      .from('cafes')
      .select('id, name, google_photo_reference, hero_photo_url, place_id')
      .not('google_photo_reference', 'is', null)
      .is('hero_photo_url', null);

    if (error) {
      throw new Error(error.message);
    }

    console.log(`📊 Found ${cafesNeedingFix?.length || 0} cafes needing photo fixes`);
    let fixedCount = 0;

    for (const cafe of cafesNeedingFix || []) {
      if (cafe.google_photo_reference) {
        console.log(`🔧 Processing: ${cafe.name}`);
        
        try {
          // Extract photo reference
          let photoRef = cafe.google_photo_reference;
          if (photoRef.includes('/photos/')) {
            photoRef = photoRef.split('/photos/')[1];
            if (photoRef.includes('?')) {
              photoRef = photoRef.split('?')[0];
            }
          }

          // Generate Google Photos API URL
          const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=600&photoreference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;

          // Upload to Cloudinary directly from Google URL
          const uploadResult = await cloudinary.uploader.upload(googlePhotoUrl, {
            folder: 'cafe-heroes',
            public_id: `cafe-${cafe.place_id}`,
            transformation: [
              { width: 800, height: 600, crop: 'fill', quality: 'auto' }
            ],
            overwrite: true
          });

          console.log(`📸 Uploaded to Cloudinary: ${uploadResult.secure_url}`);

          // Update database with Cloudinary URL
          const { error: updateError } = await supabase
            .from('cafes')
            .update({ 
              hero_photo_url: uploadResult.secure_url,
              google_photo_reference: photoRef
            })
            .eq('id', cafe.id);

          if (updateError) {
            console.error(`❌ Error updating cafe ${cafe.name}:`, updateError);
          } else {
            console.log(`✅ Fixed photo for: ${cafe.name}`);
            fixedCount++;
          }

        } catch (uploadError) {
          console.error(`❌ Error processing ${cafe.name}:`, uploadError);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`🎉 Successfully migrated ${fixedCount} photos to Cloudinary`);
    
    res.status(200).json({
      success: true,
      message: `Migrated ${fixedCount} cafe photos to Cloudinary!`,
      fixedCount
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    });
  }
}
