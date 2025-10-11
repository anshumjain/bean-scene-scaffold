import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from './types';
import { getDeviceId } from './userService';

export interface Tip {
  id: string;
  cafe_id: string;
  user_id?: string;
  device_id?: string;
  username?: string;
  tip_text: string;
  likes: number;
  created_at: string;
  updated_at: string;
}

export interface TipWithCafe extends Tip {
  cafes?: {
    id: string;
    name: string;
    address: string;
    neighborhood: string;
  };
}

/**
 * Get tips for a specific cafe
 */
export async function getCafeTips(cafeId: string): Promise<ApiResponse<Tip[]>> {
  try {
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .eq('cafe_id', cafeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cafe tips:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting cafe tips:', error);
    return { success: false, error: 'Failed to fetch tips', data: [] };
  }
}

/**
 * Submit a tip for a cafe
 */
export async function submitTip(cafeId: string, tipText: string): Promise<ApiResponse<Tip>> {
  try {
    const deviceId = getDeviceId();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get username
    let username: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('auth_user_id', user.id)
        .single();
      username = profile?.name || user.email?.split('@')[0] || 'Anonymous';
    } else {
      username = localStorage.getItem('username') || 'Anonymous';
    }

    // Get or create user profile (only for authenticated users)
    let userProfile = null;
    if (user) {
      let { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!profile) {
        // Create user profile if it doesn't exist
        const { data: newProfile, error: profileError } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
            email: user.email || '',
          })
          .select('id')
          .single();
        
        if (profileError) throw new Error(profileError.message);
        profile = newProfile;
      }
      userProfile = profile;
    }

    // Check if user already has a tip for this cafe
    const { data: existingTip } = await supabase
      .from('tips')
      .select('id')
      .eq('cafe_id', cafeId)
      .or(`user_id.eq.${userProfile?.id || ''},device_id.eq.${deviceId}`)
      .maybeSingle();

    if (existingTip) {
      // Update existing tip
      const { data, error } = await supabase
        .from('tips')
        .update({
          tip_text: tipText,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTip.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating tip:', error);
        return { success: false, error: error.message, data: null };
      }

      return { success: true, data };
    } else {
      // Create new tip
      const { data, error } = await supabase
        .from('tips')
        .insert({
          cafe_id: cafeId,
          user_id: userProfile?.id || null,
          device_id: deviceId,
          username: username,
          tip_text: tipText
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating tip:', error);
        return { success: false, error: error.message, data: null };
      }

      return { success: true, data };
    }
  } catch (error) {
    console.error('Error submitting tip:', error);
    return { success: false, error: 'Failed to submit tip', data: null };
  }
}

/**
 * Delete a tip
 */
export async function deleteTip(tipId: string): Promise<ApiResponse<null>> {
  try {
    const deviceId = getDeviceId();
    const { data: { user } } = await supabase.auth.getUser();
    
    let orCondition = "";
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      if (profile) {
        orCondition = `user_id.eq.${profile.id}`;
      }
    }
    if (deviceId) {
      if (orCondition) orCondition += `,device_id.eq.${deviceId}`;
      else orCondition = `device_id.eq.${deviceId}`;
    }

    if (!orCondition) {
      return { success: false, error: "No permission to delete tip", data: null };
    }

    const { error } = await supabase
      .from('tips')
      .delete()
      .eq('id', tipId)
      .or(orCondition);

    if (error) {
      console.error('Error deleting tip:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error deleting tip:', error);
    return { success: false, error: 'Failed to delete tip', data: null };
  }
}
