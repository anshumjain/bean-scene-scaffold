// /api/update-cafe-photo.ts
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

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }

  const { cafeId, photoUrl } = req.body;

  if (!cafeId || !photoUrl) {
    return res.status(400).json({ error: 'Missing cafeId or photoUrl' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Update cafe with Cloudinary URL
    const { data, error } = await supabase
      .from('cafes')
      .update({ hero_photo_url: photoUrl })
      .eq('id', cafeId)
      .select('id, name');

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      throw new Error('Cafe not found');
    }

    res.status(200).json({
      success: true,
      message: `Updated photo for ${data[0].name}`,
      cafe: data[0]
    });
    
  } catch (error) {
    console.error('Error updating cafe photo:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update cafe photo'
    });
  }
}
