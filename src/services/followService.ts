/**
 * User following service
 * Supports both authenticated and anonymous users
 */

import { supabase } from '@/integrations/supabase/client';
import { getUsername, getDeviceId } from './userService';
import { ApiResponse } from './types';

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

/**
 * Get current user's ID from users table
 */
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const currentDeviceId = getDeviceId();
  const currentUsername = await getUsername();
  
  // Try authenticated user first
  if (user) {
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    if (userRecord?.id) return userRecord.id;
  }
  
  // Try by device_id
  if (currentDeviceId) {
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('device_id', currentDeviceId)
      .single();
    if (userRecord?.id) return userRecord.id;
  }
  
  // Try by username
  if (currentUsername?.success && currentUsername.data) {
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('username', currentUsername.data)
      .single();
    if (userRecord?.id) return userRecord.id;
  }
  
  return null;
}

/**
 * Follow a user (by their user ID from users table)
 */
export async function followUser(targetUserId: string): Promise<ApiResponse<Follow>> {
  try {
    const currentUserId = await getCurrentUserId();
    
    if (!currentUserId) {
      return { success: false, error: 'User not found. Please set a username first.' };
    }
    
    if (currentUserId === targetUserId) {
      return { success: false, error: 'Cannot follow yourself' };
    }
    
    // Check if already following
    const { data: existing } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .single();
    
    if (existing) {
      return { success: false, error: 'Already following this user' };
    }
    
    // Create follow relationship
    const { data, error } = await supabase
      .from('user_follows')
      .insert({
        follower_id: currentUserId,
        following_id: targetUserId
      })
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(targetUserId: string): Promise<ApiResponse<boolean>> {
  try {
    const currentUserId = await getCurrentUserId();
    
    if (!currentUserId) {
      return { success: false, error: 'User not found' };
    }
    
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if current user is following a target user
 */
export async function isFollowing(targetUserId: string): Promise<ApiResponse<boolean>> {
  try {
    const currentUserId = await getCurrentUserId();
    
    if (!currentUserId) {
      return { success: true, data: false }; // Not following if user not found
    }
    
    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: !!data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get users that current user is following
 */
export async function getFollowing(): Promise<ApiResponse<Follow[]>> {
  try {
    const currentUserId = await getCurrentUserId();
    
    if (!currentUserId) {
      return { success: true, data: [] };
    }
    
    const { data, error } = await supabase
      .from('user_follows')
      .select('*')
      .eq('follower_id', currentUserId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get users following current user (followers)
 */
export async function getFollowers(): Promise<ApiResponse<Follow[]>> {
  try {
    const currentUserId = await getCurrentUserId();
    
    if (!currentUserId) {
      return { success: true, data: [] };
    }
    
    const { data, error } = await supabase
      .from('user_follows')
      .select('*')
      .eq('following_id', currentUserId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get follow counts for a user (by user ID from users table)
 */
export async function getFollowCounts(userId: string): Promise<ApiResponse<{ followers: number; following: number }>> {
  try {
    const [followersResult, followingResult] = await Promise.all([
      supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId)
    ]);
    
    return {
      success: true,
      data: {
        followers: followersResult.count || 0,
        following: followingResult.count || 0
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
