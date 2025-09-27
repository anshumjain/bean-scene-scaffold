// /api/google-places-test.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // This should only be accessible server-side
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!GOOGLE_PLACES_API_KEY) {
    return res.status(500).json({ 
      success: false, 
      error: 'Google Places API key not found in server environment variables',
      note: 'Add GOOGLE_PLACES_API_KEY to your .env.local file'
    });
  }

  try {
    // Test Google Places API with a simple search
    const testQuery = 'coffee shop houston';
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(testQuery)}&location=29.7604,-95.3698&radius=1000&key=${GOOGLE_PLACES_API_KEY}`;
    
    console.log('Testing Google Places API...');
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error_message) {
      return res.status(400).json({
        success: false,
        error: 'Google Places API Error',
        details: data.error_message,
        status: data.status
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Google Places API connection successful',
      resultsCount: data.results?.length || 0,
      apiKeyPresent: !!GOOGLE_PLACES_API_KEY,
      sampleResult: data.results?.[0] ? {
        name: data.results[0].name,
        place_id: data.results[0].place_id,
        rating: data.results[0].rating
      } : null
    });

  } catch (error) {
    console.error('Google Places API test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to test Google Places API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
