import React, { useState, useRef, useEffect } from 'react';
import { Stamp, FileUp, CheckCircle2, Download } from 'lucide-react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import PdfThumbnail from '../components/PdfThumbnail';

export default function WatermarkPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const [resultPdfBlob, setResultPdfBlob] = useState<Blob | null>(null);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
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
      setPreviewUrl(URL.createObjectURL(f));
      setResultPdfUrl(null);
      setResultPdfBlob(null);
    }
  };

  const applyWatermark = async () => {
    if (!file || !watermarkText) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      pdfDoc.registerFontkit(fontkit);
      
      // Load Thai font (Sarabun) via JSDelivr for CORS and Thai character support
      const fontUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Regular.ttf';
      const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      const pages = pdfDoc.getPages();
      
      pages.forEach(page => {
        const { width, height } = page.getSize();
        const textWidth = watermarkText.length * 15; 
        const spacingX = Math.max(textWidth + 150, 200);
        const spacingY = 200;
        
        for (let x = -width; x < width * 2; x += spacingX) {
          for (let y = -height; y < height * 2; y += spacingY) {
            page.drawText(watermarkText, {
              x: x,
              y: y,
              size: 40,
              font: customFont,
              color: rgb(0.7, 0.7, 0.7),
              opacity: 0.3,
              rotate: degrees(45),
            });
          }
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
      setResultPdfBlob(blob);
      setResultPdfUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการโหลดไฟล์');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-12 text-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-black mb-4 text-black text-center">ลายน้ำตัวอักษร</h1>
        <p className="text-lg text-gray-600 font-medium">เพิ่มลายน้ำให้กับไฟล์ PDF ของคุณอย่างปลอดภัย</p>
      </div>

      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="max-w-xl mx-auto border-2 border-dashed rounded-3xl p-12 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        >
          <input type="file" ref={fileInputRef} onChange={handleFile} accept=".pdf,application/pdf" className="hidden" />
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
            <Stamp className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2">เลือกเอกสาร PDF</h3>
        </div>
      ) : (
        <div className="max-w-xl mx-auto bg-white border-2 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-left">
          <h3 className="font-bold text-lg mb-4 truncate">{file.name}</h3>
          
          <div className="w-full h-80 mb-6 border-2 border-black rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {resultPdfBlob ? (
              <div className="relative group max-w-full max-h-full">
                <PdfThumbnail file={resultPdfBlob} className="max-w-full max-h-full object-contain border border-gray-300 shadow-sm" />
              </div>
            ) : (
              <div className="relative group max-w-full max-h-full">
                <PdfThumbnail file={file} className="max-w-full max-h-full object-contain border border-gray-300 shadow-sm opacity-50" />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                  <div className="text-gray-400 font-black text-4xl rotate-45 break-all whitespace-pre-wrap text-center opacity-30 select-none px-4">
                    {watermarkText || 'WATERMARK'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {!resultPdfUrl ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">ข้อความลายน้ำ</label>
                <input 
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="เช่น DRAFT, CONFIDENTIAL"
                  className="w-full p-3 border-2 border-black rounded-xl font-bold mb-2 bg-slate-50"
                />
              </div>

              <button 
                onClick={applyWatermark}
                disabled={isProcessing || !watermarkText}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition"
              >
                {isProcessing ? 'กำลังประทับตรา...' : 'ใส่ลายน้ำ'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="bg-emerald-100 p-4 rounded-xl border-2 border-black flex items-center gap-3">
                 <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                 <span className="font-bold text-emerald-800">ประทับลายน้ำสำเร็จแล้ว!</span>
               </div>
               <a 
                 href={resultPdfUrl}
                 download={`watermarked_${file.name}`}
                 className="w-full py-4 bg-black hover:bg-neutral-800 text-white font-black rounded-xl border-2 border-black flex items-center justify-center gap-2 transition"
               >
                 <Download className="w-5 h-5" /> ดาวน์โหลด PDF ที่มีลายน้ำ
               </a>
               <button onClick={() => { setFile(null); setResultPdfUrl(null); setResultPdfBlob(null); setPreviewUrl(null); }} className="w-full text-center text-sm font-bold underline text-gray-500">ทำไฟล์อื่น</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
