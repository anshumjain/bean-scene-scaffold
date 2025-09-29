// /api/fix-cafe-photos.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin authentication
  const apiKey = req.headers['x-admin-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Database configuration missing' });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return res.status(500).json({ 
      error: 'Google Places API key not found',
      note: 'Add GOOGLE_PLACES_API_KEY to your .env.local file'
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log('🔍 Starting photo migration...');
    
    // Get all cafes that have google_photo_reference but no hero_photo_url
    const { data: cafesNeedingFix, error } = await supabase
      .from('cafes')
      .select('id, name, google_photo_reference, hero_photo_url')
      .not('google_photo_reference', 'is', null)
      .is('hero_photo_url', null);

    if (error) {
      throw new Error(error.message);
    }

    console.log(`📊 Found ${cafesNeedingFix?.length || 0} cafes needing photo fixes`);
    
    let fixedCount = 0;
    const errors: string[] = [];

    for (const cafe of cafesNeedingFix || []) {
      if (cafe.google_photo_reference) {
        console.log(`🔧 Processing: ${cafe.name}`);
        
        // Extract photo reference from the Places API path format
        let photoRef = cafe.google_photo_reference;
        
        if (photoRef.includes('/photos/')) {
          // Extract just the photo reference ID after '/photos/'
          photoRef = photoRef.split('/photos/')[1];
          // Remove any query parameters if present
          if (photoRef.includes('?')) {
            photoRef = photoRef.split('?')[0];
          }
        }

        // Generate proper Google Photos API URL
        const heroPhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=600&photoreference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;

        // Update the cafe record
        const { error: updateError } = await supabase
          .from('cafes')
          .update({ 
            hero_photo_url: heroPhotoUrl,
            google_photo_reference: photoRef // Store clean reference for future use
          })
          .eq('id', cafe.id);

        if (updateError) {
          const errorMsg = `Failed to update cafe ${cafe.name}: ${updateError.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        } else {
          console.log(`✅ Fixed photo for: ${cafe.name}`);
          fixedCount++;
        }

        // Rate limiting - small delay between updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`🎉 Successfully fixed photos for ${fixedCount} cafes`);
    
    return res.status(200).json({
      success: true,
      message: `Successfully fixed photos for ${fixedCount} cafes`,
      fixedCount,
      totalFound: cafesNeedingFix?.length || 0,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Error fixing cafe photos:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fix cafe photos'
    });
  }
}

