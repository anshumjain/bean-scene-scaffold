/**
 * Notification Bell Component
 * Shows a bell icon with unread count badge and dropdown list
 */

import { useState, useEffect } from 'react';
import { Bell, X, Trophy, UserPlus, TrendingUp, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  getNotifications, 
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Notification,
  NotificationType
} from '@/services/notificationService';
import { formatTimeAgo } from '@/services/utils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const notificationIcons: Record<NotificationType, typeof Bell> = {
  new_follower: UserPlus,
  badge_earned: Trophy,
  new_post_like: Sparkles,
  level_up: TrendingUp,
  milestone_reached: Trophy,
};

const notificationColors: Record<NotificationType, string> = {
  new_follower: 'text-blue-500',
  badge_earned: 'text-yellow-500',
  new_post_like: 'text-pink-500',
  level_up: 'text-green-500',
  milestone_reached: 'text-purple-500',
};

export function NotificationBell() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Load notifications and unread count
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const [notificationsRes, countRes] = await Promise.all([
        getNotifications(20),
        getUnreadNotificationCount(),
      ]);

      if (notificationsRes.success) {
        setNotifications(notificationsRes.data || []);
      }

      if (countRes.success) {
        setUnreadCount(countRes.data || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Set up real-time subscription for new notifications
    let channel: any = null;
    
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const usernameRes = await getUsername();
      const username = usernameRes.success ? usernameRes.data : null;
      const deviceId = getDeviceId();

      // Note: Supabase real-time filters are limited, so we'll listen to all inserts
      // and filter client-side if needed
      channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            // Check if notification is for current user
            const notification = payload.new as any;
            const isForCurrentUser = 
              (user?.id && notification.user_id === user.id) ||
              (deviceId && notification.device_id === deviceId) ||
              (username && notification.username === username);
            
            if (isForCurrentUser) {
              loadNotifications();
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Refresh when popover opens
  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate based on notification type
    if (notification.notification_type === 'badge_earned') {
      navigate('/badges');
    } else if (notification.notification_type === 'new_follower') {
      const username = notification.metadata?.follower_username;
      if (username) {
        navigate(`/profile/${username}`);
      } else {
        navigate('/profile');
      }
    } else if (notification.notification_type === 'level_up') {
      navigate('/profile');
    }

    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsAsRead();
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({
        title: 'All notifications marked as read',
      });
    }
  };

  const Icon = Bell;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Icon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const NotificationIcon = notificationIcons[notification.notification_type] || Bell;
                const iconColor = notificationColors[notification.notification_type] || 'text-muted-foreground';

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                      !notification.read && 'bg-primary/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'rounded-full p-2 bg-muted flex-shrink-0',
                        iconColor
                      )}>
                        <NotificationIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm font-medium',
                              !notification.read && 'font-semibold'
                            )}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => navigate('/profile')}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
