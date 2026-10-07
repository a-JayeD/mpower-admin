import { useCallback, useEffect, useState } from 'react';

const KEY = 'mpower-notified-day';

/** Free, local browser notifications (no SMS / email APIs). */
export function useBrowserNotifications() {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : 'denied');

  useEffect(() => {
    if (supported) setPermission(Notification.permission);
  }, [supported]);

  const request = useCallback(async () => {
    if (!supported) return;
    setPermission(await Notification.requestPermission());
  }, [supported]);

  /** Shows at most one summary notification per day per browser. */
  const notifyOncePerDay = useCallback((day: string, title: string, body: string) => {
    if (!supported || Notification.permission !== 'granted') return;
    try {
      if (localStorage.getItem(KEY) === day) return;
      localStorage.setItem(KEY, day);
    } catch {
      /* storage unavailable: still notify */
    }
    new Notification(title, { body, icon: '/favicon.svg', tag: `mpower-${day}` });
  }, [supported]);

  return { supported, permission, request, notifyOncePerDay };
}
