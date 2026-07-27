import React, { useState, useRef, useEffect } from 'react';
import { Unlock, FileUp, CheckCircle2, Download, AlertTriangle } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export default function UnlockPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
    };
  }, [resultPdfUrl]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
      setFile(e.target.files[0]);
      setResultPdfUrl(null);
      setErrorMsg('');
      setPassword('');
    }
  };

  const unlockPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const arrayBuffer = await file.arrayBuffer();
      // pdf-lib's load supports reading encrypted if you provide password. But pdf-lib might not save unencrypted by default, wait it does if no enc options.
      const pdfDoc = await PDFDocument.load(arrayBuffer, { password } as any);
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
      setResultPdfUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      console.error(e);
      setErrorMsg('รหัสผ่านไม่ถูกต้อง หรือไฟล์ไม่รองรับการปลดล็อกด้วยระบบนี้');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-12 text-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-black mb-4 text-black text-center">ปลดล็อก PDF</h1>
        <p className="text-lg text-gray-600 font-medium">นำรหัสผ่านออก เพื่อให้ใช้งานได้ง่ายขึ้น</p>
      </div>

      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="max-w-xl mx-auto border-2 border-dashed rounded-3xl p-12 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        >
          <input type="file" ref={fileInputRef} onChange={handleFile} accept=".pdf,application/pdf" className="hidden" />
          <div className="w-16 h-16 bg-gray-200 text-gray-700 rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
            <FileUp className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2">เลือกไฟล์ PDF ที่ติดรหัส</h3>
        </div>
      ) : (
        <div className="max-w-xl mx-auto bg-white border-2 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-left">
          <h3 className="font-bold text-lg mb-4 truncate">{file.name}</h3>
          
          {!resultPdfUrl ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">รหัสผ่านของไฟล์ PDF</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="พิมพ์รหัสผ่าน..."
                  className="w-full p-3 border-2 border-black rounded-xl font-bold mb-2"
                />
              </div>
              
              {errorMsg && (
                <div className="text-red-500 font-bold text-sm bg-red-50 p-3 rounded-lg border-2 border-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {errorMsg}
                </div>
              )}

              <button 
                onClick={unlockPdf}
                disabled={isProcessing}
                className="w-full py-4 bg-gray-800 hover:bg-gray-900 text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition"
              >
                {isProcessing ? 'กำลังทำงาน...' : 'ปลดล็อก PDF'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="bg-emerald-100 p-4 rounded-xl border-2 border-black flex items-center gap-3">
                 <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                 <span className="font-bold text-emerald-800">ปลดล็อกสำเร็จแล้ว! (ถอดรหัสผ่านแล้ว)</span>
               </div>
               <a 
                 href={resultPdfUrl}
                 download={`unlocked_${file.name}`}
                 className="w-full py-4 bg-black hover:bg-neutral-800 text-white font-black rounded-xl border-2 border-black flex items-center justify-center gap-2 transition"
               >
                 <Download className="w-5 h-5" /> ดาวน์โหลด PDF
               </a>
               <button onClick={() => { setFile(null); setResultPdfUrl(null); }} className="w-full text-center text-sm font-bold underline text-gray-500">ทำไฟล์อื่น</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
