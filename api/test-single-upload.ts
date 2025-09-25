// Replace your /api/test-single-upload.ts with this more detailed version
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
    const photoRef = cafe.google_photo_reference;
    const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=600&photoreference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;

    let step1Result, step2Result, step3Result;

    // STEP 1: Test basic Google URL access
    try {
      const response1 = await fetch(googlePhotoUrl);
      step1Result = {
        success: response1.ok,
        status: response1.status,
        statusText: response1.statusText,
        contentType: response1.headers.get('content-type'),
        contentLength: response1.headers.get('content-length')
      };
    } catch (error) {
      step1Result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // STEP 2: Test with browser headers
    try {
      const response2 = await fetch(googlePhotoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://maps.google.com/',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (response2.ok) {
        const buffer = await response2.arrayBuffer();
        step2Result = {
          success: true,
          status: response2.status,
          contentType: response2.headers.get('content-type'),
          imageSize: buffer.byteLength,
          hasImageData: buffer.byteLength > 0
        };

        // STEP 3: Try uploading to Cloudinary if we got the image
        try {
          const imageBlob = new Blob([buffer], { 
            type: response2.headers.get('content-type') || 'image/jpeg' 
          });

          const formData = new FormData();
          formData.append('file', imageBlob, `test-${cafe.place_id}.jpg`);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET!);
          formData.append('folder', 'cafe-heroes-test');

          const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
              method: 'POST',
              body: formData,
            }
          );

          const responseText = await uploadResponse.text();
          
          step3Result = {
            success: uploadResponse.ok,
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            response: uploadResponse.ok ? JSON.parse(responseText) : responseText
          };

        } catch (cloudinaryError) {
          step3Result = {
            success: false,
            error: cloudinaryError instanceof Error ? cloudinaryError.message : 'Cloudinary error'
          };
        }
      } else {
        step2Result = {
          success: false,
          status: response2.status,
          statusText: response2.statusText,
          error: 'Failed with browser headers'
        };
      }

    } catch (error) {
      step2Result = {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch with headers failed'
      };
    }

    return res.status(200).json({
      success: true,
      testCafe: {
        name: cafe.name,
        place_id: cafe.place_id,
        photo_ref_length: photoRef.length
      },
      googlePhotoUrl,
      tests: {
        step1_basicFetch: step1Result,
        step2_withBrowserHeaders: step2Result,
        step3_cloudinaryUpload: step3Result
      },
      environment: {
        hasGoogleKey: !!GOOGLE_PLACES_API_KEY,
        googleKeyLength: GOOGLE_PLACES_API_KEY?.length || 0,
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
