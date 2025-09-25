// /api/add-cafe-photo.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cafeId, photoUrl, uploadedBy } = req.body;

  if (!cafeId || !photoUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Database configuration missing' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Add photo to cafe_photos table (you'll need to create this)
    const { data: photoData, error: photoError } = await supabase
      .from('cafe_photos')
      .insert({
        cafe_id: cafeId,
        photo_url: photoUrl,
        uploaded_by: uploadedBy || 'anonymous',
        uploaded_at: new Date().toISOString(),
        is_approved: true, // Auto-approve for now, add moderation later
      })
      .select()
      .single();

    if (photoError) {
      throw new Error(photoError.message);
    }

    // Check if this cafe needs a hero photo
    const { data: cafe } = await supabase
      .from('cafes')
      .select('hero_photo_url')
      .eq('id', cafeId)
      .single();

    // If no hero photo exists, make this the hero
    if (cafe && !cafe.hero_photo_url) {
      const { error: updateError } = await supabase
        .from('cafes')
        .update({ hero_photo_url: photoUrl })
        .eq('id', cafeId);

      if (updateError) {
        console.error('Failed to set hero photo:', updateError);
        // Don't fail the request, just log it
      }
    }

    res.status(200).json({
      success: true,
      message: 'Photo added successfully',
      photo: photoData
    });

  } catch (error) {
    console.error('Error adding cafe photo:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add photo'
    });
  }
}
