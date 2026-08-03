import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Define the worker root using Vite's URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// WeakMap cache to store generated thumbnail data URLs so they render instantly upon re-ordering
const thumbnailCache = new WeakMap<File | Blob, Record<number, string>>();

// WeakMap cache to store loaded PDF Document promises to prevent loading/parsing the document multiple times
const pdfDocumentCache = new WeakMap<File | Blob, Promise<pdfjsLib.PDFDocumentProxy>>();

const getPdfDoc = (file: File | Blob): Promise<pdfjsLib.PDFDocumentProxy> => {
  let docPromise = pdfDocumentCache.get(file);
  if (!docPromise) {
    docPromise = (async () => {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const loadingTask = pdfjsLib.getDocument({ data });
      return loadingTask.promise;
    })();
    pdfDocumentCache.set(file, docPromise);
  }
  return docPromise;
};

interface PdfThumbnailProps {
  file: File | Blob;
  pageNumber?: number;
  className?: string;
}

export default function PdfThumbnail({ file, pageNumber = 1, className = '' }: PdfThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => {
    return thumbnailCache.get(file)?.[pageNumber] || null;
  });
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If we already have the URL, no need to observe
    if (thumbnailUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect(); // Only need to trigger once
        }
      },
      { rootMargin: '200px' } // Pre-load slightly before it comes into view
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [thumbnailUrl]);

  useEffect(() => {
    const fileCache = thumbnailCache.get(file) || {};
    // If we already have a cached version, do not perform asynchronous re-load
    if (fileCache[pageNumber]) {
      if (thumbnailUrl !== fileCache[pageNumber]) {
        setThumbnailUrl(fileCache[pageNumber]);
      }
      return;
    }

    // Only load if it has come into view
    if (!isInView) return;

    let active = true;
    const loadThumbnail = async () => {
      try {
        const pdf = await getPdfDoc(file);
        const page = await pdf.getPage(pageNumber);
        
        // Use a small scale for thumbnail to keep it fast
        const viewport = page.getViewport({ scale: 0.5 }); 
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        
        if (active) {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const currentCache = thumbnailCache.get(file) || {};
          currentCache[pageNumber] = dataUrl;
          thumbnailCache.set(file, currentCache);
          setThumbnailUrl(dataUrl);
        }
        page.cleanup();
      } catch (err) {
        console.error(`Error generating PDF thumbnail for page ${pageNumber}:`, err);
      }
    };

    loadThumbnail();
    
    return () => {
      active = false;
    };
  }, [file, pageNumber, isInView]);

  if (!thumbnailUrl) {
    return (
      <div ref={containerRef} className={`flex items-center justify-center bg-gray-100 animate-pulse ${className}`}>
        <span className="text-xs text-gray-400 font-bold">กำลังโหลด...</span>
      </div>
    );
  }

  return (
    <img 
      src={thumbnailUrl} 
      alt={`Thumbnail of ${(file as File).name || 'document'}`}
      className={`object-cover ${className}`}
    />
  );
}
