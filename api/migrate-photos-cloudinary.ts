import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    res.status(200).json({
      success: true,
      message: 'Basic Cloudinary endpoint working',
      env: {
        hasGoogleKey: !!process.env.GOOGLE_PLACES_API_KEY,
        hasCloudName: !!process.env.VITE_CLOUDINARY_CLOUD_NAME,
        hasUploadPreset: !!process.env.VITE_CLOUDINARY_UPLOAD_PRESET,
        hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
