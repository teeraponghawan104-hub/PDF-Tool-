import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Sparkles, Loader2, AlertTriangle, Send, Copy, Check, RotateCcw, Cpu } from 'lucide-react';
import Markdown from 'react-markdown';

async function optimizeImageForUpload(inputFile: File): Promise<File> {
  if (inputFile.size <= 2 * 1024 * 1024) {
    return inputFile;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(inputFile);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 2048;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(inputFile);
      
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          const optimized = new File([blob], inputFile.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
          });
          resolve(optimized);
        } else {
          resolve(inputFile);
        }
      }, 'image/jpeg', 0.88);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(inputFile);
    };
    img.src = url;
  });
}

const QUICK_PROMPTS = [
  'กรุณาวิเคราะห์และอธิบายทุกอย่างในภาพนี้อย่างละเอียด',
  'ช่วยอ่านและสกัดข้อความทั้งหมดที่ปรากฏในภาพนี้ (OCR)',
  'สรุปใจความสำคัญ ข้อมูลตัวเลข และรายการที่เห็นในภาพ',
  'ช่วยระบุวัตถุ จุดเด่น และสีหลักที่มีอยู่ในภาพนี้',
];

export default function AnalyzeImage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('กรุณาวิเคราะห์รูปภาพนี้อย่างละเอียดและอธิบายสิ่งที่เห็น');
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && (selected.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(selected.name))) {
      setFile(selected);
      setResult(null);
      setError(null);
      
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    } else {
      setError('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (เช่น JPG, PNG, WebP)');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setUsedModel(null);

    try {
      // Optimize large photos on the fly for fast 4G cellular upload
      const readyFile = await optimizeImageForUpload(file);

      const formData = new FormData();
      formData.append('image', readyFile);
      formData.append('prompt', prompt);
      formData.append('model', selectedModel);

      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        
        if (text.includes("Cookie check") || text.includes("aistudio_auth_flow")) {
          throw new Error('เบราว์เซอร์ของคุณบล็อกการทำงานใน iFrame กรุณาคลิกปุ่ม "เปิดในแท็บใหม่ (Open in new tab)" ที่มุมขวาบนเพื่อใช้งานฟีเจอร์นี้');
        }

        throw new Error(res.status === 413 ? 'ขนาดไฟล์รูปภาพใหญ่เกินไป' : 'เซิร์ฟเวอร์ตอบกลับผิดพลาด กรุณากดลองใหม่อีกครั้ง');
      }

      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถวิเคราะห์รูปภาพได้ในขณะนี้');
      }

      setResult(data.result);
      setUsedModel(data.model || selectedModel);
    } catch (err: any) {
      console.error(err);
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ หรือคลิกปุ่ม "เปิดในแท็บใหม่" ที่มุมขวาบน');
      } else {
        setError(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพ');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Title Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border-2 border-indigo-200 text-indigo-800 text-xs md:text-sm font-black px-4 py-1.5 rounded-full mb-3 shadow-[2px_2px_0px_0px_rgba(99,102,241,0.25)]">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          ขับเคลื่อนด้วย Gemini 3.8 Flash
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-black tracking-tight mb-2 flex items-center justify-center gap-3">
          วิเคราะห์รูปภาพด้วย AI
        </h1>
        <p className="text-gray-600 font-medium">อัปโหลดรูปภาพและให้ AI ถอดข้อความ ตรวจสอบวัตถุ และวิเคราะห์ข้อมูลในภาพอย่างแม่นยำ</p>
      </div>

      <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column: Upload & Preview */}
          <div className="flex-1 space-y-6">
            {!file ? (
              <div 
                className="border-4 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors h-full min-h-[320px]"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6 border-2 border-indigo-300">
                  <ImageIcon className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold mb-2">เลือกรูปภาพ</h3>
                <p className="text-gray-500 font-medium text-sm">แตะที่นี่หรือลากไฟล์มาวาง (รองรับ JPG, PNG, WebP)</p>
                <input 
                  type="file" 
                  className="sr-only" 
                  accept="image/*,.png,.jpg,.jpeg,.webp,.heic,.heif"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center min-h-[300px]">
                  {previewUrl && <img src={previewUrl} alt="Preview" className="max-w-full max-h-[400px] object-contain" />}
                  
                  <div className="absolute top-2 right-2 space-x-2">
                    <button 
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl(null);
                        setResult(null);
                        setError(null);
                      }}
                      className="bg-white/95 text-red-600 font-bold px-3 py-1.5 rounded-lg text-sm border-2 border-black hover:bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      disabled={isAnalyzing}
                    >
                      เปลี่ยนรูป
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center font-medium">
                  {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Prompt & Controls */}
          <div className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              {/* Model Choice Pill */}
              <div>
                <label className="block font-bold mb-2 text-sm text-gray-700 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  โมเดล AI ที่ใช้งาน:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-3.8-flash')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all text-left ${
                      selectedModel === 'gemini-3.8-flash'
                        ? 'bg-indigo-100 border-indigo-600 text-indigo-900 shadow-[2px_2px_0px_0px_rgba(79,70,229,0.3)]'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="block font-black">⚡ Gemini 3.8 Flash</span>
                    <span className="text-[10px] text-gray-500">แนะนำ • ฉลาดและแม่นยำ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all text-left ${
                      selectedModel === 'gemini-3.1-flash-lite'
                        ? 'bg-indigo-100 border-indigo-600 text-indigo-900 shadow-[2px_2px_0px_0px_rgba(79,70,229,0.3)]'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="block font-black">🚀 3.1 Flash Lite</span>
                    <span className="text-[10px] text-gray-500">รวดเร็วพิเศษ • ตอบสนองไว</span>
                  </button>
                </div>
              </div>

              {/* Prompt Box */}
              <div>
                <label className="block font-bold mb-1.5 text-sm text-gray-800">
                  คำสั่งในการวิเคราะห์ (Prompt)
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full border-2 border-black rounded-xl p-3 min-h-[90px] focus:ring-0 focus:outline-none focus:border-indigo-600 font-medium text-sm"
                  placeholder="ถามคำถามเกี่ยวกับรูปภาพ หรือระบุสิ่งที่ต้องการให้ AI ตรวจสอบ..."
                  disabled={isAnalyzing}
                ></textarea>
              </div>

              {/* Quick Prompt Chips */}
              <div>
                <p className="text-xs text-gray-500 font-bold mb-1.5">คำสั่งด่วนที่แนะนำ:</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(qp)}
                      disabled={isAnalyzing}
                      className="text-xs bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 border border-gray-300 rounded-lg px-2.5 py-1 transition-colors text-left"
                    >
                      {qp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Box with Retry button */}
              {error && (
                <div className="p-4 bg-red-50 text-red-700 border-2 border-red-300 rounded-xl space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                    <p className="font-medium text-sm">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    ลองกดวิเคราะห์อีกครั้ง
                  </button>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !file}
                className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 border-2 transition-all ${
                  !file
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : isAnalyzing 
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300 cursor-wait' 
                      : 'bg-indigo-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    กำลังประมวลผลด้วย Gemini 3.8...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    เริ่มการวิเคราะห์ด้วย Gemini 3.8
                  </>
                )}
              </button>

              {/* Analysis Result */}
              {result && (
                <div className="mt-4 border-2 border-black rounded-xl overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="bg-indigo-100 border-b-2 border-black px-4 py-2.5 font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-900 text-sm">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>ผลการวิเคราะห์ ({usedModel || selectedModel})</span>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1 text-xs bg-white text-indigo-950 font-bold px-2.5 py-1 rounded border border-black hover:bg-indigo-50 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          คัดลอกแล้ว!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          คัดลอก
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-4 bg-white max-h-[380px] overflow-y-auto prose prose-sm max-w-none custom-scrollbar">
                    <div className="markdown-body">
                      <Markdown>{result}</Markdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

