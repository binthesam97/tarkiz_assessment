import * as Notifications from 'expo-notifications';

// Show notifications while the app is in the foreground too; features decide which events warrant one.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Shows a notification immediately. `url` is an in-app route opened when the user taps it. */
export function showLocalNotification({ title, body, url }: { title: string; body: string; url?: string }): void {
  void Notifications.scheduleNotificationAsync({ content: { title, body, data: url ? { url } : {} }, trigger: null });
}
