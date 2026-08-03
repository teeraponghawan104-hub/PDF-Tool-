import React, { useState, useRef, useEffect } from 'react';
import { FileUp, Download, CheckCircle2, AlertTriangle, Hash, Settings2, Loader2 } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PageNumbersPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Settings
  const [position, setPosition] = useState('bottom-center'); // top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
  const [startingNumber, setStartingNumber] = useState(1);
  const [margin, setMargin] = useState(30);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setResultPdfUrl(null);
      setError(null);
      try {
        const buffer = await selected.arrayBuffer();
        setFileBuffer(buffer);
      } catch (err) {
        setError('ไม่สามารถอ่านไฟล์ได้');
      }
    } else {
      setError('กรุณาเลือกไฟล์ PDF ที่ถูกต้อง');
    }
  };

  useEffect(() => {
    if (fileBuffer) {
      loadPreview(fileBuffer);
    }
  }, [fileBuffer]);

  const loadPreview = async (buffer: ArrayBuffer) => {
    setPreviewLoading(true);
    try {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      await page.render({ canvasContext: ctx, viewport } as any).promise;
      setPreviewImage(canvas.toDataURL('image/jpeg', 0.8));
    } catch (err: any) {
      console.error("Preview load error", err);
      setError('ไม่สามารถโหลดตัวอย่างหน้ากระดาษได้: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const processPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const text = String(startingNumber + i);
        const textSize = 12;
        const textWidth = helveticaFont.widthOfTextAtSize(text, textSize);

        let x = margin;
        let y = margin;

        // Calculate X
        if (position.includes('center')) {
          x = (width / 2) - (textWidth / 2);
        } else if (position.includes('right')) {
          x = width - margin - textWidth;
        }

        // Calculate Y (pdf-lib origin is bottom-left)
        if (position.includes('top')) {
          y = height - margin - textSize;
        }

        page.drawText(text, {
          x,
          y,
          size: textSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultPdfUrl(url);

    } catch (err: any) {
      console.error('Page Numbers error:', err);
      setError('เกิดข้อผิดพลาดในการใส่เลขหน้า: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultPdfUrl) {
      const a = document.createElement('a');
      a.href = resultPdfUrl;
      a.download = `Numbered_${file?.name || 'document.pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Utility to map position string to absolute CSS classes for preview
  const getPreviewPositionClasses = () => {
    const isTop = position.includes('top');
    const isBottom = position.includes('bottom');
    const isLeft = position.includes('left');
    const isRight = position.includes('right');
    const isCenter = position.includes('center');

    return `absolute ${isTop ? 'top-0' : ''} ${isBottom ? 'bottom-0' : ''} ${isLeft ? 'left-0' : ''} ${isRight ? 'right-0' : ''} ${isCenter ? 'left-1/2 -translate-x-1/2' : ''}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display font-black tracking-tight mb-4 flex items-center justify-center gap-3">
          <Hash className="w-10 h-10 text-cyan-500" />
          ใส่เลขหน้า PDF
        </h1>
        <p className="text-gray-600 font-medium">เพิ่มหมายเลขหน้าลงในเอกสาร PDF ของคุณพร้อมดูตัวอย่างแบบเรียลไทม์</p>
      </div>

      <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {!file ? (
          <div 
            className="border-4 border-dashed border-gray-300 rounded-xl p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mb-6">
              <FileUp className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold mb-2">เลือกไฟล์ PDF</h3>
            <p className="text-gray-500 font-medium">หรือลากไฟล์มาวางที่นี่</p>
            <input 
              type="file" 
              className="hidden" 
              accept="application/pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50 border-2 border-black rounded-xl">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className="w-12 h-12 bg-cyan-100 text-cyan-600 rounded-lg flex items-center justify-center border border-black">
                  <Hash className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-lg truncate max-w-[200px] sm:max-w-xs">{file.name}</h4>
                  <p className="text-sm text-gray-500 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setFile(null);
                  setFileBuffer(null);
                  setPreviewImage(null);
                  setResultPdfUrl(null);
                }}
                className="text-sm text-red-600 font-bold hover:underline"
                disabled={isProcessing}
              >
                เลือกไฟล์ใหม่
              </button>
            </div>

            {resultPdfUrl ? (
              <div className="p-8 bg-cyan-50 border-2 border-black rounded-xl text-center space-y-4">
                <div className="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mx-auto border-2 border-black">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">ใส่เลขหน้าสำเร็จ!</h3>
                  <p className="text-gray-600 font-medium">ไฟล์ของคุณพร้อมสำหรับการดาวน์โหลดแล้ว</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                  <button
                    onClick={() => setResultPdfUrl(null)}
                    className="px-6 py-4 bg-white text-black border-2 border-black rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  >
                    ตั้งค่าใหม่
                  </button>
                  <button
                    onClick={handleDownload}
                    className="w-full sm:w-auto px-8 py-4 bg-black text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                  >
                    <Download className="w-6 h-6" />
                    ดาวน์โหลด PDF
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Column: Settings */}
                <div className="w-full lg:w-1/3 space-y-6">
                  <div className="border-2 border-black rounded-xl p-5 bg-white space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Settings2 className="w-5 h-5" />
                      ตั้งค่าเลขหน้า
                    </h3>
                    
                    <div>
                      <label className="block font-bold mb-3">ตำแหน่ง</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'top-left', label: 'ซ้ายบน' },
                          { id: 'top-right', label: 'ขวาบน' },
                          { id: 'top-center', label: 'กลางบน', colSpan: 2 },
                          { id: 'bottom-left', label: 'ซ้ายล่าง' },
                          { id: 'bottom-right', label: 'ขวาล่าง' },
                          { id: 'bottom-center', label: 'กลางล่าง', colSpan: 2 },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            onClick={() => setPosition(pos.id)}
                            className={`py-2 px-2 text-sm font-bold border-2 rounded-lg transition-colors ${pos.colSpan === 2 ? 'col-span-2' : ''} ${
                              position === pos.id 
                                ? 'bg-cyan-100 border-cyan-500 text-cyan-800' 
                                : 'border-gray-200 hover:border-cyan-300 text-gray-600'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-bold mb-2">เริ่มนับจากเลข</label>
                        <input 
                          type="number" 
                          min="1"
                          value={startingNumber}
                          onChange={(e) => setStartingNumber(Number(e.target.value) || 1)}
                          className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none font-medium"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-2">ระยะขอบ (Margin: {margin}px)</label>
                        <input 
                          type="range" 
                          min="10" 
                          max="100" 
                          value={margin}
                          onChange={(e) => setMargin(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-700 border-2 border-red-200 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="font-medium text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={processPdf}
                    disabled={isProcessing}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 border-2 border-black transition-all ${
                      isProcessing 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-cyan-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        กำลังใส่เลขหน้า...
                      </>
                    ) : (
                      <>
                        <Hash className="w-6 h-6" />
                        ตกลงใส่เลขหน้า
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column: PDF Preview */}
                <div className="w-full lg:w-2/3">
                  <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-4 min-h-[500px] flex items-center justify-center overflow-hidden">
                    {previewLoading ? (
                      <div className="flex flex-col items-center text-gray-400 font-bold">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        กำลังโหลดตัวอย่างหน้ากระดาษ...
                      </div>
                    ) : previewImage ? (
                      <div className="relative inline-block border border-gray-300 shadow-md bg-white max-w-full max-h-[70vh] overflow-hidden">
                        <img src={previewImage} alt="PDF Preview" className="max-h-[70vh] w-auto pointer-events-none" />
                        
                        {/* Page Number Overlay Indicator */}
                        <div 
                          className={`pointer-events-none ${getPreviewPositionClasses()}`}
                          style={{
                            padding: `${margin / 3}px` // scale down margin visually for preview
                          }}
                        >
                          <div className="bg-cyan-500 text-white font-bold px-2 py-1 rounded text-xs shadow-md whitespace-nowrap">
                            หน้า {startingNumber}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 font-medium">ไม่พบตัวอย่างกระดาษ</div>
                    )}
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-3 font-medium">
                    ตัวอย่างตำแหน่งการวางเลขหน้าบนหน้าแรกของเอกสาร
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
