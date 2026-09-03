import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker to use the local same-origin worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

/**
 * Safely loads a PDF document from a File, Blob, or Uint8Array using raw byte buffers.
 * This completely prevents cross-origin worker blocked errors and blob URL fetch failures
 * across mobile browsers, tablets, standalone windows, and shared links.
 */
export async function loadPdfDocument(source: File | Blob | Uint8Array | ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
  let data: Uint8Array;
  if (source instanceof Uint8Array) {
    data = source;
  } else if (source instanceof ArrayBuffer) {
    data = new Uint8Array(source);
  } else {
    const buffer = await source.arrayBuffer();
    data = new Uint8Array(buffer);
  }

  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/standard_fonts/',
  });

  return loadingTask.promise;
}

export { pdfjsLib };
