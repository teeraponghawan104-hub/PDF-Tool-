import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, FileUp, CheckCircle2, Download, AlertTriangle, ArrowRight } from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import PdfThumbnail from '../components/PdfThumbnail';

export default function RotatePdf() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const [resultPdfBlob, setResultPdfBlob] = useState<Blob | null>(null);
  const [rotation, setRotation] = useState<number>(90);
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

  const rotatePdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      
      pages.forEach(page => {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + rotation));
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
      setResultPdfBlob(blob);
      setResultPdfUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาด หรือไฟล์อาจจะติดรหัสผ่าน');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-12 text-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-black mb-4 text-black text-center">หมุน PDF</h1>
        <p className="text-lg text-gray-600 font-medium">หมุนหน้าไฟล์ PDF ตามเข็ม หรือทวนเข็มนาฬิกา</p>
      </div>

      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="max-w-xl mx-auto border-2 border-dashed rounded-3xl p-12 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 transition border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        >
          <input type="file" ref={fileInputRef} onChange={handleFile} accept=".pdf,application/pdf" className="hidden" />
          <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
            <FileUp className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2">เลือกไฟล์ PDF</h3>
        </div>
      ) : (
        <div className="max-w-xl mx-auto bg-white border-2 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-left">
          <h3 className="font-bold text-lg mb-4 truncate">{file.name}</h3>
          
          <div className="w-full h-80 mb-6 border-2 border-black rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {resultPdfBlob ? (
               <div className="relative group max-w-full max-h-full">
                <PdfThumbnail file={resultPdfBlob} className="max-w-full max-h-full object-contain border border-gray-300 shadow-sm transition-transform duration-300" />
              </div>
            ) : (
              <div className="relative group max-w-full max-h-full">
                <PdfThumbnail file={file} className="max-w-full max-h-full object-contain border border-gray-300 shadow-sm transition-transform duration-300" />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    ตัวอย่างรูปย่อ
                  </div>
                </div>
              </div>
            )}
          </div>

          {!resultPdfUrl ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">ทิศทางการหมุน (ทุกหน้า)</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setRotation(90)} 
                    className={`py-3 px-4 border-2 border-black font-bold rounded-xl flex items-center justify-center gap-2 transition ${rotation === 90 ? 'bg-purple-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]' : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'}`}
                  >
                    <RotateCcw className="w-4 h-4 scale-x-[-1]" /> ตามเข็มนาฬิกา
                  </button>
                  <button 
                    onClick={() => setRotation(270)} 
                    className={`py-3 px-4 border-2 border-black font-bold rounded-xl flex items-center justify-center gap-2 transition ${rotation === 270 ? 'bg-purple-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]' : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'}`}
                  >
                    <RotateCcw className="w-4 h-4" /> ทวนเข็มนาฬิกา
                  </button>
                </div>
              </div>
              <button 
                onClick={rotatePdf}
                disabled={isProcessing}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition"
              >
                {isProcessing ? 'กำลังหมุนไฟล์...' : 'หมุน PDF ตอนนี้!'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="bg-emerald-100 p-4 rounded-xl border-2 border-black flex items-center gap-3">
                 <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                 <span className="font-bold text-emerald-800">หมุนไฟล์สำเร็จแล้ว!</span>
               </div>
               <a 
                 href={resultPdfUrl}
                 download={`rotated_${file.name}`}
                 className="w-full py-4 bg-black hover:bg-neutral-800 text-white font-black rounded-xl border-2 border-black flex items-center justify-center gap-2 transition"
               >
                 <Download className="w-5 h-5" /> ดาวน์โหลด PDF
               </a>
               <button onClick={() => { setFile(null); setResultPdfUrl(null); setResultPdfBlob(null); setPreviewUrl(null); }} className="w-full text-center text-sm font-bold underline text-gray-500">แปลงไฟล์อื่น</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
