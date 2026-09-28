import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

const openLink = (response: Notifications.NotificationResponse | null) => {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
};

/** Opens the screen a notification points at (`data.url`), including the one that launched the app. */
export function useNotificationDeepLinks(): void {
  useEffect(() => {
    openLink(Notifications.getLastNotificationResponse());
    // Handled once; otherwise a later remount would navigate to it again.
    Notifications.clearLastNotificationResponse();
    const subscription = Notifications.addNotificationResponseReceivedListener(openLink);
    return () => subscription.remove();
  }, []);
}
