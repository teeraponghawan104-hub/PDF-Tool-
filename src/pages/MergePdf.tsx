/**
 * Merge PDF implementation using pdf-lib
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PDFDocument } from 'pdf-lib';
import { FileUp, FileText, CheckCircle2, AlertTriangle, X, Download, Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import PdfThumbnail from '../components/PdfThumbnail';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PdfFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

interface SortableItemProps {
  id: string;
  file: PdfFile;
  index: number;
  moveFile: (i: number, dir: 'up'|'down') => void;
  removeFile: (id: string) => void;
  totalLength: number;
}

const SortableItem: React.FC<SortableItemProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`relative group border-2 border-black rounded-xl p-4 flex flex-col items-center text-center aspect-square justify-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none transition-shadow duration-150 ${
        isDragging ? 'opacity-30 border-dashed bg-slate-50 shadow-none' : 'hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
      }`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-10 touch-none" 
        style={{ touchAction: 'none' }}
      />

      <div className="absolute top-2 left-2 bg-yellow-300 border border-black rounded-full z-20 w-6 h-6 flex items-center justify-center text-xs font-bold text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        {props.index + 1}
      </div>
      
      <div className="overflow-hidden rounded border border-gray-200 mb-2 mt-4 bg-gray-50 flex items-center justify-center w-full h-24 relative pointer-events-none select-none">
        <PdfThumbnail file={props.file.file} className="w-full h-full object-contain pointer-events-none" />
      </div>

      <span className="text-xs font-bold break-all line-clamp-2 w-full px-1 select-none pointer-events-none">{props.file.name}</span>
      
      <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1 p-1 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] pointer-events-auto">
          <button 
            type="button"
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={() => props.moveFile(props.index, 'up')} 
            disabled={props.index === 0} 
            className="w-7 h-7 rounded-lg bg-zinc-50 border border-black flex items-center justify-center disabled:opacity-30 cursor-pointer hover:bg-zinc-100"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-black" />
          </button>
          <button 
            type="button"
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={() => props.moveFile(props.index, 'down')} 
            disabled={props.index === props.totalLength - 1} 
            className="w-7 h-7 rounded-lg bg-zinc-50 border border-black flex items-center justify-center disabled:opacity-30 cursor-pointer hover:bg-zinc-100"
          >
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </button>
          <button 
            type="button"
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={() => props.removeFile(props.file.id)} 
            className="w-7 h-7 rounded-lg bg-red-500 hover:bg-red-600 text-white border border-black flex items-center justify-center cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const DragOverlayItem: React.FC<{ file: PdfFile }> = ({ file }) => {
  return (
    <div className="relative border-2 border-black rounded-xl p-4 flex flex-col items-center text-center aspect-square justify-center bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] pointer-events-none scale-105 rotate-[1deg] opacity-95 cursor-grabbing w-full">
      <div className="overflow-hidden rounded border border-gray-200 mb-2 mt-4 bg-gray-50 flex items-center justify-center w-full h-24 pointer-events-none select-none">
        <PdfThumbnail file={file.file} className="w-full h-full object-contain pointer-events-none" />
      </div>
      <span className="text-xs font-bold break-all line-clamp-2 w-full px-1">{file.name}</span>
    </div>
  );
};

export default function MergePdf() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState('merged_document.pdf');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
    };
  }, [resultPdfUrl]);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4500);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const validFiles = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    
    if (validFiles.length === 0) {
      showToast('กรุณาเลือกไฟล์ PDF เท่านั้น', 'error');
      return;
    }

    const newFiles = validFiles.map((file, i) => ({
      id: `${Date.now()}_${i}`,
      file,
      name: file.name,
      size: file.size
    }));

    setFiles(prev => [...prev, ...newFiles]);
    showToast(`เพิ่มไฟล์ PDF จำนวน ${newFiles.length} ไฟล์`, 'success');
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const moveFile = (index: number, dir: 'up'|'down') => {
    const targetIndex = dir === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    const next = [...files];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setFiles(next);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const mergeFiles = async () => {
    if (files.length < 2) {
      showToast('กรุณาอัปโหลดอย่างน้อย 2 ไฟล์เพื่อรวม', 'warning');
      return;
    }
    
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const fileObj of files) {
        const arrayBuffer = await fileObj.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => {
          mergedPdf.addPage(page);
        });
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
      const url = URL.createObjectURL(blob);
      setResultPdfUrl(url);
      showToast('รวมไฟล์ PDF ลำเร็จแล้ว', 'success');
    } catch (error) {
      console.error(error);
      showToast('เกิดข้อผิดพลาดในการรวมไฟล์', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPdf = () => {
    if (!resultPdfUrl) return;
    const link = document.createElement('a');
    link.href = resultPdfUrl;
    link.download = resultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black ${toast.type === 'error' ? 'bg-red-300' : 'bg-emerald-300'} text-black`}>
              <div className="text-sm font-bold pr-2 break-words flex-1">{toast.message}</div>
              <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="hover:bg-black/10 p-1 rounded transition">
                <X className="w-4 h-4 shrink-0 text-black font-extrabold" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-display font-black tracking-tight mb-4 text-black text-center">รวมไฟล์ PDF</h1>
        <p className="text-lg text-gray-600 font-medium">รวมไฟล์ PDF ตามลำดับที่คุณต้องการ เป็นเรื่องที่ง่ายและรวดเร็วสุดๆ</p>
      </div>

      {files.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`border-2 border-dashed rounded-3xl p-12 md:p-16 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[400px] bg-white border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${
            dragActive ? 'bg-red-50 ring-4 ring-red-500/20' : 'hover:bg-slate-50'
          }`}
        >
          <input type="file" ref={fileInputRef} onChange={e => handleFiles(e.target.files)} multiple accept=".pdf,application/pdf" className="hidden" />
          <div className="w-20 h-20 bg-red-100 text-red-600 border-2 border-black rounded-3xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
            <FileUp className="w-10 h-10" />
          </div>
          <h3 className="font-display font-extrabold text-2xl mb-2">เลือกไฟล์ PDF</h3>
          <p className="text-gray-500 font-medium">หรือลากไฟล์ PDF มาวางที่นี่</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <button onClick={triggerFileInput} className="px-4 py-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white text-black font-bold rounded-xl active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-2">
                <Plus className="w-4 h-4" /> เพิ่มไฟล์อีก
              </button>
              <input type="file" ref={fileInputRef} onChange={e => handleFiles(e.target.files)} multiple accept=".pdf,application/pdf" className="hidden" />
            </div>

            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext 
                items={files.map(f => f.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {files.map((file, i) => (
                      <SortableItem 
                        key={file.id}
                        id={file.id}
                        file={file}
                        index={i}
                        totalLength={files.length}
                        moveFile={moveFile}
                        removeFile={removeFile}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>

              <DragOverlay adjustScale={true}>
                {activeId ? (
                  (() => {
                    const activeFile = files.find(f => f.id === activeId);
                    return activeFile ? <DragOverlayItem file={activeFile} /> : null;
                  })()
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sticky top-24">
              <h2 className="text-lg font-black uppercase mb-4 text-black">เครื่องมือรวมไฟล์</h2>
              <p className="text-xs text-gray-500 font-bold mb-6">คุณเลือกแล้ว {files.length} ไฟล์</p>
              
              {!resultPdfUrl ? (
                <button 
                  onClick={mergeFiles}
                  disabled={isProcessing || files.length < 2}
                  className="w-full py-4 px-4 bg-red-600 hover:bg-red-700 text-white border-2 border-black font-extrabold rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition"
                >
                  {isProcessing ? 'กำลังประมวลผล...' : 'รวมไฟล์ PDF'}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-100 p-3 rounded-lg border-2 border-black flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-emerald-800">เสร็จสมบูรณ์!</span>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700">ชื่อไฟล์ผลลัพธ์</label>
                    <input 
                      type="text" 
                      value={resultFileName}
                      onChange={e => setResultFileName(e.target.value)}
                      className="w-full p-2 border-2 border-black rounded-lg text-xs font-bold"
                    />
                  </div>

                  <button 
                    onClick={downloadPdf}
                    className="w-full py-4 px-4 bg-black hover:bg-neutral-800 text-white border-2 border-black font-extrabold rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.35)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5 text-emerald-400" />
                    ดาวน์โหลด PDF
                  </button>

                  <button 
                    onClick={() => {
                      if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
                      setResultPdfUrl(null);
                      setFiles([]);
                    }}
                    className="w-full py-2 bg-white hover:bg-gray-100 text-black border-2 border-black font-bold text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
                  >
                    ทำรายการใหม่
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