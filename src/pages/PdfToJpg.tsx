import React, { useState, useRef, useEffect } from 'react';
import { 
  Image as ImageIcon, CheckCircle2, Download, AlertTriangle, 
  ExternalLink, Share2, ZoomIn, X, RefreshCw 
} from 'lucide-react';
import { loadPdfDocument } from '../utils/pdfHelper';
import JSZip from 'jszip';
import PdfThumbnail from '../components/PdfThumbnail';
import { 
  saveOrShareFile, 
  saveOrShareMultipleFiles, 
  openFilePreview, 
  isIOS 
} from '../utils/downloadHelper';

interface ConvertedImage {
  id: string;
  blob: Blob;
  url: string;
  pageNumber: number;
  width: number;
  height: number;
}

export default function PdfToJpg() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [progress, setProgress] = useState(0);
  const [isZipping, setIsZipping] = useState(false);
  const [isSharingAll, setIsSharingAll] = useState(false);
  const [maxPages, setMaxPages] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedPreview, setSelectedPreview] = useState<ConvertedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs on cleanup or reset
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      images.forEach(img => URL.revokeObjectURL(img.url));
    };
  }, [previewUrl, images]);

  const resetAll = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    images.forEach(img => URL.revokeObjectURL(img.url));
    setFile(null);
    setPreviewUrl(null);
    setImages([]);
    setErrorMsg('');
    setProgress(0);
    setSelectedPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      
      // Cleanup previous state
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      images.forEach(img => URL.revokeObjectURL(img.url));
      
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setImages([]);
      setErrorMsg('');
      setProgress(0);
      setSelectedPreview(null);
      
      try {
        const pdf = await loadPdfDocument(f);
        setMaxPages(pdf.numPages);
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        setMaxPages(0);
        setErrorMsg('ไม่สามารถเปิดไฟล์ PDF นี้ได้ กรุณาตรวจสอบว่าเป็นไฟล์ PDF ที่สมบูรณ์');
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
      const pdf = await loadPdfDocument(file);
      const totalPages = pdf.numPages;
      const newImages: ConvertedImage[] = [];
      
      const iOSDevice = isIOS();
      // On iOS WebKit, memory is constrained to prevent tab crash/reloads
      const maxDimension = iOSDevice ? 1600 : 2400;
      const baseScale = iOSDevice ? 1.5 : 2.0;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const originalViewport = page.getViewport({ scale: 1.0 });
        
        let scale = baseScale;
        if (originalViewport.width * scale > maxDimension || originalViewport.height * scale > maxDimension) {
          scale = Math.min(maxDimension / originalViewport.width, maxDimension / originalViewport.height, scale);
        }
        
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          page.cleanup();
          continue;
        }
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Fill background with white to avoid transparent areas appearing dark/black in JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        } as any).promise;
        
        // Convert canvas directly to Blob to avoid heavy base64 strings in memory
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error(`ไม่สามารถแปลงหน้า ${i} เป็นรูปภาพได้`));
            },
            'image/jpeg',
            0.92
          );
        });

        // Immediately free canvas backing store from GPU memory
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();

        const objectUrl = URL.createObjectURL(blob);
        newImages.push({
          id: `page_${i}_${Date.now()}`,
          blob,
          url: objectUrl,
          pageNumber: i,
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        });
        
        setProgress(Math.round((i / totalPages) * 100));
        
        // Yield to browser event loop for GC on iOS/mobile
        await new Promise(r => setTimeout(r, 20));
      }
      
      setImages(newImages);
    } catch (e: any) {
      console.error('Conversion failed:', e);
      setErrorMsg(e.message || 'เกิดข้อผิดพลาดในการแปลงไฟล์เป็นรูปภาพ หรือไฟล์อาจจะใหญ่เกินไป');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSingleImage = async (img: ConvertedImage) => {
    if (!file) return;
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    const filename = `${fileNameWithoutExt}_page_${img.pageNumber}.jpg`;
    
    try {
      await saveOrShareFile({
        blob: img.blob,
        filename,
        mimeType: 'image/jpeg',
        title: `หน้า ${img.pageNumber} - ${file.name}`,
      });
    } catch (err) {
      console.error('Error downloading image:', err);
      openFilePreview(img.url);
    }
  };

  const handleShareOrSaveAll = async () => {
    if (!file || images.length === 0) return;
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");

    // If on iOS or mobile device that supports sharing multiple files:
    if (isIOS() && typeof navigator !== 'undefined' && (navigator as any).canShare) {
      setIsSharingAll(true);
      try {
        const imageFiles = images.map(img => 
          new File([img.blob], `${fileNameWithoutExt}_page_${img.pageNumber}.jpg`, { type: 'image/jpeg' })
        );
        
        const result = await saveOrShareMultipleFiles({
          files: imageFiles,
          title: `${fileNameWithoutExt} (${images.length} รูปภาพ)`,
        });

        if (result.method === 'share' || result.method === 'cancelled') {
          setIsSharingAll(false);
          return;
        }
      } catch (err) {
        console.warn('Share all failed, falling back to ZIP:', err);
      } finally {
        setIsSharingAll(false);
      }
    }

    // Default or fallback: Download ZIP
    await downloadAllAsZip();
  };

  const downloadAllAsZip = async () => {
    if (!file || images.length === 0) return;
    setIsZipping(true);
    
    try {
      const zip = new JSZip();
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        zip.file(`${fileNameWithoutExt}_page_${img.pageNumber}.jpg`, img.blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      await saveOrShareFile({
        blob: content,
        filename: `${fileNameWithoutExt}_images.zip`,
        mimeType: 'application/zip',
        title: `${fileNameWithoutExt}_images.zip`,
      });
    } catch (err: any) {
      console.error('Error generating zip:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการสร้างไฟล์ ZIP');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-12 text-center">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-black mb-4 text-black text-center">PDF เป็น JPG</h1>
        <p className="text-lg text-gray-600 font-medium max-w-2xl mx-auto">
          แยกหน้าเอกสาร PDF เปลี่ยนแต่ละหน้าให้เป็นรูปภาพ JPG ความละเอียดสูง รองรับ iPhone, iPad และทุกอุปกรณ์
        </p>
      </div>

      {!file ? (
        <label 
          htmlFor="pdf-file-input"
          className="max-w-xl mx-auto border-2 border-dashed rounded-3xl p-10 md:p-14 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-50 transition-all border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] block"
        >
          <input 
            id="pdf-file-input"
            type="file" 
            ref={fileInputRef} 
            onChange={handleFile} 
            accept=".pdf,application/pdf" 
            className="sr-only" 
          />
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-black">เลือกไฟล์ PDF ที่ต้องการแปลง</h3>
          <p className="text-sm text-gray-500 font-medium mb-4">คลิกหรือแตะที่นี่เพื่อเลือกไฟล์ PDF จากเครื่องของคุณ</p>
          <span className="py-2.5 px-6 bg-yellow-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] pointer-events-none">
            เลือกไฟล์ PDF
          </span>
        </label>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* File thumbnail before conversion */}
          {previewUrl && images.length === 0 && (
            <div className="w-full h-80 md:h-96 border-2 border-black rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
              <PdfThumbnail file={file} className="max-w-full max-h-full object-contain shadow-sm border border-black" />
            </div>
          )}

          {/* Action Bar */}
          <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-left flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 truncate w-full md:w-auto">
              <h3 className="font-bold text-lg truncate text-black">{file.name}</h3>
              <p className="text-sm font-bold text-gray-500">
                {maxPages > 0 ? `เอกสารทั้งหมด ${maxPages} หน้า` : 'กำลังอ่านเอกสาร...'}
              </p>
            </div>
            
            {images.length === 0 && (
              <button 
                type="button"
                onClick={convertToJpg}
                disabled={isProcessing || maxPages === 0}
                className="w-full md:w-auto py-3 px-8 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition shrink-0 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>กำลังแปลง... {progress}%</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    <span>แปลงเป็น JPG</span>
                  </>
                )}
              </button>
            )}
            
            {images.length > 0 && (
              <div className="flex flex-wrap sm:flex-nowrap gap-2.5 w-full md:w-auto shrink-0">
                {/* Save/Share all button */}
                <button 
                  type="button"
                  onClick={handleShareOrSaveAll}
                  disabled={isSharingAll || isZipping}
                  className="flex-1 sm:flex-none py-3 px-5 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm"
                  title="บันทึกรูปภาพทั้งหมดลงในเครื่อง"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{isSharingAll ? 'กำลังเปิดหน้าต่างแชร์...' : 'บันทึกรูปทั้งหมด'}</span>
                </button>

                {/* Download ZIP button */}
                <button 
                  type="button"
                  onClick={downloadAllAsZip}
                  disabled={isZipping || isSharingAll}
                  className="flex-1 sm:flex-none py-3 px-5 bg-amber-200 hover:bg-amber-300 text-black font-black rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm"
                  title="ดาวน์โหลดไฟล์ ZIP ที่รวมทุกรูปภาพ"
                >
                  <Download className="w-4 h-4" />
                  <span>{isZipping ? 'กำลังรวม ZIP...' : 'โหลดเป็น ZIP'}</span>
                </button>

                {/* Reset button */}
                <button 
                  type="button"
                  onClick={resetAll} 
                  className="w-full sm:w-auto py-3 px-4 bg-white hover:bg-gray-100 text-black font-black rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition shrink-0 text-sm"
                >
                  เริ่มใหม่
                </button>
              </div>
            )}
          </div>
          
          {errorMsg && (
            <div className="text-red-600 font-bold text-sm bg-red-50 p-4 rounded-xl border-2 border-red-300 flex items-center gap-2 text-left shadow-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" /> 
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Converted images list */}
          {images.length > 0 && (
            <div className="space-y-4">
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 font-bold flex items-center justify-between text-left">
                <span>แปลงเสร็จสิ้นแล้ว {images.length} หน้า — คุณสามารถแตะปุ่ม "บันทึก" ใต้แต่ละรูป หรือแตะเพื่อดูภาพขนาดเต็มได้ทันที</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-left">
                {images.map(img => (
                  <div key={img.id} className="bg-white border-2 border-black p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <div 
                      onClick={() => setSelectedPreview(img)}
                      className="relative aspect-[1/1.4] bg-gray-50 border-2 border-black rounded-xl mb-3 overflow-hidden cursor-pointer group"
                      title="แตะเพื่อดูรูปภาพขนาดเต็ม"
                    >
                      <img 
                        src={img.url} 
                        alt={`Page ${img.pageNumber}`} 
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200" 
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                        <div className="w-9 h-9 rounded-full bg-white/90 border border-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                          <ZoomIn className="w-4 h-4 text-black" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200">
                      <span className="text-xs font-black text-black">หน้า {img.pageNumber}</span>
                      
                      <div className="flex items-center gap-1.5">
                        <button 
                          type="button"
                          onClick={() => setSelectedPreview(img)}
                          className="p-2 bg-gray-100 hover:bg-gray-200 text-black rounded-lg border border-black transition flex items-center justify-center"
                          title="ดูรูปภาพขนาดเต็ม"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          type="button"
                          onClick={() => downloadSingleImage(img)}
                          className="py-1.5 px-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs rounded-lg border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition flex items-center gap-1"
                          title="บันทึกรูปนี้ลงในเครื่อง"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>บันทึก</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Size Image Preview Modal */}
      {selectedPreview && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedPreview(null)}
        >
          <div 
            className="bg-white border-2 border-black rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b-2 border-black flex items-center justify-between bg-yellow-400">
              <h4 className="font-black text-base text-black">
                ตัวอย่างหน้า {selectedPreview.pageNumber} ({selectedPreview.width} x {selectedPreview.height} px)
              </h4>
              <button 
                type="button"
                onClick={() => setSelectedPreview(null)}
                className="w-8 h-8 rounded-lg bg-white border border-black flex items-center justify-center text-black hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center min-h-[300px]">
              <img 
                src={selectedPreview.url} 
                alt={`Page ${selectedPreview.pageNumber}`} 
                className="max-w-full max-h-[60vh] object-contain rounded-lg border border-black shadow-md"
              />
            </div>

            <div className="p-4 border-t-2 border-black bg-white flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500 font-medium">
                บน iPhone/iPad: สามารถแตะค้างที่รูปภาพเพื่อเลือก "บันทึกไปยังรูปภาพ" ได้โดยตรง
              </span>
              <button 
                type="button"
                onClick={() => downloadSingleImage(selectedPreview)}
                className="py-2.5 px-5 bg-yellow-400 hover:bg-yellow-500 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition flex items-center gap-2 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>บันทึกรูปนี้</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
