import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, FileUp, CheckCircle2, Download, AlertTriangle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import PdfThumbnail from '../components/PdfThumbnail';

// Define the worker root from CDN so it resolves with correct MIME types reliably
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface ConvertedImage {
  id: string;
  url: string;
  pageNumber: number;
}

export default function PdfToJpg() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [progress, setProgress] = useState(0);
  const [isZipping, setIsZipping] = useState(false);
  const [maxPages, setMaxPages] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      images.forEach(img => URL.revokeObjectURL(img.url));
    };
  }, [previewUrl, images]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      images.forEach(img => URL.revokeObjectURL(img.url));
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setImages([]);
      setErrorMsg('');
      setProgress(0);
      
      try {
        const arrayBuffer = await f.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        setMaxPages(pdf.numPages);
        pdf.cleanup();
        loadingTask.destroy();
      } catch (err) {
        console.error(err);
        setMaxPages(0);
      }
    }
  };

  const convertToJpg = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg('');
    setProgress(0);
    images.forEach(img => URL.revokeObjectURL(img.url));
    setImages([]);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      
      const newImages: ConvertedImage[] = [];
      
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const originalViewport = page.getViewport({ scale: 1.0 });
        // Use high scale to get the clearest possible image, but prevent crashing by capping max pixels (e.g., 4000px)
        let scale = 4.0;
        if (originalViewport.width * scale > 4000 || originalViewport.height * scale > 4000) {
          scale = Math.min(4000 / originalViewport.width, 4000 / originalViewport.height, scale);
        }
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        } as any).promise;
        
        // Use maximum quality (1.0) for the sharpest JPEG output
        const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
        newImages.push({
          id: `page_${i}_${Date.now()}`,
          url: dataUrl,
          pageNumber: i
        });
        
        page.cleanup();
        setProgress(Math.round((i / totalPages) * 100));
      }
      
      pdf.cleanup();
      loadingTask.destroy();
      setImages(newImages);
    } catch (e: any) {
      console.error(e);
      setErrorMsg('เกิดข้อผิดพลาดในการแปลงไฟล์เป็นรูปภาพ หรือไฟล์อาจจะใหญ่เกินไป');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAllAsZip = async () => {
    if (!file || images.length === 0) return;
    setIsZipping(true);
    
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const base64Data = img.url.split(',')[1]; // Get only the base64 part
        zip.file(`page_${img.pageNumber}.jpg`, base64Data, {base64: true});
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = zipUrl;
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      link.download = `${fileNameWithoutExt}_images.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);
    } catch (err) {
      console.error(err);
      setErrorMsg('เกิดข้อผิดพลาดในการสร้างไฟล์ ZIP');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-12 text-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-black mb-4 text-black text-center">PDF เป็น JPG</h1>
        <p className="text-lg text-gray-600 font-medium">แยกหน้าเอกสาร PDF เปลี่ยนแต่ละหน้าให้เป็นรูปภาพ JPG ความละเอียดสูง</p>
      </div>

      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="max-w-xl mx-auto border-2 border-dashed rounded-3xl p-12 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-50 transition border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        >
          <input type="file" ref={fileInputRef} onChange={handleFile} accept=".pdf,application/pdf" className="hidden" />
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2">เลือกไฟล์ PDF ที่ต้องการแปลง</h3>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {previewUrl && images.length === 0 && file && (
            <div className="w-full h-80 md:h-96 border-2 border-black rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
              <PdfThumbnail file={file} className="max-w-full max-h-full object-contain shadow-sm border border-black" />
            </div>
          )}
          <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-left flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 truncate">
              <h3 className="font-bold text-lg truncate">{file.name}</h3>
              <p className="text-sm font-bold text-gray-500">ทั้งหมด {maxPages} หน้า</p>
            </div>
            
            {images.length === 0 && (
              <button 
                onClick={convertToJpg}
                disabled={isProcessing}
                className="w-full md:w-auto py-3 px-8 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition shrink-0"
              >
                {isProcessing ? `กำลังแปลง... ${progress}%` : 'แปลงเป็น JPG'}
              </button>
            )}
            
            {images.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                <button 
                  onClick={downloadAllAsZip}
                  disabled={isZipping}
                  className="w-full sm:w-auto py-3 px-6 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  {isZipping ? 'กำลังรวมไฟล์ ZIP...' : 'ดาวน์โหลดทั้งหมด (ZIP)'}
                </button>
                <button 
                  onClick={() => { setFile(null); images.forEach(img => URL.revokeObjectURL(img.url)); setImages([]); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} 
                  className="w-full sm:w-auto py-3 px-6 bg-white hover:bg-gray-100 text-black font-black rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition shrink-0"
                >
                  เริ่มใหม่ทั้งหมด
                </button>
              </div>
            )}
          </div>
          
          {errorMsg && (
            <div className="text-red-500 font-bold text-sm bg-red-50 p-3 rounded-lg border-2 border-red-200 flex items-center gap-2 text-left">
              <AlertTriangle className="w-4 h-4" /> {errorMsg}
            </div>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 text-left">
              {images.map(img => (
                <div key={img.id} className="bg-white border-2 border-black p-2 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group">
                  <div className="relative aspect-[1/1.4] bg-gray-100 border-2 border-black rounded-lg mb-2 overflow-hidden">
                    <img src={img.url} alt={`Page ${img.pageNumber}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-1">หน้า {img.pageNumber}</span>
                    <a 
                      href={img.url} 
                      download={`page_${img.pageNumber}_${file.name}.jpg`}
                      className="p-1.5 bg-black text-yellow-400 rounded-md hover:bg-neutral-800 transition"
                      title="ดาวน์โหลดหน้านี้"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
