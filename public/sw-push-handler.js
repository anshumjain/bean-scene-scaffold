// Service Worker Push Notification Handler
// This file is loaded by the service worker to handle push events

self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: 'Bean Scene',
    body: 'You have a new notification',
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    tag: 'default',
    data: {},
    requireInteraction: false
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || 'Bean Scene',
        body: data.message || data.body || 'You have a new notification',
        icon: data.icon || '/placeholder.svg',
        badge: data.badge || '/placeholder.svg',
        tag: data.tag || data.notification_type || 'default',
        data: data,
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || []
      };
    } catch (e) {
      // If data is not JSON, try text
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    requireInteraction: notificationData.requireInteraction,
    actions: notificationData.actions
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  let urlToOpen = '/feed';
  
  // Determine URL based on notification type
  if (data.notification_type === 'badge_earned') {
    urlToOpen = '/badges';
  } else if (data.notification_type === 'new_follower' && data.follower_username) {
    urlToOpen = `/profile/${data.follower_username}`;
  } else if (data.notification_type === 'level_up') {
    urlToOpen = '/profile';
  } else if (data.url) {
    urlToOpen = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  // Could track notification dismissal here if needed
});
