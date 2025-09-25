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

    // Debug response - return this info to see what's happening
    return res.status(200).json({
      success: true,
      message: 'Debug migration query',
      debug: {
        hasError: !!error,
        errorMessage: error?.message || 'No error',
        dataExists: !!cafesNeedingFix,
        dataLength: cafesNeedingFix?.length || 0,
        sampleData: cafesNeedingFix?.slice(0, 3) || [],
        envVars: {
          hasSupabaseUrl: !!SUPABASE_URL,
          hasSupabaseKey: !!SUPABASE_ANON_KEY,
          hasGoogleKey: !!GOOGLE_PLACES_API_KEY,
          hasCloudName: !!CLOUDINARY_CLOUD_NAME,
          hasUploadPreset: !!CLOUDINARY_UPLOAD_PRESET
        }
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
