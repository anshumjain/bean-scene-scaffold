/**
 * Push Notification Settings Component
 * OPT-IN ONLY - Users must explicitly enable push notifications
 * No harassment - only shows when user clicks to enable
 */

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush
} from '@/services/pushNotificationService';

export function PushNotificationSettings() {
  const { toast } = useToast();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const isSupported = isPushNotificationSupported();
      setSupported(isSupported);

      if (isSupported) {
        const perm = getNotificationPermission();
        setPermission(perm);
        
        const isSub = await isSubscribedToPush();
        setSubscribed(isSub);
      }
    } catch (error) {
      console.error('Error checking push status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (toggling) return;

    setToggling(true);
    try {
      if (enabled) {
        // User wants to enable - OPT-IN
        const result = await subscribeToPush();
        
        if (result.success) {
          setSubscribed(true);
          setPermission('granted');
          toast({
            title: 'Push notifications enabled',
            description: 'You\'ll receive notifications for new followers, badges, and more!',
          });
        } else {
          toast({
            title: 'Failed to enable notifications',
            description: result.error || 'Please try again',
            variant: 'destructive',
          });
        }
      } else {
        // User wants to disable
        const result = await unsubscribeFromPush();
        
        if (result.success) {
          setSubscribed(false);
          toast({
            title: 'Push notifications disabled',
            description: 'You won\'t receive push notifications anymore.',
          });
        } else {
          toast({
            title: 'Failed to disable notifications',
            description: result.error || 'Please try again',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setToggling(false);
      await checkStatus();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isEnabled = subscribed && permission === 'granted';
  const isDenied = permission === 'denied';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? (
            <Bell className="h-5 w-5 text-green-500" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified about new followers, badges earned, and level ups
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Enable Push Notifications</span>
              {isEnabled && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              {isDenied && (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isEnabled
                ? 'You\'ll receive notifications even when the app is closed'
                : isDenied
                ? 'Permission denied. Enable in browser settings to receive notifications.'
                : 'Opt-in to receive notifications for important updates'}
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={toggling || isDenied}
          />
        </div>

        {isDenied && (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Permission denied:</strong> To enable push notifications, please allow notifications in your browser settings and try again.
            </p>
          </div>
        )}

        {!isEnabled && !isDenied && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Opt-in only:</strong> We\'ll never send you notifications unless you explicitly enable them. You can disable anytime.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
