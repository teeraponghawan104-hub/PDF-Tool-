/**
 * Universal file downloader and saver optimized for iOS Safari, WebKit, Android, and Desktop.
 */

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isAppleTouch =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  return isAppleTouch;
};

export async function saveOrShareFile({
  blob,
  filename,
  mimeType,
  title,
}: {
  blob: Blob;
  filename: string;
  mimeType?: string;
  title?: string;
}): Promise<{ success: boolean; method: 'share' | 'download' | 'preview' | 'cancelled' }> {
  const type = mimeType || blob.type || 'application/pdf';
  const file = new File([blob], filename, { type });

  // 1. On iOS / iPadOS: Try Web Share API with files first.
  // This triggers the native iOS Share Sheet, giving the user "Save to Files" (บันทึกไปยังแอปไฟล์), AirDrop, LINE, etc.
  if (isIOS() && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: title || filename,
      });
      return { success: true, method: 'share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: true, method: 'cancelled' };
      }
      console.warn('Navigator.share failed on iOS, falling back to direct viewer/download:', err);
    }
  }

  // 2. Fallback on iOS if share sheet failed or not supported:
  if (isIOS()) {
    const url = URL.createObjectURL(blob);
    // For zip files on iOS, trigger direct download link rather than window.open which shows blank page
    if (type.includes('zip') || filename.endsWith('.zip')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return { success: true, method: 'download' };
    }

    const opened = window.open(url, '_blank');
    if (!opened) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    return { success: true, method: 'preview' };
  }

  // 3. For Android, Desktop Chrome/Firefox/Edge: standard programmatic download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { success: true, method: 'download' };
}

export function openFilePreview(blobOrUrl: Blob | string): void {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  window.open(url, '_blank');
}

export async function saveOrShareMultipleFiles({
  files,
  title,
}: {
  files: File[];
  title?: string;
}): Promise<{ success: boolean; method: 'share' | 'cancelled' | 'unsupported' }> {
  if (isIOS() && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({
        files,
        title: title || 'บันทึกรูปภาพทั้งหมด',
      });
      return { success: true, method: 'share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: true, method: 'cancelled' };
      }
      console.warn('Navigator.share failed for multiple files:', err);
    }
  }
  return { success: false, method: 'unsupported' };
}
