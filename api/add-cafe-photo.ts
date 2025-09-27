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

    // Check if this cafe needs a hero photo
    const { data: cafe } = await supabase
      .from('cafes')
      .select('hero_photo_url')
      .eq('id', cafeId)
      .single();

    if (!cafe) {
      throw new Error('Cafe not found');
    }

    // Determine if this should be the hero photo (first photo for this cafe)
    const shouldBeHero = !cafe.hero_photo_url;

    // Add photo to cafe_photos table
    const { data: photoData, error: photoError } = await supabase
      .from('cafe_photos')
      .insert({
        cafe_id: cafeId,
        photo_url: photoUrl,
        uploaded_by: uploadedBy || null,
        is_approved: true, // Auto-approve for now, add moderation later
        is_hero: shouldBeHero // Set as hero if this is the first photo
      })
      .select()
      .single();

    if (photoError) {
      throw new Error(photoError.message);
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
