import { supabase } from '@/integrations/supabase/client';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { cafeId, photoUrl, uploadedBy } = await request.json();

    if (!cafeId || !photoUrl) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'cafeId and photoUrl are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // First, add the photo to cafe_photos table
    const { data: photoData, error: photoError } = await supabase
      .from('cafe_photos')
      .insert({
        cafe_id: cafeId,
        photo_url: photoUrl,
        uploaded_by: uploadedBy || 'anonymous',
        is_approved: true, // Auto-approve user photos
        is_hero: false // Will be set to true if this becomes the hero
      })
      .select()
      .single();

    if (photoError) {
      console.error('Error adding photo to cafe_photos:', photoError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to add photo to database' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if this cafe has a hero photo, if not, set this as the hero
    const { data: cafe, error: cafeError } = await supabase
      .from('cafes')
      .select('hero_photo_url')
      .eq('id', cafeId)
      .single();

    if (cafeError) {
      console.error('Error fetching cafe:', cafeError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch cafe details' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If no hero photo exists, set this as the hero
    if (!cafe.hero_photo_url) {
      const { error: updateError } = await supabase
        .from('cafes')
        .update({ 
          hero_photo_url: photoUrl,
          photo_source: 'user', // Set photo source to user to remove Google overlay
          updated_at: new Date().toISOString()
        })
        .eq('id', cafeId);

      if (updateError) {
        console.error('Error updating hero photo:', updateError);
      } else {
        // Mark this photo as the hero
        await supabase
          .from('cafe_photos')
          .update({ is_hero: true })
          .eq('id', photoData.id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Photo uploaded successfully',
      photoId: photoData.id,
      isHero: !cafe.hero_photo_url
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in add-cafe-photo API:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
