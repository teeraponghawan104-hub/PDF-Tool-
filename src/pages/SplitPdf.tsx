import React, { useState, useRef, useEffect } from 'react';
import { 
  Scissors, 
  FileUp, 
  CheckCircle2, 
  Download, 
  AlertTriangle, 
  Check, 
  Grid, 
  RefreshCw, 
  Layers, 
  FileText,
  SlidersHorizontal
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import PdfThumbnail from '../components/PdfThumbnail';

// Helper function to consolidate an array of sorted numbers (e.g. [1, 2, 3, 5, 8, 9]) into standard range text ("1-3, 5, 8-9")
const formatPageRange = (pages: number[]): string => {
  if (pages.length === 0) return '';
  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      if (start === end) {
        ranges.push(`${start}`);
      } else {
        ranges.push(`${start}-${end}`);
      }
      start = sorted[i];
      end = sorted[i];
    }
  }
  if (start === end) {
    ranges.push(`${start}`);
  } else {
    ranges.push(`${start}-${end}`);
  }
  return ranges.join(', ');
};

// Helper to parse string representation (whitespace, hyphens, and commas) to sorted array of 1-indexed integers
const parsePageRangeToPagesList = (rangeText: string, max: number): number[] => {
  const pages = new Set<number>();
  if (!rangeText) return [];
  const parts = rangeText.split(',').map(p => p.trim());
  
  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const [startPart, endPart] = part.split('-');
      const start = Number(startPart);
      const end = Number(endPart);
      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
        for (let i = start; i <= end; i++) {
          if (i <= max) pages.add(i);
        }
      }
    } else {
      const num = Number(part);
      if (!isNaN(num) && num > 0 && num <= max) {
        pages.add(num);
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
};

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const [resultPdfBlob, setResultPdfBlob] = useState<Blob | null>(null);
  const [pageRange, setPageRange] = useState('');
  const [maxPages, setMaxPages] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
    };
  }, [resultPdfUrl]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
      setFile(f);
      setResultPdfUrl(null);
      setResultPdfBlob(null);
      setErrorMsg('');
      setPageRange('');
      
      try {
        const buffer = await f.arrayBuffer();
        const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const count = pdf.getPageCount();
        setMaxPages(count);
        // Default to selecting all pages initially to make it easy
        const all = Array.from({ length: count }, (_, i) => i + 1);
        setPageRange(formatPageRange(all));
      } catch (err) {
        console.error(err);
        setMaxPages(0);
      }
    }
  };

  const activePages = parsePageRangeToPagesList(pageRange, maxPages);

  const handlePageClick = (pageNo: number) => {
    const currentActive = parsePageRangeToPagesList(pageRange, maxPages);
    let updatedActive: number[];
    if (currentActive.includes(pageNo)) {
      updatedActive = currentActive.filter(p => p !== pageNo);
    } else {
      updatedActive = [...currentActive, pageNo];
    }
    setPageRange(formatPageRange(updatedActive));
    setErrorMsg('');
  };

  const selectAllPages = () => {
    const all = Array.from({ length: maxPages }, (_, i) => i + 1);
    setPageRange(formatPageRange(all));
    setErrorMsg('');
  };

  const clearAllSelected = () => {
    setPageRange('');
    setErrorMsg('');
  };

  const selectOddPages = () => {
    const odd = Array.from({ length: maxPages }, (_, i) => i + 1).filter(p => p % 2 !== 0);
    setPageRange(formatPageRange(odd));
    setErrorMsg('');
  };

  const selectEvenPages = () => {
    const even = Array.from({ length: maxPages }, (_, i) => i + 1).filter(p => p % 2 === 0);
    setPageRange(formatPageRange(even));
    setErrorMsg('');
  };

  const splitPdf = async () => {
    if (!file || activePages.length === 0) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      // pdf-lib copyPages expects 0-indexed values
      const indicesToExtract = activePages.map(pageNo => pageNo - 1);
      
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const newPdf = await PDFDocument.create();
      
      const copiedPages = await newPdf.copyPages(pdfDoc, indicesToExtract);
      copiedPages.forEach(p => newPdf.addPage(p));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
      setResultPdfBlob(blob);
      setResultPdfUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'เกิดข้อผิดพลาดในการแยกไฟล์');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-5xl font-display font-black mb-4 text-black flex items-center justify-center gap-3">
          <Scissors className="w-8 h-8 md:w-10 md:h-10 text-orange-500" /> แยกหน้า PDF
        </h1>
        <p className="text-lg text-gray-600 font-medium max-w-2xl mx-auto">
          เลือกหน้าต่างๆ จากไฟล์ PDF หรือเขียนเป็นตัวเลขช่วงหน้าเพื่อสร้างเป็นไฟล์ใหม่ได้อย่างทันที
        </p>
      </div>

      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="max-w-xl mx-auto border-2 border-dashed rounded-3xl p-16 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-orange-50/50 transition-all border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px]"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFile} 
            accept=".pdf,application/pdf" 
            className="hidden" 
          />
          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
            <FileUp className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black mb-2 text-black">เลือกไฟล์ PDF ที่จะแยกหน้า</h3>
          <p className="text-sm font-semibold text-gray-400">จิ้มที่กล่องนี้เพื่อเปิดคลังไฟล์ของคุณ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* List of Pages with interactive checkboxes & thumbnails */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-black text-black truncate max-w-md sm:max-w-sm md:max-w-md">
                    {file.name}
                  </h2>
                  <p className="text-xs font-bold text-gray-500 font-mono mt-1">
                    ทั้งหมด {maxPages} หน้า • เลือกแล้ว {activePages.length} หน้า
                  </p>
                </div>
                
                {/* Visual Select Presets */}
                <div className="flex flex-wrap gap-1.5 justify-start sm:justify-end">
                  <button 
                    type="button"
                    onClick={selectAllPages}
                    className="px-2.5 py-1.5 text-xs font-black bg-zinc-100 border border-black rounded-lg hover:bg-zinc-200"
                  >
                    ทั้งหมด
                  </button>
                  <button 
                    type="button"
                    onClick={selectOddPages}
                    className="px-2.5 py-1.5 text-xs font-black bg-zinc-100 border border-black rounded-lg hover:bg-zinc-200"
                  >
                    หน้าคี่
                  </button>
                  <button 
                    type="button"
                    onClick={selectEvenPages}
                    className="px-2.5 py-1.5 text-xs font-black bg-zinc-100 border border-black rounded-lg hover:bg-zinc-200"
                  >
                    หน้าคู่
                  </button>
                  <button 
                    type="button"
                    onClick={clearAllSelected}
                    className="px-2.5 py-1.5 text-xs font-black bg-red-100 text-red-700 border border-black rounded-lg hover:bg-red-200"
                  >
                    เคลียร์ด่วน
                  </button>
                </div>
              </div>

              {/* The Page Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-2">
                {Array.from({ length: maxPages }, (_, i) => {
                  const pageNo = i + 1;
                  const isSelected = activePages.includes(pageNo);
                  return (
                    <div 
                      key={pageNo}
                      onClick={() => handlePageClick(pageNo)}
                      className={`group relative border-2 border-black rounded-xl p-3 flex flex-col items-center bg-white aspect-[3/4] justify-between cursor-pointer transition-all select-none hover:translate-y-[-2px] ${
                        isSelected 
                          ? 'ring-4 ring-orange-500/20 bg-orange-50/10 shadow-[4px_4px_0px_0px_rgba(249,115,22,1)] border-orange-500' 
                          : 'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      {/* Checkbox Icon */}
                      <div className={`absolute top-2 right-2 border-2 border-black w-6 h-6 rounded-md flex items-center justify-center transition-colors z-20 ${
                        isSelected ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-transparent'
                      }`}>
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>

                      {/* Large Page Number Indicator */}
                      <div className="absolute top-2 left-2 bg-yellow-300 border border-black rounded-full z-20 w-6 h-6 flex items-center justify-center text-[10px] font-black text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        {pageNo}
                      </div>

                      {/* PDF Thumbnail */}
                      <div className="overflow-hidden rounded border border-gray-200 bg-gray-50 flex items-center justify-center w-full h-[80%] relative pointer-events-none mt-4">
                        <PdfThumbnail 
                          file={file} 
                          pageNumber={pageNo} 
                          className="w-full h-full object-contain pointer-events-none" 
                        />
                      </div>

                      {/* Visual Footer page label */}
                      <span className="text-[11px] font-black pointer-events-none mt-1 text-gray-700">หน้า {pageNo}</span>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Right Action & Control Column */}
          <div className="lg:col-span-4 sticky top-6 space-y-6">
            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-2 border-black pb-3 mb-4 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-orange-500" />
                <h3 className="font-black text-lg text-black">ตั้งค่าการแยกหน้า</h3>
              </div>

              {!resultPdfUrl ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      พิมพ์หมายเลขหน้าที่ต้องการดึงออก
                    </label>
                    <input 
                      type="text"
                      value={pageRange}
                      onChange={(e) => {
                        setPageRange(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="ตัวอย่าง: 1-5, 8, 11-13"
                      className="w-full p-3 border-2 border-black rounded-xl font-black mb-2 font-mono text-lg bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <div className="bg-zinc-50 border border-black/40 rounded-xl p-3 space-y-1.5">
                      <p className="text-xs font-black text-gray-700">วิธีการเขียนและช่วงหน้า:</p>
                      <ul className="text-xs font-semibold text-gray-500 list-disc list-inside space-y-1">
                        <li>ใช้ <span className="font-bold underline text-black">เครื่องหมายลบ (-)</span> เพื่อดึงเป็นช่วง เช่น <span className="font-mono text-black font-extrabold">1-5</span></li>
                        <li>ใช้ <span className="font-bold underline text-black">เครื่องหมายจุลภาค (,)</span> เพื่อเชื่อมกลุ่ม เช่น <span className="font-mono text-black font-extrabold">1, 3, 5-8</span></li>
                      </ul>
                    </div>
                  </div>
                  
                  {errorMsg && (
                    <div className="text-red-500 font-bold text-sm bg-red-50 p-3 rounded-lg border-2 border-red-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> {errorMsg}
                    </div>
                  )}

                  <button 
                    onClick={splitPdf}
                    disabled={isProcessing || activePages.length === 0}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 select-none transition-all flex items-center justify-center gap-2"
                  >
                    <Scissors className="w-5 h-5" />
                    {isProcessing ? 'กำลังประมวลผลดึงไฟล์...' : `แยกเฉพาะที่เลือก (${activePages.length} หน้า)`}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-500/50 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 text-white border-2 border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-emerald-800 text-sm">แยกหน้าสำเร็จแล้ว!</h4>
                      <p className="text-xs font-medium text-emerald-600">ได้คัดแยกออกมาเป็นไฟล์เรียบร้อย</p>
                    </div>
                  </div>

                  <a 
                    href={resultPdfUrl}
                    download={`extracted_${file.name}`}
                    className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl border-2 border-black flex items-center justify-center gap-2 transition shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    <Download className="w-5 h-5" /> ดาวน์โหลดไฟล์แยก
                  </a>

                  <button 
                    type="button"
                    onClick={() => {
                      setResultPdfUrl(null);
                      setResultPdfBlob(null);
                      setErrorMsg('');
                    }} 
                    className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-black font-black text-xs rounded-xl border border-black flex items-center justify-center gap-2 hover:translate-y-[-1px] transition-all"
                  >
                    กลับไปปรับหน้าเพิ่มเติม
                  </button>

                  <button 
                    type="button"
                    onClick={() => { 
                      setFile(null); 
                      setResultPdfUrl(null); 
                      setResultPdfBlob(null); 
                      setPageRange('');
                      setMaxPages(0);
                    }} 
                    className="w-full text-center text-xs font-black underline text-gray-500 hover:text-black block"
                  >
                    เลือกไฟล์ใหม่
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
