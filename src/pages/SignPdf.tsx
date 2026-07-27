import React, { useState, useRef, useEffect } from 'react';
import { FileUp, Download, CheckCircle2, AlertTriangle, PenTool, Eraser, Settings2, Loader2, Image as ImageIcon, Move } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function SignPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [targetPage, setTargetPage] = useState<'first' | 'last' | 'all'>('first');

  // Signature Settings
  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [sigPos, setSigPos] = useState({ x: 0.1, y: 0.1 });
  const [sigScale, setSigScale] = useState(0.25); // 25% of page width
  
  // Dragging state
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const signInputRef = useRef<HTMLInputElement>(null);

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
      loadPreview(fileBuffer, targetPage);
    }
  }, [fileBuffer, targetPage]);

  const loadPreview = async (buffer: ArrayBuffer, pageType: 'first' | 'last' | 'all') => {
    setPreviewLoading(true);
    try {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      let pageNum = 1;
      if (pageType === 'last') {
        pageNum = pdf.numPages;
      }
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 }); // Good quality for preview
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      setPreviewImage(canvas.toDataURL('image/jpeg', 0.8));
    } catch (err: any) {
      console.error("Preview load error", err);
      setError('ไม่สามารถโหลดตัวอย่างหน้ากระดาษได้: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type.startsWith('image/')) {
      const url = URL.createObjectURL(selected);
      setSignatureImage(url);
    }
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (hasDrawn && canvasRef.current) {
      // Crop empty space if needed, but for simplicity we just take the whole canvas
      setSignatureImage(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureImage(null);
  };

  // Drag logic
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  useEffect(() => {
    if (isDragging) {
      const onMove = (e: PointerEvent) => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        
        let x = (e.clientX - dragOffset.x - containerRect.left) / containerRect.width;
        let y = (e.clientY - dragOffset.y - containerRect.top) / containerRect.height;
        
        x = Math.max(0, Math.min(x, 1 - sigScale));
        y = Math.max(0, Math.min(y, 0.95)); // rough bound for bottom
        
        setSigPos({ x, y });
      };
      const onUp = () => setIsDragging(false);
      
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      return () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
    }
  }, [isDragging, dragOffset, sigScale]);

  const processPdf = async () => {
    if (!file || !signatureImage) {
      setError('กรุณาวาดหรืออัปโหลดลายเซ็นของคุณก่อน');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const freshBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(freshBuffer);
      const sigBytes = await fetch(signatureImage).then(res => res.arrayBuffer());
      
      let pdfImage;
      try {
        pdfImage = await pdfDoc.embedPng(sigBytes);
      } catch (e) {
        pdfImage = await pdfDoc.embedJpg(sigBytes);
      }

      const pages = pdfDoc.getPages();
      
      let targetPages: number[] = [];
      if (targetPage === 'first') targetPages = [0];
      else if (targetPage === 'last') targetPages = [pages.length - 1];
      else if (targetPage === 'all') targetPages = Array.from({ length: pages.length }, (_, i) => i);

      for (const pageIndex of targetPages) {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();
        
        const sigWidth = width * sigScale;
        const sigHeight = sigWidth * (pdfImage.height / pdfImage.width);

        const actualX = width * sigPos.x;
        // pdf-lib y=0 is bottom
        const actualY = height - (height * sigPos.y) - sigHeight;

        page.drawImage(pdfImage, {
          x: actualX,
          y: actualY,
          width: sigWidth,
          height: sigHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultPdfUrl(url);

    } catch (err: any) {
      console.error('Signature error:', err);
      setError('เกิดข้อผิดพลาดในการเซ็นเอกสาร: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultPdfUrl) {
      const a = document.createElement('a');
      a.href = resultPdfUrl;
      a.download = `Signed_${file?.name || 'document.pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display font-black tracking-tight mb-4 flex items-center justify-center gap-3">
          <PenTool className="w-10 h-10 text-rose-500" />
          เซ็นเอกสาร PDF
        </h1>
        <p className="text-gray-600 font-medium">เพิ่มลายเซ็นด้วยการลากและวางในตำแหน่งที่คุณต้องการ</p>
      </div>

      <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {!file ? (
          <div 
            className="border-4 border-dashed border-gray-300 rounded-xl p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
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
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center border border-black">
                  <PenTool className="w-6 h-6" />
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
              <div className="p-8 bg-rose-50 border-2 border-black rounded-xl text-center space-y-4">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto border-2 border-black">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">เซ็นเอกสารสำเร็จ!</h3>
                  <p className="text-gray-600 font-medium">ไฟล์ที่ประทับลายเซ็นของคุณพร้อมสำหรับการดาวน์โหลดแล้ว</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                  <button
                    onClick={() => setResultPdfUrl(null)}
                    className="px-6 py-4 bg-white text-black border-2 border-black rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  >
                    แก้ไขตำแหน่งใหม่
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
                {/* Left Column: Settings & Signature Creation */}
                <div className="w-full lg:w-1/3 space-y-6">
                  {/* Target Page Selector */}
                  <div className="border-2 border-black rounded-xl p-5 bg-white">
                    <label className="block font-bold mb-3">หน้าที่ต้องการเซ็น</label>
                    <select 
                      value={targetPage}
                      onChange={(e) => setTargetPage(e.target.value as any)}
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-rose-500 focus:outline-none font-medium bg-white"
                    >
                      <option value="first">เฉพาะหน้าแรก</option>
                      <option value="last">เฉพาะหน้าสุดท้าย</option>
                      <option value="all">ทุกหน้า</option>
                    </select>
                  </div>

                  {/* Signature Creator */}
                  <div className="border-2 border-black rounded-xl p-5 bg-white">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold flex items-center gap-2">
                        สร้างลายเซ็น
                      </h3>
                      <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-300">
                        <button
                          onClick={() => setSignatureMode('draw')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${signatureMode === 'draw' ? 'bg-white shadow-sm border border-gray-200 text-rose-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          วาด
                        </button>
                        <button
                          onClick={() => setSignatureMode('upload')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${signatureMode === 'upload' ? 'bg-white shadow-sm border border-gray-200 text-rose-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          รูปภาพ
                        </button>
                      </div>
                    </div>

                    {signatureMode === 'draw' ? (
                      <div>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden relative touch-none h-[150px]">
                          <canvas
                            ref={canvasRef}
                            width={500}
                            height={150}
                            className="w-full h-full cursor-crosshair bg-transparent"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                          />
                          {!hasDrawn && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 font-medium text-sm">
                              วาดลายเซ็นที่นี่
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-right">
                          <button 
                            onClick={clearSignature}
                            className="text-xs font-bold text-gray-500 hover:text-red-500 flex items-center gap-1 ml-auto"
                          >
                            <Eraser className="w-3 h-3" /> ล้างกระดาน
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 h-[150px] cursor-pointer"
                        onClick={() => signInputRef.current?.click()}
                      >
                        {signatureImage ? (
                          <img src={signatureImage} alt="Signature" className="max-h-[120px] object-contain" />
                        ) : (
                          <>
                            <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="font-bold text-gray-600 text-sm">อัปโหลดลายเซ็น</p>
                            <p className="text-xs text-gray-500 mt-1">แนะนำพื้นหลังโปร่งใส</p>
                          </>
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          ref={signInputRef}
                          onChange={handleSignatureUpload}
                        />
                      </div>
                    )}
                  </div>

                  {/* Size Slider */}
                  <div className="border-2 border-black rounded-xl p-5 bg-white">
                    <label className="block font-bold mb-3 flex items-center justify-between">
                      <span>ขนาดลายเซ็น</span>
                      <span className="text-gray-500 font-medium">{Math.round(sigScale * 100)}%</span>
                    </label>
                    <input 
                      type="range" 
                      min="0.05" 
                      max="0.8" 
                      step="0.01"
                      value={sigScale}
                      onChange={(e) => setSigScale(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-700 border-2 border-red-200 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="font-medium text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={processPdf}
                    disabled={isProcessing || !signatureImage}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 border-2 border-black transition-all ${
                      isProcessing || !signatureImage
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-rose-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        กำลังประมวลผล...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6" />
                        เซ็นเอกสาร
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column: PDF Preview & Drag Area */}
                <div className="w-full lg:w-2/3">
                  <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-4 min-h-[500px] flex items-center justify-center overflow-hidden">
                    {previewLoading ? (
                      <div className="flex flex-col items-center text-gray-400 font-bold">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        กำลังโหลดตัวอย่างหน้ากระดาษ...
                      </div>
                    ) : previewImage ? (
                      <div className="relative inline-block border border-gray-300 shadow-md bg-white select-none max-w-full max-h-[70vh] overflow-hidden" ref={containerRef}>
                        <img src={previewImage} alt="PDF Preview" className="max-h-[70vh] w-auto pointer-events-none" />
                        
                        {signatureImage && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${sigPos.x * 100}%`,
                              top: `${sigPos.y * 100}%`,
                              width: `${sigScale * 100}%`,
                              cursor: isDragging ? 'grabbing' : 'grab',
                              touchAction: 'none'
                            }}
                            onPointerDown={handlePointerDown}
                            className={`group border-2 ${isDragging ? 'border-rose-500 shadow-lg' : 'border-dashed border-rose-500/50 hover:border-rose-500'} bg-white/30 backdrop-blur-[1px]`}
                          >
                            <img src={signatureImage} className="w-full h-auto pointer-events-none" draggable={false} />
                            <div className="absolute -top-3 -right-3 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                              <Move className="w-3 h-3" />
                            </div>
                          </div>
                        )}
                        {!signatureImage && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none">
                            <span className="bg-white px-4 py-2 rounded-lg shadow-sm font-bold text-gray-600 border border-gray-200">
                              วาดหรืออัปโหลดลายเซ็นเพื่อเริ่มจัดวาง
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 font-medium">ไม่พบตัวอย่างกระดาษ</div>
                    )}
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-3 font-medium">
                    ลากลายเซ็นในพื้นที่ด้านบนเพื่อปรับตำแหน่งที่ต้องการเซ็น
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
