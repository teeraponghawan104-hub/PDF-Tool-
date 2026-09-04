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
      const rawWidth = isRotatedOrtho ? img.naturalHeight : img.naturalWidth;
      const rawHeight = isRotatedOrtho ? img.naturalWidth : img.naturalHeight;

      // Constrain max canvas dimension to 3840px to prevent iOS Safari canvas buffer/memory crashes
      // (Safari limits canvas size to 4096px or 16.7 megapixels)
      const MAX_CANVAS_DIM = 3840;
      let scale = 1;
      if (Math.max(rawWidth, rawHeight) > MAX_CANVAS_DIM) {
        scale = MAX_CANVAS_DIM / Math.max(rawWidth, rawHeight);
      }

      const width = Math.round(rawWidth * scale);
      const height = Math.round(rawHeight * scale);

      canvas.width = width;
      canvas.height = height;

      // Draw and rotate from center
      ctx.translate(width / 2, height / 2);
      ctx.rotate(rotationRad);
      
      const drawW = (isRotatedOrtho ? height : width);
      const drawH = (isRotatedOrtho ? width : height);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

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
