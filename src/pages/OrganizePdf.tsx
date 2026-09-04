import React, { useState, useRef, useEffect } from 'react';
import { FileUp, Download, CheckCircle2, AlertTriangle, LayoutGrid, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { loadPdfDocument } from '../utils/pdfHelper';
import { saveOrShareFile, openFilePreview } from '../utils/downloadHelper';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import PdfThumbnail from '../components/PdfThumbnail';

interface PageItem {
  id: string;
  originalIndex: number;
}

function SortablePage({ id, item, pageNum, file, onRemove }: { id: string, item: PageItem, pageNum: number, file: File, onRemove: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative group bg-white border-2 rounded-xl p-3 transition-colors ${isDragging ? 'border-teal-500 shadow-xl opacity-80' : 'border-gray-200 hover:border-teal-400'}`}
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onRemove(id);
        }}
        className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-600 shadow-lg"
        title="ลบหน้านี้"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex flex-col items-center">
        <div className="w-full aspect-[1/1.414] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm flex items-center justify-center pointer-events-none">
          <PdfThumbnail file={file} pageNumber={item.originalIndex + 1} className="w-full h-full object-contain" />
        </div>
        <div className="mt-3 font-bold text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-full">หน้า {pageNum}</div>
      </div>
    </div>
  );
}

export default function OrganizePdf() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const [resultPdfBlob, setResultPdfBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && (selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf'))) {
      setFile(selected);
      setResultPdfUrl(null);
      setResultPdfBlob(null);
      setError(null);
      await loadPdfPages(selected);
    } else {
      setError('กรุณาเลือกไฟล์ PDF ที่ถูกต้อง');
    }
  };

  const loadPdfPages = async (pdfFile: File) => {
    setIsLoadingPages(true);
    setLoadProgress(0);
    setPages([]);
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      setFileBuffer(arrayBuffer);
      
      const pdf = await loadPdfDocument(arrayBuffer);
      const numPages = pdf.numPages;
      const newPages: PageItem[] = [];

      for (let i = 1; i <= numPages; i++) {
        newPages.push({
          id: `page-${i}-${Math.random().toString(36).substr(2, 9)}`,
          originalIndex: i - 1, // 0-indexed for pdf-lib
        });
      }

      setPages(newPages);
      pdf.cleanup();
    } catch (err: any) {
      console.error('Error loading PDF:', err);
      setError('ไม่สามารถโหลดหน้า PDF ได้: ' + (err.message || 'Unknown error'));
      setFile(null);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemovePage = (id: string) => {
    setPages(items => items.filter(item => item.id !== id));
  };

  const processPdf = async () => {
    if (!file || !fileBuffer || pages.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const originalPdf = await PDFDocument.load(fileBuffer);
      const newPdf = await PDFDocument.create();

      const pageIndicesToCopy = pages.map(p => p.originalIndex);
      const copiedPages = await newPdf.copyPages(originalPdf, pageIndicesToCopy);

      copiedPages.forEach((page) => {
        newPdf.addPage(page);
      });

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultPdfBlob(blob);
      setResultPdfUrl(url);

    } catch (err: any) {
      console.error('Organize error:', err);
      setError('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (resultPdfBlob) {
      await saveOrShareFile({
        blob: resultPdfBlob,
        filename: `Organized_${file?.name || 'document.pdf'}`,
        mimeType: 'application/pdf',
        title: `Organized_${file?.name || 'document.pdf'}`,
      });
    } else if (resultPdfUrl) {
      openFilePreview(resultPdfUrl);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display font-black tracking-tight mb-4 flex items-center justify-center gap-3">
          <LayoutGrid className="w-10 h-10 text-teal-500" />
          จัดเรียงหน้า PDF
        </h1>
        <p className="text-gray-600 font-medium">ลากและวางเพื่อจัดเรียงลำดับหน้าใหม่ หรือลบหน้าที่คุณไม่ต้องการออก</p>
      </div>

      <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {!file && !isLoadingPages ? (
          <div 
            className="border-4 border-dashed border-gray-300 rounded-xl p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-6">
              <FileUp className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold mb-2">เลือกไฟล์ PDF</h3>
            <p className="text-gray-500 font-medium">เพื่อเริ่มจัดเรียงหน้า</p>
            <input 
              type="file" 
              className="sr-only" 
              accept=".pdf,application/pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
        ) : isLoadingPages ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-16 h-16 text-teal-500 animate-spin" />
            <h3 className="text-2xl font-bold">กำลังโหลดหน้ากระดาษ...</h3>
            <div className="w-64 bg-gray-200 rounded-full h-3 border border-black overflow-hidden">
              <div 
                className="bg-teal-500 h-3 transition-all duration-300" 
                style={{ width: `${loadProgress}%` }}
              ></div>
            </div>
            <p className="text-gray-500 font-medium">{loadProgress}% เสร็จสิ้น</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50 border-2 border-black rounded-xl">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center border border-black">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-lg truncate max-w-[200px] sm:max-w-xs">{file?.name}</h4>
                  <p className="text-sm text-gray-500 font-medium">เหลือ {pages.length} หน้า</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setFile(null);
                  setFileBuffer(null);
                  setPages([]);
                  setResultPdfUrl(null);
                  setResultPdfBlob(null);
                }}
                className="text-sm text-red-600 font-bold hover:underline"
                disabled={isProcessing}
              >
                เลือกไฟล์ใหม่
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 border-2 border-red-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {!resultPdfUrl && pages.length > 0 && (
              <>
                <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 min-h-[400px]">
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={pages.map(p => p.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {pages.map((page, index) => (
                          <SortablePage 
                            key={page.id} 
                            id={page.id} 
                            item={page} 
                            pageNum={index + 1}
                            file={file!}
                            onRemove={handleRemovePage}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  
                  {pages.length === 0 && (
                    <div className="text-center py-20 text-gray-400 font-medium">
                      ไม่มีหน้ากระดาษเหลืออยู่
                    </div>
                  )}
                </div>

                <button
                  onClick={processPdf}
                  disabled={isProcessing || pages.length === 0}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 border-2 border-black transition-all ${
                    isProcessing || pages.length === 0
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-teal-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      กำลังสร้างไฟล์...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      สร้าง PDF ใหม่
                    </>
                  )}
                </button>
              </>
            )}

            {resultPdfUrl && (
              <div className="p-8 bg-teal-50 border-2 border-black rounded-xl text-center space-y-4 mt-8">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto border-2 border-black">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">จัดเรียงหน้าสำเร็จ!</h3>
                  <p className="text-gray-600 font-medium">ไฟล์ของคุณจัดเรียงและพร้อมสำหรับการดาวน์โหลดแล้ว ({pages.length} หน้า)</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                  <button
                    onClick={() => {
                      setResultPdfUrl(null);
                      setResultPdfBlob(null);
                    }}
                    className="px-6 py-4 bg-white text-black border-2 border-black rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px]"
                  >
                    แก้ไขลำดับใหม่
                  </button>
                  <button
                    onClick={handleDownload}
                    className="w-full sm:w-auto px-8 py-4 bg-black text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]"
                  >
                    <Download className="w-6 h-6 text-teal-400" />
                    ดาวน์โหลด / บันทึก PDF
                  </button>
                  {resultPdfUrl && (
                    <button
                      type="button"
                      onClick={() => openFilePreview(resultPdfUrl)}
                      className="w-full sm:w-auto px-6 py-4 bg-white text-black border-2 border-black rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px]"
                    >
                      <ExternalLink className="w-5 h-5 text-neutral-700" />
                      เปิดดูตัวอย่าง
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
