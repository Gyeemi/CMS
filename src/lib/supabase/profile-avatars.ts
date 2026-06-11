import { supabase } from '@/lib/supabase';

function decodeBase64(base64: string) {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(base64);
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  const normalized = base64.replace(/[^A-Za-z0-9+/=]/g, '');

  for (let i = 0; i < normalized.length; i += 4) {
    const enc1 = chars.indexOf(normalized.charAt(i));
    const enc2 = chars.indexOf(normalized.charAt(i + 1));
    const enc3 = chars.indexOf(normalized.charAt(i + 2));
    const enc4 = chars.indexOf(normalized.charAt(i + 3));
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    output += String.fromCharCode(chr1);
    if (enc3 !== 64) output += String.fromCharCode(chr2);
    if (enc4 !== 64) output += String.fromCharCode(chr3);
  }

  return output;
}

function decodeBase64Uri(uri: string) {
  const match = uri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const base64 = match[2];
  const binary = decodeBase64(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, mimeType };
}

function extensionForMime(mimeType: string) {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

export async function uploadProfileAvatar(userId: string, uri: string): Promise<string> {
  let body: Blob | Uint8Array;
  let contentType = 'image/jpeg';
  let extension = 'jpg';

  if (uri.startsWith('data:')) {
    const decoded = decodeBase64Uri(uri);
    if (!decoded) throw new Error('Invalid image data.');
    body = decoded.bytes;
    contentType = decoded.mimeType;
    extension = extensionForMime(decoded.mimeType);
  } else {
    const response = await fetch(uri);
    const blob = await response.blob();
    body = blob;
    contentType = blob.type || 'image/jpeg';
    extension = extensionForMime(contentType);
  }

  const path = `${userId}/avatar.${extension}`;
  const { error } = await supabase.storage.from('profile-avatars').upload(path, body, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from('profile-avatars').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
