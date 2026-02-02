/**
 * Notification Service
 * Handles user notifications for activities like new followers, badges earned, etc.
 */

import { supabase } from '@/integrations/supabase/client';
import { getUsername, getDeviceId } from './userService';
import { getUserByUsername } from './userService';
import { ApiResponse } from './types';

export type NotificationType = 
  | 'new_follower' 
  | 'badge_earned' 
  | 'new_post_like'
  | 'level_up'
  | 'milestone_reached';

export interface Notification {
  id: string;
  user_id?: string;
  device_id?: string;
  username?: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  metadata?: any;
  read: boolean;
  created_at: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  notificationType: NotificationType,
  title: string,
  message: string,
  targetUserId?: string,
  targetDeviceId?: string,
  targetUsername?: string,
  metadata?: any
): Promise<ApiResponse<Notification>> {
  try {
    // If no target specified, use current user
    let userId = targetUserId;
    let deviceId = targetDeviceId;
    let username = targetUsername;

    if (!userId && !deviceId && !username) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      const usernameRes = await getUsername();
      username = usernameRes.success ? usernameRes.data || undefined : undefined;
      deviceId = getDeviceId();
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId || null,
        device_id: deviceId || null,
        username: username || null,
        notification_type: notificationType,
        title,
        message,
        metadata: metadata || {},
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get notifications for current user
 */
export async function getNotifications(limit: number = 50): Promise<ApiResponse<Notification[]>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const usernameRes = await getUsername();
    const username = usernameRes.success ? usernameRes.data : null;
    const deviceId = getDeviceId();

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by user_id, device_id, or username
    if (user?.id) {
      query = query.eq('user_id', user.id);
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else if (username) {
      query = query.eq('username', username);
    } else {
      return { success: true, data: [] };
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(): Promise<ApiResponse<number>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const usernameRes = await getUsername();
    const username = usernameRes.success ? usernameRes.data : null;
    const deviceId = getDeviceId();

    let query = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('read', false);

    if (user?.id) {
      query = query.eq('user_id', user.id);
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else if (username) {
      query = query.eq('username', username);
    } else {
      return { success: true, data: 0 };
    }

    const { count, error } = await query;

    if (error) {
      return { success: false, error: error.message, data: 0 };
    }

    return { success: true, data: count || 0 };
  } catch (error: any) {
    return { success: false, error: error.message, data: 0 };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<ApiResponse<boolean>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const usernameRes = await getUsername();
    const username = usernameRes.success ? usernameRes.data : null;
    const deviceId = getDeviceId();

    let query = supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);

    if (user?.id) {
      query = query.eq('user_id', user.id);
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else if (username) {
      query = query.eq('username', username);
    } else {
      return { success: true, data: true };
    }

    const { error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification via Supabase Edge Function
 */
async function sendPushNotification(
  subscription: any,
  payload: {
    title: string;
    message: string;
    notification_type?: string;
    url?: string;
    [key: string]: any;
  }
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        subscription: subscription.subscription,
        payload: payload
      }
    });

    if (error) {
      console.error('Error sending push notification:', error);
    }
  } catch (error) {
    console.error('Error invoking push function:', error);
  }
}

/**
 * Create notification for new follower
 */
export async function notifyNewFollower(
  followerUsername: string,
  targetUserId?: string,
  targetDeviceId?: string,
  targetUsername?: string
): Promise<void> {
  // Create in-app notification
  const notificationResult = await createNotification(
    'new_follower',
    'New Follower',
    `@${followerUsername} started following you`,
    targetUserId,
    targetDeviceId,
    targetUsername,
    { follower_username: followerUsername }
  );

  // Send push notification if user is subscribed
  if (notificationResult.success) {
    try {
      let query = supabase.from('push_subscriptions').select('*');
      
      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      } else if (targetDeviceId) {
        query = query.eq('device_id', targetDeviceId);
      } else if (targetUsername) {
        query = query.eq('username', targetUsername);
      } else {
        return; // No way to identify user
      }
      
      const { data: subscriptions } = await query.limit(1).single();

      if (subscriptions) {
        await sendPushNotification(subscriptions, {
          title: 'New Follower',
          message: `@${followerUsername} started following you`,
          notification_type: 'new_follower',
          url: `/profile/${followerUsername}`,
          follower_username: followerUsername
        });
      }
    } catch (error) {
      // Don't fail if push fails
      console.error('Error sending push for new follower:', error);
    }
  }
}

/**
 * Create notification for badge earned
 */
export async function notifyBadgeEarned(
  badgeName: string,
  badgeType: string,
  targetUserId?: string,
  targetDeviceId?: string,
  targetUsername?: string
): Promise<void> {
  // Create in-app notification
  const notificationResult = await createNotification(
    'badge_earned',
    'Badge Earned! 🏆',
    `You earned the "${badgeName}" badge`,
    targetUserId,
    targetDeviceId,
    targetUsername,
    { badge_name: badgeName, badge_type: badgeType }
  );

  // Send push notification if user is subscribed
  if (notificationResult.success) {
    try {
      let query = supabase.from('push_subscriptions').select('*');
      
      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      } else if (targetDeviceId) {
        query = query.eq('device_id', targetDeviceId);
      } else if (targetUsername) {
        query = query.eq('username', targetUsername);
      } else {
        return; // No way to identify user
      }
      
      const { data: subscriptions } = await query.limit(1).single();

      if (subscriptions) {
        await sendPushNotification(subscriptions, {
          title: 'Badge Earned! 🏆',
          message: `You earned the "${badgeName}" badge`,
          notification_type: 'badge_earned',
          url: '/badges',
          badge_name: badgeName,
          badge_type: badgeType
        });
      }
    } catch (error) {
      // Don't fail if push fails
      console.error('Error sending push for badge:', error);
    }
  }
}

/**
 * Create notification for level up
 */
export async function notifyLevelUp(
  newLevel: number,
  targetUserId?: string,
  targetDeviceId?: string,
  targetUsername?: string
): Promise<void> {
  // Create in-app notification
  const notificationResult = await createNotification(
    'level_up',
    'Level Up! ⬆️',
    `You reached level ${newLevel}`,
    targetUserId,
    targetDeviceId,
    targetUsername,
    { level: newLevel }
  );

  // Send push notification if user is subscribed
  if (notificationResult.success) {
    try {
      let query = supabase.from('push_subscriptions').select('*');
      
      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      } else if (targetDeviceId) {
        query = query.eq('device_id', targetDeviceId);
      } else if (targetUsername) {
        query = query.eq('username', targetUsername);
      } else {
        return; // No way to identify user
      }
      
      const { data: subscriptions } = await query.limit(1).single();

      if (subscriptions) {
        await sendPushNotification(subscriptions, {
          title: 'Level Up! ⬆️',
          message: `You reached level ${newLevel}`,
          notification_type: 'level_up',
          url: '/profile',
          level: newLevel
        });
      }
    } catch (error) {
      // Don't fail if push fails
      console.error('Error sending push for level up:', error);
    }
  }
}
