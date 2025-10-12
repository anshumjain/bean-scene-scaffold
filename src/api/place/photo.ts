const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

export async function GET(request: Request) {
  if (!GOOGLE_PLACES_API_KEY) {
    return new Response('Google Places API key not configured', { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const photoreference = searchParams.get('photoreference');
  const maxwidth = searchParams.get('maxwidth') || '800';
  const maxheight = searchParams.get('maxheight') || '600';

  if (!photoreference) {
    return new Response('photoreference parameter is required', { status: 400 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&maxheight=${maxheight}&photoreference=${photoreference}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return new Response('Failed to fetch photo', { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
      }
    });
  } catch (error) {
    return new Response('Failed to fetch photo', { status: 500 });
  }
}
