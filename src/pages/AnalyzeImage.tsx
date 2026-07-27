import React, { useState, useRef } from 'react';
import { FileUp, Image as ImageIcon, Sparkles, Loader2, AlertTriangle, Send } from 'lucide-react';
import Markdown from 'react-markdown';

export default function AnalyzeImage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('กรุณาวิเคราะห์รูปภาพนี้อย่างละเอียด');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type.startsWith('image/')) {
      setFile(selected);
      setResult(null);
      setError(null);
      
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    } else {
      setError('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (เช่น JPG, PNG)');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('prompt', prompt);

      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze image');
      }

      setResult(data.result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพ');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display font-black tracking-tight mb-4 flex items-center justify-center gap-3">
          <Sparkles className="w-10 h-10 text-emerald-500" />
          วิเคราะห์รูปภาพด้วย AI
        </h1>
        <p className="text-gray-600 font-medium">อัปโหลดรูปภาพและให้ Gemini ช่วยวิเคราะห์รายละเอียดภายในภาพ</p>
      </div>

      <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column: Upload & Image */}
          <div className="flex-1 space-y-6">
            {!file ? (
              <div 
                className="border-4 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors h-full min-h-[300px]"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                  <ImageIcon className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold mb-2">เลือกรุปภาพ</h3>
                <p className="text-gray-500 font-medium">หรือลากไฟล์มาวางที่นี่ (รองรับ JPG, PNG, WebP)</p>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
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
                      }}
                      className="bg-white/90 text-red-600 font-bold px-3 py-1 rounded-lg text-sm border border-gray-300 hover:bg-white"
                      disabled={isAnalyzing}
                    >
                      เปลี่ยนรูป
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Prompt & Results */}
          <div className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              <div>
                <label className="block font-bold mb-2 text-lg">คำสั่ง (Prompt)</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full border-2 border-black rounded-xl p-4 min-h-[100px] focus:ring-0 focus:outline-none focus:border-emerald-500 font-medium"
                  placeholder="ถามคำถามเกี่ยวกับรูปภาพ หรือให้ AI ช่วยวิเคราะห์..."
                  disabled={isAnalyzing || !file}
                ></textarea>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-700 border-2 border-red-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !file}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 border-2 transition-all ${
                  !file
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : isAnalyzing 
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300 cursor-wait' 
                      : 'bg-emerald-400 text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    กำลังวิเคราะห์...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    เริ่มการวิเคราะห์
                  </>
                )}
              </button>

              {result && (
                <div className="mt-6 border-2 border-black rounded-xl overflow-hidden flex flex-col max-h-[400px]">
                  <div className="bg-emerald-100 border-b-2 border-black p-3 font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    ผลการวิเคราะห์
                  </div>
                  <div className="p-4 bg-white overflow-y-auto flex-1 prose prose-sm max-w-none custom-scrollbar">
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
