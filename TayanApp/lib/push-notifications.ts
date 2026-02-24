import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export async function initNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (finalStatus !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    (process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '').trim() ||
    (Constants.easConfig as any)?.projectId ||
    (Constants.expoConfig as any)?.extra?.eas?.projectId ||
    undefined;

  if (!projectId) {
    throw new Error(
      'No "projectId" found. Добавь EAS Project ID (UUID) и перезапусти Expo.\n\n' +
        'Варианты:\n' +
        '1) В .env: EXPO_PUBLIC_EAS_PROJECT_ID=<uuid>\n' +
        '2) В app.json: expo.extra.eas.projectId=<uuid>\n\n' +
        'Project ID можно взять на expo.dev → Project → Settings.'
    );
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data || null;
}
