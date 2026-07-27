import { ImageFile } from '../types';

/**
 * Loads image dimensions and resolves them.
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        previewUrl,
      });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(previewUrl);
      reject(e);
    };
  });
}

/**
 * Rotates an image and compresses it via modern HTML Canvas API
 */
export function rotateAndOptimizeImage(
  imageFile: ImageFile,
  quality: number = 0.85
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageFile.previewUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not active Canvas direct render context'));
        return;
      }

      const rotationRad = (imageFile.rotation * Math.PI) / 180;
      const isRotatedOrtho = imageFile.rotation === 90 || imageFile.rotation === 270;

      // Determine dimensions after rotation
      const width = isRotatedOrtho ? img.naturalHeight : img.naturalWidth;
      const height = isRotatedOrtho ? img.naturalWidth : img.naturalHeight;

      canvas.width = width;
      canvas.height = height;

      // Draw and rotate from center
      ctx.translate(width / 2, height / 2);
      ctx.rotate(rotationRad);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      // Extract as compressed JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({
        dataUrl,
        width,
        height,
      });
    };
    img.onerror = () => {
      reject(new Error('Failed to render process image'));
    };
  });
}

/**
 * Clean up object URLs to prevent memory leak
 */
export function revokeImageUrls(images: ImageFile[]): void {
  images.forEach(img => {
    if (img.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(img.previewUrl);
    }
  });
}
