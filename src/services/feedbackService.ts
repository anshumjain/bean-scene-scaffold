import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from './userService';
import { ApiResponse } from './types';

export interface FeedbackData {
  feedback_type: 'bug' | 'feature' | 'general' | 'support';
  subject: string;
  details: string;
  allow_followup: boolean;
  contact_email?: string;
}

export interface Feedback {
  id: string;
  feedback_type: string;
  subject: string;
  details: string;
  allow_followup: boolean;
  contact_email?: string;
  user_id?: string;
  device_id?: string;
  created_at: string;
  updated_at: string;
}

function apiErrorResponse<T>(defaultValue: T): ApiResponse<T> {
  return {
    data: defaultValue,
    success: false,
    error: 'Failed to call API'
  };
}

/**
 * Submit feedback form
 */
export async function submitFeedback(feedbackData: FeedbackData): Promise<ApiResponse<Feedback>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = getDeviceId();

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
            name: user.user_metadata?.name || 'Anonymous User',
            email: user.email || ''
          })
          .select('id')
          .single();

        if (profileError) throw new Error(profileError.message);
        profile = newProfile;
      }
      userProfile = profile;
    }

    // Prepare feedback data
    const feedbackPayload = {
      feedback_type: feedbackData.feedback_type,
      subject: feedbackData.subject,
      details: feedbackData.details,
      allow_followup: feedbackData.allow_followup,
      contact_email: feedbackData.allow_followup ? feedbackData.contact_email : null,
      user_id: userProfile?.id || null,
      device_id: deviceId
    };

    const { data, error } = await supabase
      .from('feedback')
      .insert(feedbackPayload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      data,
      success: true
    };
  } catch (error) {
    return {
      data: {} as Feedback,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit feedback'
    };
  }
}

/**
 * Get user's feedback history
 */
export async function getUserFeedback(): Promise<ApiResponse<Feedback[]>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = getDeviceId();

    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (user) {
      // Get user's feedback
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (profile) {
        query = query.eq('user_id', profile.id);
      }
    } else if (deviceId) {
      // Get anonymous user's feedback by device_id
      query = query.eq('device_id', deviceId);
    } else {
      return {
        data: [],
        success: true
      };
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return {
      data: data || [],
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch feedback'
    };
  }
}

/**
 * Update feedback (for follow-up email changes)
 */
export async function updateFeedback(
  feedbackId: string, 
  updates: Partial<FeedbackData>
): Promise<ApiResponse<Feedback>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = getDeviceId();

    // Prepare update data
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Only include contact_email if allow_followup is true
    if (!updates.allow_followup) {
      updateData.contact_email = null;
    }

    let query = supabase
      .from('feedback')
      .update(updateData)
      .eq('id', feedbackId)
      .select()
      .single();

    // Apply RLS - user can only update their own feedback
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (profile) {
        query = query.eq('user_id', profile.id);
      }
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else {
      throw new Error('No user or device ID available');
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return {
      data,
      success: true
    };
  } catch (error) {
    return {
      data: {} as Feedback,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update feedback'
    };
  }
}
