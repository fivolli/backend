import { Alert, Platform } from 'react-native';

export function showAlert(title: string, message?: string) {
  const safeTitle = String(title || '');
  const safeMessage = message ? String(message) : '';

  if (Platform.OS === 'web') {
    const maybeAlert = (globalThis as { alert?: (text?: string) => void }).alert;
    if (typeof maybeAlert === 'function') {
      maybeAlert(safeMessage ? `${safeTitle}\n\n${safeMessage}` : safeTitle);
      return;
    }
  }

  Alert.alert(safeTitle, safeMessage);
}