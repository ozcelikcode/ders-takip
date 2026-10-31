import { maxProfileImageLength } from '@study-tracker/contracts';

const side = 256;

/**
 * Turns a chosen picture into a small square-bounded JPEG data URL (at most 256 px on the longer side),
 * so the stored profile image stays far below the server limit. Rejects when the result is still too large.
 */
export async function shrinkProfileImage(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available');
    // JPEG has no transparency; a white base keeps transparent PNG areas from turning black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    if (dataUrl.length > maxProfileImageLength) throw new Error('Profile image is still too large');
    return dataUrl;
  } finally {
    bitmap.close();
  }
}
