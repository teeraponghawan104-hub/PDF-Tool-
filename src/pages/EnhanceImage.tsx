import React, { useState, useRef, useEffect } from 'react';
import { FileUp, Download, CheckCircle2, AlertTriangle, Sparkles, SlidersHorizontal, Image as ImageIcon, Trash2, Plus, X } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  resultUrl: string | null;
}

export default function EnhanceImage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Enhancement settings
  const [contrast, setContrast] = useState(120);
  const [brightness, setBrightness] = useState(100);
  const [grayscale, setGrayscale] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    
    const newImages: ImageItem[] = [];
    const currentCount = images.length;
    let added = 0;

    Array.from(files).forEach((file) => {
      if (currentCount + added >= 20) {
        setError('สามารถอัปโหลดได้สูงสุด 20 ไฟล์พร้อมกัน');
        return;
      }
      if (file.type.startsWith('image/')) {
        const id = Math.random().toString(36).substring(7);
        newImages.push({
          id,
          file,
          previewUrl: URL.createObjectURL(file),
          resultUrl: null,
        });
        added++;
      }
    });

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
      if (!selectedImageId) {
        setSelectedImageId(newImages[0].id);
      }
      setIsCompleted(false);
      setError(null);
    }
  };

  const removeImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages(prev => {
      const newImages = prev.filter(img => img.id !== id);
      if (selectedImageId === id) {
        setSelectedImageId(newImages.length > 0 ? newImages[0].id : null);
      }
      if (newImages.length === 0) {
        setIsCompleted(false);
      }
      return newImages;
    });
  };

  // Cleanup object URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      images.forEach(img => {
        URL.revokeObjectURL(img.previewUrl);
      });
    };
  }, []);

  const processImages = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setIsCompleted(false);

    const updatedImages = [...images];

    try {
      for (let i = 0; i < updatedImages.length; i++) {
        const imgItem = updatedImages[i];
        
        const img = new Image();
        img.src = imgItem.previewUrl;
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        canvas.width = img.width;
        canvas.height = img.height;

        let filterString = `contrast(${contrast}%) brightness(${brightness}%)`;
        if (grayscale) filterString += ' grayscale(100%)';
        ctx.filter = filterString;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Optional: Simple sharpening using convolution matrix could be added here if needed, 
        // but contrast/brightness usually does the trick for documents.

        const dataUrl = canvas.toDataURL(imgItem.file.type || 'image/jpeg', 0.95);
        updatedImages[i].resultUrl = dataUrl;

        setProgress(Math.round(((i + 1) / updatedImages.length) * 100));
        
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      setImages(updatedImages);
      setIsCompleted(true);

    } catch (err: any) {
      console.error('Enhance error:', err);
      setError('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAll = async () => {
    if (images.length === 1 && images[0].resultUrl) {
      // Single file download
      const a = document.createElement('a');
      a.href = images[0].resultUrl;
      a.download = `Enhanced_${images[0].file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Multiple files download as ZIP
      const zip = new JSZip();
      
      images.forEach((img, index) => {
        if (img.resultUrl) {
          // Remove data:image/jpeg;base64, part
          const base64Data = img.resultUrl.split(',')[1];
          const ext = img.file.name.split('.').pop() || 'jpg';
          const name = img.file.name.replace(`.${ext}`, '');
          zip.file(`Enhanced_${name}.${ext}`, base64Data, { base64: true });
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'Enhanced_Images.zip');
    }
  };

  const selectedImage = images.find(img => img.id === selectedImageId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display font-black tracking-tight mb-4 flex items-center justify-center gap-3">
          <Sparkles className="w-10 h-10 text-emerald-500" />
          ปรับความคมชัดรูปภาพ
        </h1>
        <p className="text-gray-600 font-medium">เพิ่มความคมชัด ปรับคอนทราสต์ ความสว่าง รองรับหลายไฟล์พร้อมกัน (สูงสุด 20 ไฟล์)</p>
      </div>

      <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {images.length === 0 ? (
          <div 
            className="border-4 border-dashed border-gray-300 rounded-xl p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <ImageIcon className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold mb-2">เลือกรุปภาพ (1-20 ไฟล์)</h3>
            <p className="text-gray-500 font-medium">หรือลากไฟล์มาวางที่นี่ (รองรับ JPG, PNG, WebP)</p>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column: Image List */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">ไฟล์ที่เลือก ({images.length}/20)</h3>
                {images.length < 20 && !isProcessing && !isCompleted && (
                  <button 
                    onClick={() => addMoreInputRef.current?.click()}
                    className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 border border-black"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มไฟล์
                  </button>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  multiple
                  ref={addMoreInputRef}
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              <div className="flex-1 max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {images.map((img) => (
                  <div 
                    key={img.id}
                    onClick={() => setSelectedImageId(img.id)}
                    className={`flex items-center gap-3 p-2 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedImageId === img.id 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden shrink-0 bg-gray-100">
                      <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{img.file.name}</p>
                      {img.resultUrl && (
                        <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> ประมวลผลแล้ว
                        </p>
                      )}
                    </div>
                    {!isProcessing && !isCompleted && (
                      <button 
                        onClick={(e) => removeImage(img.id, e)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!isProcessing && !isCompleted && (
                <button
                  onClick={() => setImages([])}
                  className="w-full py-2 text-red-600 font-bold border border-red-200 rounded-lg hover:bg-red-50"
                >
                  ล้างไฟล์ทั้งหมด
                </button>
              )}
            </div>

            {/* Right Column: Settings & Preview */}
            <div className="w-full lg:w-2/3 space-y-6">
              {/* Settings */}
              <div className="border-2 border-black rounded-xl p-6 bg-white">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                  <SlidersHorizontal className="w-5 h-5" />
                  ตั้งค่าความคมชัด (ใช้กับทุกไฟล์)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex justify-between font-bold mb-2">
                      <span>ความเข้ม (Contrast)</span>
                      <span>{contrast}%</span>
                    </label>
                    <input 
                      type="range" 
                      min="50" 
                      max="300" 
                      value={contrast}
                      onChange={(e) => {
                        setContrast(Number(e.target.value));
                        setIsCompleted(false);
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <label className="flex justify-between font-bold mb-2">
                      <span>ความสว่าง (Brightness)</span>
                      <span>{brightness}%</span>
                    </label>
                    <input 
                      type="range" 
                      min="50" 
                      max="200" 
                      value={brightness}
                      onChange={(e) => {
                        setBrightness(Number(e.target.value));
                        setIsCompleted(false);
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <input 
                    type="checkbox" 
                    id="grayscale"
                    checked={grayscale}
                    onChange={(e) => {
                      setGrayscale(e.target.checked);
                      setIsCompleted(false);
                    }}
                    className="w-5 h-5 rounded border-2 border-black text-emerald-600 focus:ring-emerald-500"
                    disabled={isProcessing}
                  />
                  <label htmlFor="grayscale" className="font-bold cursor-pointer">
                    แปลงเป็นขาวดำ (แนะนำสำหรับเอกสาร)
                  </label>
                </div>
              </div>

              {/* Live Preview CSS-based */}
              {selectedImage && (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-2 flex flex-col h-[300px]">
                  <h4 className="text-sm font-bold text-gray-500 text-center mb-2">ตัวอย่างภาพ: {selectedImage.file.name}</h4>
                  <div className="flex-1 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center relative">
                    <img 
                      src={selectedImage.previewUrl} 
                      alt="Live Preview" 
                      className="max-w-full max-h-full object-contain"
                      style={{
                        filter: `contrast(${contrast}%) brightness(${brightness}%) ${grayscale ? 'grayscale(100%)' : ''}`
                      }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 text-red-700 border-2 border-red-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              {!isCompleted ? (
                <button
                  onClick={processImages}
                  disabled={isProcessing}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 border-2 border-black transition-all ${
                    isProcessing 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-emerald-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-4 border-gray-400 border-t-gray-600 rounded-full animate-spin"></div>
                      กำลังประมวลผล... {progress}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      ปรับภาพทั้งหมด ({images.length} ไฟล์)
                    </>
                  )}
                </button>
              ) : (
                <div className="p-6 bg-emerald-50 border-2 border-black rounded-xl text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-black">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">ปรับความคมชัดสำเร็จ!</h3>
                    <p className="text-gray-600 font-medium text-sm">รูปภาพทั้งหมดพร้อมสำหรับการดาวน์โหลดแล้ว</p>
                  </div>
                  <button
                    onClick={handleDownloadAll}
                    className="w-full px-8 py-4 bg-black text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 mx-auto hover:bg-gray-800 transition-colors"
                  >
                    <Download className="w-6 h-6" />
                    {images.length > 1 ? 'ดาวน์โหลดทั้งหมด (ZIP)' : 'ดาวน์โหลดรูปภาพ'}
                  </button>
                </div>
              )}

              {isProcessing && (
                <div className="w-full bg-gray-200 rounded-full h-3 border border-black overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-3 transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
