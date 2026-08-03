import React, { useState, useRef, useEffect } from 'react';
import { FileText, FileUp, CheckCircle2, Download, Settings2, Info } from 'lucide-react';
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

  // Settings
  const [level, setLevel] = useState<'extreme' | 'recommended' | 'less'>('recommended');

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
      let pdfBytes: Uint8Array;

      // 1. Always do repack first (Fast, Text Mode / Safe Mode)
      // This preserves text, vectors, and structure without rasterizing.
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const repackBytes = await pdfDoc.save({ useObjectStreams: true });
      
      let finalBytes = repackBytes;

      if (level === 'recommended' || level === 'extreme') {
        // Image Mode: Rasterize pages for heavy compression
        const data = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjsLib.getDocument({ data });
        const originalPdf = await loadingTask.promise;
        const totalPages = originalPdf.numPages;
        
        const newPdfDoc = await PDFDocument.create();
        
        // Determine scale and quality based on settings
        const scale = level === 'recommended' ? 3.0 : 2.0;
        const jpegQuality = level === 'recommended' ? 0.85 : 0.65;
        
        for (let i = 1; i <= totalPages; i++) {
          const page = await originalPdf.getPage(i);
          const viewport = page.getViewport({ scale });
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          
          const imgData = canvas.toDataURL('image/jpeg', jpegQuality);
          const imgBytesRes = await fetch(imgData).then(res => res.arrayBuffer());
          const pdfImage = await newPdfDoc.embedJpg(imgBytesRes);
          
          // Add page with original dimensions, not scaled dimensions
          const originalViewport = page.getViewport({ scale: 1.0 });
          const pdfPage = newPdfDoc.addPage([originalViewport.width, originalViewport.height]);
          
          pdfPage.drawImage(pdfImage, {
            x: 0,
            y: 0,
            width: originalViewport.width,
            height: originalViewport.height,
          });
          page.cleanup();
        }
        originalPdf.cleanup();
        loadingTask.destroy();
        
        const rasterBytes = await newPdfDoc.save({ useObjectStreams: true });

        // Smart Fallback: 
        // If the rasterized version is actually smaller, use it.
        // If it's larger (which happens often for text-only PDFs), we fallback to repackBytes to preserve quality and size!
        if (rasterBytes.length < repackBytes.length) {
          finalBytes = rasterBytes;
        } else {
          console.log('Smart fallback activated: rasterizing increased size, falling back to repack.');
        }
      }
      
      const blob = new Blob([finalBytes], { type: 'application/pdf' });
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display font-black tracking-tight mb-4 flex items-center justify-center gap-3">
          <FileUp className="w-10 h-10 text-green-500" />
          บีบอัด PDF
        </h1>
        <p className="text-gray-600 font-medium">ลดขนาดไฟล์ PDF พร้อมตัวเลือกรักษาคุณภาพข้อความสำหรับ PDF แท้</p>
      </div>

      <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-4 border-dashed border-gray-300 rounded-xl p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <input type="file" ref={fileInputRef} onChange={handleFile} accept=".pdf,application/pdf" className="hidden" />
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <FileUp className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold mb-2">เลือกเอกสาร PDF</h3>
            <p className="text-gray-500 font-medium">คลิกหรือลากไฟล์มาวางที่นี่</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50 border-2 border-black rounded-xl">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center border border-black">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-lg truncate max-w-[200px] sm:max-w-xs">{file.name}</h4>
                  <p className="text-sm text-gray-500 font-medium">ขนาดไฟล์ตั้งต้น: {formatFileSize(oldSize)}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setFile(null);
                  setResultPdfUrl(null);
                  setResultPdfBlob(null);
                  setPreviewUrl(null);
                }}
                className="text-sm text-red-600 font-bold hover:underline"
                disabled={isProcessing}
              >
                เลือกไฟล์ใหม่
              </button>
            </div>

            {!resultPdfUrl ? (
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Settings */}
                <div className="w-full lg:w-1/3 space-y-6">
                  <div className="border-2 border-black rounded-xl p-5 bg-white space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Settings2 className="w-5 h-5" />
                      ตั้งค่าการบีบอัด
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="space-y-3">
                          <label className={`block p-4 border-2 rounded-xl cursor-pointer transition-colors ${level === 'extreme' ? 'border-green-500 bg-green-50 shadow-[4px_4px_0px_0px_rgba(34,197,94,1)] -translate-y-1' : 'border-black hover:border-green-500 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'}`}>
                            <div className="flex items-start gap-3">
                              <input 
                                type="radio" 
                                name="level" 
                                value="extreme" 
                                checked={level === 'extreme'} 
                                onChange={() => setLevel('extreme')} 
                                className="mt-1.5 w-4 h-4 text-green-600 accent-green-600 focus:ring-green-600"
                              />
                              <div>
                                <span className="block font-bold text-gray-900 text-lg">บีบอัดสูงสุด (Extreme)</span>
                                <span className="text-sm text-gray-600 font-medium block mt-1">
                                  ขนาดไฟล์เล็กที่สุด คุณภาพพอมองเห็นได้ (แปลงเป็นรูปภาพ)
                                </span>
                              </div>
                            </div>
                          </label>

                          <label className={`block p-4 border-2 rounded-xl cursor-pointer transition-colors ${level === 'recommended' ? 'border-green-500 bg-green-50 shadow-[4px_4px_0px_0px_rgba(34,197,94,1)] -translate-y-1' : 'border-black hover:border-green-500 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'}`}>
                            <div className="flex items-start gap-3">
                              <input 
                                type="radio" 
                                name="level" 
                                value="recommended" 
                                checked={level === 'recommended'} 
                                onChange={() => setLevel('recommended')} 
                                className="mt-1.5 w-4 h-4 text-green-600 accent-green-600 focus:ring-green-600"
                              />
                              <div>
                                <span className="block font-bold text-gray-900 text-lg">บีบอัดแนะนำ (Recommended)</span>
                                <span className="text-sm text-gray-600 font-medium block mt-1">
                                  ขนาดไฟล์เล็กลง คุณภาพยังคงคมชัด (แปลงเป็นรูปภาพความละเอียดสูง)
                                </span>
                              </div>
                            </div>
                          </label>

                          <label className={`block p-4 border-2 rounded-xl cursor-pointer transition-colors ${level === 'less' ? 'border-green-500 bg-green-50 shadow-[4px_4px_0px_0px_rgba(34,197,94,1)] -translate-y-1' : 'border-black hover:border-green-500 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'}`}>
                            <div className="flex items-start gap-3">
                              <input 
                                type="radio" 
                                name="level" 
                                value="less" 
                                checked={level === 'less'} 
                                onChange={() => setLevel('less')} 
                                className="mt-1.5 w-4 h-4 text-green-600 accent-green-600 focus:ring-green-600"
                              />
                              <div>
                                <span className="block font-bold text-gray-900 text-lg">บีบอัดน้อย (Less)</span>
                                <span className="text-sm text-gray-600 font-medium block mt-1">
                                  คุณภาพดั้งเดิม 100% ตัวหนังสือคลุมดำได้ (ลดขนาดด้วยการจัดเรียงข้อมูลใหม่)
                                </span>
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={compressPdf}
                    disabled={isProcessing}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 border-2 border-black transition-all ${
                      isProcessing 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-green-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    {isProcessing ? 'กำลังประมวลผล...' : 'เริ่มบีบอัด PDF'}
                  </button>
                </div>

                {/* Right: Preview */}
                <div className="w-full lg:w-2/3">
                  <div className="w-full h-80 lg:h-full min-h-[400px] border-2 border-black rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <PdfThumbnail file={file} className="max-w-full max-h-full object-contain border border-gray-300 shadow-sm" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-green-50 border-2 border-black rounded-xl text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto border-2 border-black">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">บีบอัดไฟล์สำเร็จ!</h3>
                  <div className="inline-flex items-center gap-4 bg-white px-6 py-3 rounded-xl border-2 border-black shadow-sm font-bold">
                    <div className="text-gray-500 line-through">{formatFileSize(oldSize)}</div>
                    <div className="text-xl text-green-600">👉 {formatFileSize(newSize)}</div>
                  </div>
                </div>
                
                {oldSize === newSize && (
                  <p className="text-sm font-medium text-orange-600 max-w-md mx-auto">
                    * ไฟล์นี้เป็นไฟล์ที่มีขนาดเล็กที่สุดเท่าที่จะทำได้แล้ว ระบบได้เลือกใช้เวอร์ชันที่ชัดที่สุดเพื่อรักษาคุณภาพ
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                  <button
                    onClick={() => {
                      setResultPdfUrl(null);
                      setResultPdfBlob(null);
                    }}
                    className="px-6 py-4 bg-white text-black border-2 border-black rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  >
                    ตั้งค่าใหม่
                  </button>
                  <a
                    href={resultPdfUrl}
                    download={`compressed_${file.name}`}
                    className="w-full sm:w-auto px-8 py-4 bg-black text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                  >
                    <Download className="w-6 h-6" />
                    ดาวน์โหลด PDF
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}