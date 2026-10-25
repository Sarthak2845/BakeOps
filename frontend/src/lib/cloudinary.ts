import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { UserFacingError } from './errors';

// Uploads go straight from the app to Cloudinary through an *unsigned upload
// preset*, so no API secret ever ships in the app. Folder, file type and size
// limits are enforced by the preset's settings on the Cloudinary dashboard.
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const MAX_BYTES = 5 * 1024 * 1024;

const NOT_CONFIGURED = 'Logo upload isn’t set up yet. Add the Cloudinary settings to the app’s .env file.';

/** Opens the photo library for a square logo. Resolves null if the user cancels. */
export async function pickLogo(): Promise<ImagePicker.ImagePickerAsset | null> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new UserFacingError(NOT_CONFIGURED);
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
  } catch {
    throw new UserFacingError('Couldn’t open your photos. Check that BakeOps is allowed to access them in Settings.');
  }
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
    throw new UserFacingError('Please pick an image file (JPG or PNG).');
  }
  if (asset.fileSize && asset.fileSize > MAX_BYTES) {
    throw new UserFacingError('That image is too large. Please pick one under 5 MB.');
  }
  return asset;
}

/** Uploads a picked image to Cloudinary and returns its https URL. */
export async function uploadLogo(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new UserFacingError(NOT_CONFIGURED);
  }

  const form = new FormData();
  if (Platform.OS === 'web') {
    // On web the picker returns a File (or a blob: / data: URI we can fetch).
    const file = asset.file ?? (await (await fetch(asset.uri)).blob());
    form.append('file', file);
  } else {
    const name = asset.fileName ?? `logo.${asset.mimeType?.split('/')[1] ?? 'jpg'}`;
    // React Native's FormData accepts { uri, name, type } for local files.
    form.append('file', { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
  }
  form.append('upload_preset', UPLOAD_PRESET);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
  } catch {
    throw new UserFacingError("Couldn't upload the logo. Check your internet connection and try again.");
  }

  const body = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
  if (!res.ok || !body?.secure_url) {
    const reason = body?.error?.message;
    if (res.status === 400 && reason && /size|large/i.test(reason)) {
      throw new UserFacingError('That image is too large. Please pick a smaller one.');
    }
    if (res.status === 400 && reason && /format|file type|invalid image/i.test(reason)) {
      throw new UserFacingError('That file type isn’t supported. Please pick a JPG or PNG.');
    }
    throw new UserFacingError(`Couldn't upload the logo${reason ? `: ${reason}` : '. Please try again.'}`);
  }
  return body.secure_url;
}
