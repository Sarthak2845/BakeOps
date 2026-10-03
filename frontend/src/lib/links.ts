import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export async function openWhatsApp(phone: string, message: string) {
  const url = `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
  await Linking.openURL(url);
}

export async function openUrl(url: string) {
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
}

export async function copyToClipboard(text: string) {
  await Clipboard.setStringAsync(text);
}
