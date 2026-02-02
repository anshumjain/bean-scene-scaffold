/**
 * Push Notification Service
 * Handles Web Push Protocol subscriptions (no third-party accounts needed)
 * OPT-IN ONLY - Users must explicitly enable this
 */

import { supabase } from '@/integrations/supabase/client';
import { getUsername, getDeviceId } from './userService';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (!base64String) {
    throw new Error('VAPID public key is not configured');
  }

  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request push notification permission (OPT-IN ONLY)
 * This will show a browser permission prompt
 */
export async function requestPushPermission(): Promise<{ granted: boolean; error?: string }> {
  if (!('Notification' in window)) {
    return { granted: false, error: 'This browser does not support notifications' };
  }

  if (Notification.permission === 'granted') {
    return { granted: true };
  }

  if (Notification.permission === 'denied') {
    return { granted: false, error: 'Notification permission was previously denied. Please enable it in your browser settings.' };
  }

  try {
    const permission = await Notification.requestPermission();
    return { granted: permission === 'granted' };
  } catch (error: any) {
    return { granted: false, error: error.message || 'Failed to request permission' };
  }
}

/**
 * Subscribe to push notifications (OPT-IN ONLY)
 */
export async function subscribeToPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications are not supported in this browser' };
  }

  if (!VAPID_PUBLIC_KEY) {
    return { success: false, error: 'Push notifications are not configured. Please contact support.' };
  }

  try {
    // First request permission
    const permissionResult = await requestPushPermission();
    if (!permissionResult.granted) {
      return { success: false, error: permissionResult.error || 'Permission denied' };
    }

    // Register service worker
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
    }

    // Save subscription to Supabase
    const saveResult = await saveSubscriptionToDatabase(subscription);
    if (!saveResult.success) {
      return { success: false, error: saveResult.error };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error subscribing to push:', error);
    return { success: false, error: error.message || 'Failed to subscribe to push notifications' };
  }
}

/**
 * Save push subscription to database
 */
async function saveSubscriptionToDatabase(subscription: PushSubscription): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const usernameRes = await getUsername();
    const username = usernameRes.success ? usernameRes.data : null;
    const deviceId = getDeviceId();

    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!)
      }
    };

    // Save to Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user?.id || null,
        device_id: deviceId || null,
        username: username || null,
        subscription: subscriptionData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,device_id,username'
      });

    if (error) {
      console.error('Error saving subscription:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Remove from database
      const { data: { user } } = await supabase.auth.getUser();
      const usernameRes = await getUsername();
      const username = usernameRes.success ? usernameRes.data : null;
      const deviceId = getDeviceId();

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .or(`user_id.eq.${user?.id || 'null'},device_id.eq.${deviceId || 'null'},username.eq.${username || 'null'}`);

      if (error) {
        console.error('Error removing subscription:', error);
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error unsubscribing:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user is currently subscribed
 */
export async function isSubscribedToPush(): Promise<boolean> {
  try {
    if (!isPushNotificationSupported()) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    return false;
  }
}
