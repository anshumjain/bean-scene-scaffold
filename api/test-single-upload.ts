// Create /api/test-single-upload.ts
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

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    // Get just ONE cafe to test
    const { data: cafes, error } = await supabase
      .from('cafes')
      .select('id, name, google_photo_reference, hero_photo_url, place_id')
      .not('google_photo_reference', 'is', null)
      .is('hero_photo_url', null)
      .limit(1);

    if (error || !cafes || cafes.length === 0) {
      return res.status(500).json({ 
        error: 'No test cafe found',
        details: error?.message 
      });
    }

    const cafe = cafes[0];
    const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=600&photoreference=${cafe.google_photo_reference}&key=${GOOGLE_PLACES_API_KEY}`;

    // Test step 1: Can we access the Google Photo URL?
    let googleUrlTest;
    try {
      const googleResponse = await fetch(googlePhotoUrl);
      googleUrlTest = {
        success: googleResponse.ok,
        status: googleResponse.status,
        statusText: googleResponse.statusText,
        headers: Object.fromEntries(googleResponse.headers.entries()),
        contentType: googleResponse.headers.get('content-type')
      };
    } catch (googleError) {
      googleUrlTest = {
        success: false,
        error: googleError instanceof Error ? googleError.message : 'Unknown error'
      };
    }

    // Test step 2: Try Cloudinary upload
    let cloudinaryTest;
    try {
      const formData = new FormData();
      formData.append('file', googlePhotoUrl);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET!);
      formData.append('folder', 'cafe-heroes');

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const responseText = await uploadResponse.text();
      
      cloudinaryTest = {
        success: uploadResponse.ok,
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        response: uploadResponse.ok ? JSON.parse(responseText) : responseText
      };

    } catch (cloudinaryError) {
      cloudinaryTest = {
        success: false,
        error: cloudinaryError instanceof Error ? cloudinaryError.message : 'Unknown error'
      };
    }

    return res.status(200).json({
      success: true,
      testCafe: {
        name: cafe.name,
        place_id: cafe.place_id,
        photo_reference_length: cafe.google_photo_reference?.length || 0
      },
      googlePhotoUrl,
      tests: {
        googleUrlAccess: googleUrlTest,
        cloudinaryUpload: cloudinaryTest
      },
      environment: {
        hasGoogleKey: !!GOOGLE_PLACES_API_KEY,
        hasCloudinaryName: !!CLOUDINARY_CLOUD_NAME,
        hasUploadPreset: !!CLOUDINARY_UPLOAD_PRESET,
        cloudinaryName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    });
  }
}
