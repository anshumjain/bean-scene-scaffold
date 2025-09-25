// /pages/api/migrate-photos.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return res.status(500).json({ error: 'Google Places API key not found' });
  }

  try {
    console.log('🔍 Starting backend photo migration...');

    // Get all cafes that have google_photo_reference but no hero_photo_url
    const { data: cafesNeedingFix, error } = await supabase
      .from('cafes')
      .select('id, name, google_photo_reference, hero_photo_url')
      .not('google_photo_reference', 'is', null)
      .is('hero_photo_url', null);

    if (error) {
      console.error('❌ Database query error:', error);
      throw new Error(error.message);
    }

    console.log(`📊 Found ${cafesNeedingFix?.length || 0} cafes needing photo fixes`);
    
    let fixedCount = 0;

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
          console.error(`❌ Error updating cafe ${cafe.name}:`, updateError);
        } else {
          console.log(`✅ Fixed photo for: ${cafe.name}`);
          fixedCount++;
        }

        // Rate limiting - small delay between updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`🎉 Successfully fixed photos for ${fixedCount} cafes`);
    
    res.status(200).json({
      success: true,
      message: `Fixed ${fixedCount} cafe photos!`,
      fixedCount
    });
    
  } catch (error) {
    console.error('❌ Error fixing cafe photos:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fix cafe photos'
    });
  }
}
