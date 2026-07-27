import React, { useState, useRef, useEffect } from 'react';
import { FileText, FileUp, CheckCircle2, Download } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import PdfThumbnail from '../components/PdfThumbnail';

// Define the worker root from CDN so it resolves with correct MIME types reliably
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function CompressPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const [resultPdfBlob, setResultPdfBlob] = useState<Blob | null>(null);
  const [oldSize, setOldSize] = useState(0);
  const [newSize, setNewSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
    };
  }, [previewUrl, resultPdfUrl]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
      setFile(f);
      setOldSize(f.size);
      setPreviewUrl(URL.createObjectURL(f));
      setResultPdfUrl(null);
      setResultPdfBlob(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const compressPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // We use pdfjs-dist to render pages as lower quality JPEGs to actually compress the file
      const loadingTask = pdfjsLib.getDocument({ data });
      const originalPdf = await loadingTask.promise;
      const totalPages = originalPdf.numPages;
      
      const newPdfDoc = await PDFDocument.create();
      
      for (let i = 1; i <= totalPages; i++) {
        const page = await originalPdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Lower scale for compression
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        
        // Convert to JPEG with compression quality
        const imgData = canvas.toDataURL('image/jpeg', 0.6); 
        
      // Add to new PDF
        const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());
        const pdfImage = await newPdfDoc.embedJpg(imgBytes);
        
        const pdfPage = newPdfDoc.addPage([viewport.width, viewport.height]);
        pdfPage.drawImage(pdfImage, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });

        page.cleanup();
      }
      originalPdf.cleanup();
      loadingTask.destroy();
      
      const pdfBytes = await newPdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setNewSize(blob.size);
      setResultPdfBlob(blob);
      setResultPdfUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการรันบีบอัดไฟล์');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-12 text-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-black mb-4 text-black text-center">บีบอัด PDF</h1>
        <p className="text-lg text-gray-600 font-medium">ลดขนาดไฟล์ PDF โดยยังคงคุณภาพไว้</p>
      </div>

      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="max-w-xl mx-auto border-2 border-dashed rounded-3xl p-12 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        >
          <input type="file" ref={fileInputRef} onChange={handleFile} accept=".pdf,application/pdf" className="hidden" />
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
            <FileUp className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2">เลือกเอกสาร PDF</h3>
        </div>
      ) : (
        <div className="max-w-xl mx-auto bg-white border-2 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-left">
          <h3 className="font-bold text-lg mb-2 truncate">{file.name}</h3>
          <p className="text-sm font-bold text-gray-500 mb-6">ขนาดไฟล์ตั้งต้น: {formatFileSize(oldSize)}</p>
          
          <div className="w-full h-80 mb-6 border-2 border-black rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {resultPdfBlob ? (
              <PdfThumbnail file={resultPdfBlob} className="max-w-full max-h-full object-contain border border-gray-300 shadow-sm" />
            ) : (
              <PdfThumbnail file={file} className="max-w-full max-h-full object-contain border border-gray-300 shadow-sm" />
            )}
          </div>

          {!resultPdfUrl ? (
            <button 
              onClick={compressPdf}
              disabled={isProcessing}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition"
            >
              {isProcessing ? 'กำลังบีบอัด...' : 'บีบอัด PDF'}
            </button>
          ) : (
            <div className="space-y-4">
               <div className="bg-emerald-100 p-4 rounded-xl border-2 border-black flex items-center gap-3">
                 <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                 <div>
                   <span className="font-bold text-emerald-800 block">บีบอัดไฟล์สำเร็จแล้ว!</span>
                   <span className="text-sm font-bold text-emerald-700">ขนาดใหม่: {formatFileSize(newSize)} (การลดขนาดขึ้นอยู่กับโครงสร้างไฟล์เดิม)</span>
                 </div>
               </div>
               <a 
                 href={resultPdfUrl}
                 download={`compressed_${file.name}`}
                 className="w-full py-4 bg-black hover:bg-neutral-800 text-white font-black rounded-xl border-2 border-black flex items-center justify-center gap-2 transition"
               >
                 <Download className="w-5 h-5" /> ดาวน์โหลด PDF ที่เล็กลง
               </a>
               <button onClick={() => { setFile(null); setResultPdfUrl(null); setResultPdfBlob(null); setPreviewUrl(null); }} className="w-full text-center text-sm font-bold underline text-gray-500">บีบอัดไฟล์อื่น</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
