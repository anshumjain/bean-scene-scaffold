/**
 * Header Component
 * Contains the notification bell and other header elements
 */

import { NotificationBell } from '@/components/Notification/NotificationBell';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-end px-4">
        <NotificationBell />
      </div>
    </header>
  );
}
