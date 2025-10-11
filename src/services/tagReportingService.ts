import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from './userService';

interface TagReport {
  id?: string;
  cafe_id: string;
  tag: string;
  user_id?: string;
  device_id?: string;
  reason?: string;
  created_at?: string;
}

/**
 * Report an incorrect tag for a cafe
 */
export async function reportIncorrectTag(
  cafeId: string, 
  tag: string, 
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use consistent device ID
    const deviceId = getDeviceId();

    const { error } = await supabase
      .from('tag_reports')
      .insert({
        cafe_id: cafeId,
        tag: tag,
        device_id: deviceId,
        reason: reason || 'Incorrect tag'
      });

    if (error) {
      console.error('Error reporting tag:', error);
      return { success: false, error: error.message };
    }

    // Check if we need to remove the tag (threshold reached)
    await checkAndRemoveTagIfNeeded(cafeId, tag);

    return { success: true };
  } catch (error) {
    console.error('Error in reportIncorrectTag:', error);
    return { success: false, error: 'Failed to report tag' };
  }
}

/**
 * Check if a tag should be removed based on report threshold
 */
async function checkAndRemoveTagIfNeeded(cafeId: string, tag: string): Promise<void> {
  try {
    // Get count of reports for this tag
    const { data: reports, error } = await supabase
      .from('tag_reports')
      .select('id')
      .eq('cafe_id', cafeId)
      .eq('tag', tag);

    if (error) {
      console.error('Error checking tag reports:', error);
      return;
    }

    const reportCount = reports?.length || 0;
    const threshold = 20; // Remove tag if 20+ people report it

    if (reportCount >= threshold) {
      // Remove the tag from the cafe
      const { data: cafe, error: cafeError } = await supabase
        .from('cafes')
        .select('tags')
        .eq('id', cafeId)
        .single();

      if (cafeError || !cafe) {
        console.error('Error fetching cafe for tag removal:', cafeError);
        return;
      }

      const currentTags = cafe.tags || [];
      const updatedTags = currentTags.filter((t: string) => t !== tag);

      const { error: updateError } = await supabase
        .from('cafes')
        .update({ tags: updatedTags })
        .eq('id', cafeId);

      if (updateError) {
        console.error('Error removing tag from cafe:', updateError);
      } else {
        console.log(`Tag "${tag}" removed from cafe ${cafeId} due to ${reportCount} reports`);
      }
    }
  } catch (error) {
    console.error('Error in checkAndRemoveTagIfNeeded:', error);
  }
}

/**
 * Check if user has already reported a specific tag for a cafe
 */
export async function hasUserReportedTag(
  cafeId: string, 
  tag: string
): Promise<boolean> {
  try {
    const deviceId = getDeviceId();

    const { data, error } = await supabase
      .from('tag_reports')
      .select('id')
      .eq('cafe_id', cafeId)
      .eq('tag', tag)
      .eq('device_id', deviceId)
      .limit(1);

    if (error) {
      console.error('Error checking if user reported tag:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error in hasUserReportedTag:', error);
    return false;
  }
}

/**
 * Get report count for a specific tag on a cafe
 */
export async function getTagReportCount(
  cafeId: string, 
  tag: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('tag_reports')
      .select('id')
      .eq('cafe_id', cafeId)
      .eq('tag', tag);

    if (error) {
      console.error('Error getting tag report count:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error in getTagReportCount:', error);
    return 0;
  }
}
