// /api/get-cafes-for-migration.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get cafes that need photo migration
    const { data: cafes, error } = await supabase
      .from('cafes')
      .select('id, name, google_photo_reference, place_id')
      .not('google_photo_reference', 'is', null)
      .is('hero_photo_url', null)
      .order('name');

    if (error) {
      throw new Error(error.message);
    }

    res.status(200).json({
      success: true,
      cafes: cafes || [],
      count: cafes?.length || 0
    });
    
  } catch (error) {
    console.error('Error fetching cafes for migration:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cafes'
    });
  }
}
