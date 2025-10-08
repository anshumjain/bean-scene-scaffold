import type { NextRequest } from 'next/server';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  if (!GOOGLE_PLACES_API_KEY) {
    return new Response(JSON.stringify({ 
      status: 'ERROR', 
      error_message: 'Google Places API key not configured' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('place_id');
  const fields = searchParams.get('fields') || 'name,photos';

  if (!placeId) {
    return new Response(JSON.stringify({ 
      status: 'ERROR', 
      error_message: 'place_id parameter is required' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      status: 'ERROR', 
      error_message: 'Failed to fetch place details' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
