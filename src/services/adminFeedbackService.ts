import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from './types';

export interface AdminFeedback {
  id: string;
  feedback_type: 'bug' | 'feature' | 'general' | 'support';
  subject: string;
  details: string;
  allow_followup: boolean;
  contact_email?: string;
  user_id?: string;
  device_id?: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

export interface FeedbackStats {
  total: number;
  by_type: {
    bug: number;
    feature: number;
    general: number;
    support: number;
  };
  with_followup: number;
  recent_count: number;
}

export async function getAllFeedback(
  limit: number = 50,
  offset: number = 0,
  type?: string
): Promise<ApiResponse<AdminFeedback[]>> {
  try {
    let query = supabase
      .from('feedback')
      .select(`
        *,
        users!feedback_user_id_fkey (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && type !== 'all') {
      query = query.eq('feedback_type', type);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const transformedData = data?.map(item => ({
      ...item,
      user_name: item.users?.name || 'Anonymous',
      user_email: item.users?.email || null
    })) || [];

    return {
      data: transformedData,
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

export async function getFeedbackStats(): Promise<ApiResponse<FeedbackStats>> {
  try {
    const { count: totalCount, error: totalError } = await supabase
      .from('feedback')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw new Error(totalError.message);

    const { count: followupCount } = await supabase
      .from('feedback')
      .select('*', { count: 'exact', head: true })
      .eq('allow_followup', true);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentCount } = await supabase
      .from('feedback')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    const { data: typeData } = await supabase
      .from('feedback')
      .select('feedback_type');

    const stats: FeedbackStats = {
      total: totalCount || 0,
      by_type: {
        bug: typeData?.filter(t => t.feedback_type === 'bug').length || 0,
        feature: typeData?.filter(t => t.feedback_type === 'feature').length || 0,
        general: typeData?.filter(t => t.feedback_type === 'general').length || 0,
        support: typeData?.filter(t => t.feedback_type === 'support').length || 0
      },
      with_followup: followupCount || 0,
      recent_count: recentCount || 0
    };

    return {
      data: stats,
      success: true
    };
  } catch (error) {
    return {
      data: {
        total: 0,
        by_type: { bug: 0, feature: 0, general: 0, support: 0 },
        with_followup: 0,
        recent_count: 0
      },
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch feedback stats'
    };
  }
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: 'new' | 'in_progress' | 'resolved' | 'closed'
): Promise<ApiResponse<null>> {
  try {
    // Note: This would require adding a status column to the feedback table
    // For now, we'll just return success as the table doesn't have status tracking
    return {
      data: null,
      success: true
    };
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update feedback status'
    };
  }
}

export async function deleteFeedback(feedbackId: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', feedbackId);

    if (error) {
      throw new Error(error.message);
    }

    return {
      data: null,
      success: true
    };
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete feedback'
    };
  }
}
