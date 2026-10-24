import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { UserFacingError } from './errors';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export async function openWhatsApp(phone: string, message: string) {
  const url = `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
  try {
    await Linking.openURL(url);
  } catch {
    throw new UserFacingError('Couldn’t open WhatsApp. Make sure it is installed and try again.');
  }
}

export async function openUrl(url: string) {
  const canOpen = await Linking.canOpenURL(url).catch(() => false);
  if (!canOpen) {
    throw new UserFacingError(
      url.startsWith('tel:') ? 'This device can’t make phone calls.' : 'Couldn’t open that link on this device.'
    );
  }
  try {
    await Linking.openURL(url);
  } catch {
    throw new UserFacingError('Couldn’t open that link on this device.');
  }
}

export async function copyToClipboard(text: string) {
  try {
    await Clipboard.setStringAsync(text);
  } catch {
    throw new UserFacingError('Couldn’t copy to the clipboard.');
  }
}
