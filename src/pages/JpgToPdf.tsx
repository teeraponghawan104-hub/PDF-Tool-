/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileUp,
  FileText,
  LayoutGrid,
  List,
  RotateCw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Settings,
  Image as ImageIcon,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  Files,
  Info,
  X,
  FileDown,
  ExternalLink,
} from 'lucide-react';
import { ImageFile, ConverterConfig, ConversionProgress } from '../types';
import { getImageDimensions, revokeImageUrls } from '../utils/imageProcessor';
import { convertImagesToPdf } from '../utils/pdfGenerator';
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
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

function SortableItemGrid({ img, index, rotateImageClockwise, moveImage, removeImage, totalLength, formatFileSize }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition: transition || undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border-2 border-black p-3 rounded-2xl flex flex-col justify-between group relative overflow-visible focus:outline-none transition-all ${
        isDragging 
          ? 'opacity-30 border-dashed bg-slate-50 shadow-none' 
          : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px]'
      }`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-10 touch-none" 
        style={{ touchAction: 'none' }}
      />
      
      {/* File number badge */}
      <span className="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 bg-black text-white text-[10px] font-black rounded-lg border border-black uppercase tracking-wider select-none pointer-events-none">
        แผ่นที่ {index + 1}
      </span>

      {/* Rotation angle indicator */}
      {img.rotation > 0 && (
        <span className="absolute top-2.5 right-2.5 z-20 px-1.5 py-0.5 bg-yellow-300 text-black border border-black text-[9px] font-bold rounded select-none pointer-events-none">
          หมุน {img.rotation}°
        </span>
      )}

      {/* Main Thumbnail canvas display */}
      <div className="relative w-full aspect-square md:aspect-[4/3] bg-zinc-50 border-2 border-black rounded-xl overflow-hidden mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] pointer-events-none select-none">
        <img
          src={img.previewUrl}
          alt={img.name}
          referrerPolicy="no-referrer"
          style={{
            transform: `rotate(${img.rotation}deg)`,
            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="w-full h-full object-contain filter drop-shadow-sm pointer-events-none"
        />
      </div>

      {/* Image descriptive Metadata details */}
      <div className="mb-2 select-none pointer-events-none">
        <span className="text-black text-xs font-bold block truncate" title={img.name}>
          {img.name}
        </span>
        <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500 font-bold">
          <span>{formatFileSize(img.size)}</span>
          <span className="font-mono">{img.width}x{img.height} px</span>
        </div>
      </div>

      {/* Image adjustments action bar */}
      <div className="flex items-center gap-1 pt-2 border-t-2 border-black justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => rotateImageClockwise(img.id)}
            className="p-2 sm:p-1 text-black hover:bg-zinc-100 border border-transparent hover:border-black rounded-md transition cursor-pointer"
            title="หมุนรูปตามเข็ม 90 องศา"
          >
            <RotateCw className="w-4 h-4 sm:w-3.5 sm:h-3.5 font-bold" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => moveImage(index, 'up')}
            disabled={index === 0}
            className="p-2 sm:p-1 text-black hover:bg-zinc-100 border border-transparent hover:border-black disabled:opacity-20 rounded-md transition cursor-pointer"
            title="ขยับขึ้นก่อนหน้า"
          >
            <ArrowUp className="w-4 h-4 sm:w-3.5 sm:h-3.5 font-bold" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => moveImage(index, 'down')}
            disabled={index === totalLength - 1}
            className="p-2 sm:p-1 text-black hover:bg-zinc-100 border border-transparent hover:border-black disabled:opacity-20 rounded-md transition cursor-pointer"
            title="ขยับลงหลังถัดไป"
          >
            <ArrowDown className="w-4 h-4 sm:w-3.5 sm:h-3.5 font-bold" />
          </button>
        </div>
        
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => removeImage(img.id)}
          className="p-2 sm:p-1 text-red-600 hover:bg-rose-100 border border-transparent hover:border-red-600 rounded-md transition cursor-pointer pointer-events-auto"
          title="ลบภาพออกจากคิว"
        >
          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>
    </div>
  );
}

function SortableItemList({ img, index, rotateImageClockwise, moveImage, removeImage, totalLength, formatFileSize }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition: transition || undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-white flex items-center justify-between gap-4 group transition-colors focus:outline-none relative ${
        isDragging ? 'opacity-30 border-y-2 border-dashed border-black bg-slate-50 shadow-none' : 'hover:bg-zinc-50'
      }`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-10 touch-none" 
        style={{ touchAction: 'none' }}
      />

      <div className="flex items-center gap-3 min-w-0 pointer-events-none select-none z-20">
        {/* Sequence number */}
        <span className="w-6 text-xs font-black text-black text-center shrink-0">
          #{index + 1}
        </span>
        
        {/* Tiny preview */}
        <div className="w-12 h-12 bg-zinc-50 border-2 border-black rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <img
            src={img.previewUrl}
            alt={img.name}
            referrerPolicy="no-referrer"
            style={{ transform: `rotate(${img.rotation}deg)` }}
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        </div>

        {/* Name details */}
        <div className="min-w-0">
          <span className="text-black text-xs font-bold block truncate">
            {img.name}
          </span>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-gray-500 font-bold mt-0.5">
            <span>ขนาดไฟล์: {formatFileSize(img.size)}</span>
            <span className="text-gray-300 select-none hidden xs:inline">•</span>
            <span>องศาหมุน: {img.rotation}°</span>
            <span className="text-gray-300 select-none hidden xs:inline">•</span>
            <span>มิติจริง: {img.width}x{img.height} px</span>
          </div>
        </div>
      </div>

      {/* Quick Actions column */}
      <div className="flex items-center gap-1 shrink-0 z-20 pointer-events-auto">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => rotateImageClockwise(img.id)}
          className="p-2 sm:p-1.5 text-black hover:bg-zinc-100 border border-transparent hover:border-black rounded-md transition cursor-pointer"
          title="หมุนตามเข็ม 90 องศา"
        >
          <RotateCw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => moveImage(index, 'up')}
          disabled={index === 0}
          className="p-2 sm:p-1.5 text-black hover:bg-zinc-100 border border-transparent hover:border-black disabled:opacity-25 rounded-md transition cursor-pointer"
        >
          <ArrowUp className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => moveImage(index, 'down')}
          disabled={index === totalLength - 1}
          className="p-2 sm:p-1.5 text-black hover:bg-zinc-100 border border-transparent hover:border-black disabled:opacity-25 rounded-md transition cursor-pointer"
        >
          <ArrowDown className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => removeImage(img.id)}
          className="p-2 sm:p-1.5 text-red-600 hover:bg-rose-100 border border-transparent hover:border-red-600 rounded-md transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>
    </div>
  );
}

function DragOverlayItemGrid({ img, formatFileSize }: any) {
  return (
    <div
      className="bg-white border-2 border-black p-3 rounded-2xl flex flex-col justify-between relative overflow-visible shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] scale-105 rotate-[1deg] opacity-95 cursor-grabbing w-full"
    >
      {img.rotation > 0 && (
        <span className="absolute top-2.5 right-2.5 z-10 px-1.5 py-0.5 bg-yellow-300 text-black border border-black text-[9px] font-bold rounded">
          หมุน {img.rotation}°
        </span>
      )}

      <div className="relative w-full aspect-square md:aspect-[4/3] bg-zinc-50 border-2 border-black rounded-xl overflow-hidden mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <img
          src={img.previewUrl}
          alt={img.name}
          referrerPolicy="no-referrer"
          style={{ transform: `rotate(${img.rotation}deg)` }}
          className="w-full h-full object-contain filter drop-shadow-sm pointer-events-none"
        />
      </div>

      <div className="mb-2">
        <span className="text-black text-xs font-bold block truncate" title={img.name}>
          {img.name}
        </span>
        <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500 font-bold">
          <span>{formatFileSize(img.size)}</span>
          <span className="font-mono">{img.width}x{img.height} px</span>
        </div>
      </div>
    </div>
  );
}

function DragOverlayItemList({ img, formatFileSize }: any) {
  return (
    <div
      className="p-3 bg-white flex items-center justify-between gap-4 border-2 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] scale-[1.02] opacity-95 cursor-grabbing w-full"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 bg-zinc-50 border-2 border-black rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <img
            src={img.previewUrl}
            alt={img.name}
            referrerPolicy="no-referrer"
            style={{ transform: `rotate(${img.rotation}deg)` }}
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        </div>

        <div className="min-w-0">
          <span className="text-black text-xs font-bold block truncate">
            {img.name}
          </span>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-gray-500 font-bold mt-0.5">
            <span>ขนาดไฟล์: {formatFileSize(img.size)}</span>
            <span className="text-gray-300 select-none hidden xs:inline">•</span>
            <span>องศาหมุน: {img.rotation}°</span>
            <span className="text-gray-300 select-none hidden xs:inline">•</span>
            <span>มิติจริง: {img.width}x{img.height} px</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JpgToPdf() {
  // Queue state for uploading images
  const [images, setImages] = useState<ImageFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Converter settings
  const [config, setConfig] = useState<ConverterConfig>({
    pageSize: 'auto',
    orientation: 'auto',
    margin: 'none',
    imageFit: 'contain',
    quality: 0.85,
  });

  // UI States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dragActive, setDragActive] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('converted_document.pdf');
  const [isCustomFileName, setIsCustomFileName] = useState<boolean>(false);
  const [pdfSize, setPdfSize] = useState<number>(0);
  
  // Real-time conversion update
  const [progress, setProgress] = useState<ConversionProgress>({
    status: 'idle',
    current: 0,
    total: 0,
    message: '',
  });

  // Clean invalid filename characters: \ / : * ? " < > |
  const handleFileNameChange = (val: string) => {
    const cleaned = val.replace(/[\\/:\*\?"<>\|]/g, '');
    if (cleaned === '') {
      setPdfFileName('');
    } else {
      setPdfFileName(cleaned.endsWith('.pdf') ? cleaned : `${cleaned}.pdf`);
    }
    setIsCustomFileName(true);
  };

  // Toast Alerts Custom state (No window.alert)
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Auto clean up pdf object urls when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      revokeImageUrls(images);
    };
  }, []);

  // Suggest a smart default PDF name based on user uploaded images
  useEffect(() => {
    if (!isCustomFileName && images.length > 0) {
      const firstImageName = images[0].name;
      const cleanName = firstImageName.substring(0, firstImageName.lastIndexOf('.')) || 'images';
      const countSuffix = images.length > 1 ? `_and_${images.length - 1}_others` : '';
      setPdfFileName(`${cleanName}${countSuffix}_converted.pdf`);
    } else if (images.length === 0) {
      setPdfFileName('converted_document.pdf');
      setIsCustomFileName(false);
    }
  }, [images, isCustomFileName]);

  // Utility to trigger visual Toast
  const showToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // Convert generic Bytes to readable measurements
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Drag and Drop listeners
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  // Selection trigger
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(e.target.files);
    }
  };

  // Process uploaded files and parse specs safely
  const handleFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList) return;
    
    setIsLoadingFiles(true);
    const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const filesArray = Array.from(fileList).filter(f => {
      const typeLower = f.type.toLowerCase();
      const nameLower = f.name.toLowerCase();
      return (
        acceptedTypes.includes(typeLower) ||
        nameLower.endsWith('.jpg') ||
        nameLower.endsWith('.jpeg') ||
        nameLower.endsWith('.png') ||
        nameLower.endsWith('.webp')
      );
    });

    if (filesArray.length === 0) {
      showToast('กรุณาเลือกไฟล์ภาพถ่ายสกุล JPG, JPEG, PNG หรือ WEBP เท่านั้น', 'error');
      setIsLoadingFiles(false);
      return;
    }

    const processedNewFiles: ImageFile[] = [];

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      try {
        const dimensions = await getImageDimensions(file);
        processedNewFiles.push({
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${i}`,
          file,
          name: file.name,
          size: file.size,
          previewUrl: dimensions.previewUrl,
          width: dimensions.width,
          height: dimensions.height,
          rotation: 0,
        });
      } catch (err) {
        console.error('Failed to parse dimensions, fallback used for:', file.name, err);
        // Fallback profile if loading sizing fails
        processedNewFiles.push({
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${i}`,
          file,
          name: file.name,
          size: file.size,
          previewUrl: URL.createObjectURL(file),
          width: 1200,
          height: 1200,
          rotation: 0,
        });
      }
    }

    setImages(prev => [...prev, ...processedNewFiles]);
    setIsLoadingFiles(false);
    showToast(`เพิ่มไฟล์รูปภาพใหม่จำนวน ${processedNewFiles.length} รูปเรียบร้อย`, 'success');
    
    // Auto reset file input so the same files can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Reset previous generated PDF blob to force re-generation on new file modifications
    resetGeneratedPdf();
  };

  // Quick visual rotation handler
  const rotateImageClockwise = (id: string) => {
    setImages(prev =>
      prev.map(img => {
        if (img.id === id) {
          const nextRotation = (img.rotation + 90) % 360;
          return { ...img, rotation: nextRotation };
        }
        return img;
      })
    );
    resetGeneratedPdf();
  };

  // Sequence sorting swap
  const moveImage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    
    const rearranged = [...images];
    const temp = rearranged[index];
    rearranged[index] = rearranged[targetIndex];
    rearranged[targetIndex] = temp;
    
    setImages(rearranged);
    resetGeneratedPdf();
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
      setImages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
      resetGeneratedPdf();
    }
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Sequential Sorting presets
  const sortByName = (ascending: boolean) => {
    const sorted = [...images].sort((a, b) => {
      return ascending
        ? a.name.localeCompare(b.name, 'th', { sensitivity: 'base', numeric: true })
        : b.name.localeCompare(a.name, 'th', { sensitivity: 'base', numeric: true });
    });
    setImages(sorted);
    resetGeneratedPdf();
    showToast(`จัดเรียงไฟล์ตามชื่อไฟล์ (${ascending ? 'ก-ฮ / A-Z' : 'ฮ-ก / Z-A'}) สำเร็จ`, 'info');
  };

  // Remove single card item
  const removeImage = (id: string) => {
    const target = images.find(img => img.id === id);
    if (target) {
      if (target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
    }
    setImages(prev => prev.filter(img => img.id !== id));
    resetGeneratedPdf();
    showToast('ลบรูปภาพที่เลือกแล้ว', 'info');
  };

  // Reset document outputs
  const resetGeneratedPdf = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setPdfBlob(null);
    setPdfSize(0);
  };

  // Clear file lists
  const clearAllImages = () => {
    revokeImageUrls(images);
    setImages([]);
    resetGeneratedPdf();
    showToast('ล้างรายการรูปภาพทั้งหมดแล้ว', 'warning');
  };

  // Trigger browser simulation tool to create vector mockups
  const generateMockImages = async () => {
    setIsLoadingFiles(true);
    const mockFilesConfig = [
      { name: 'document_scan_01.jpg', text: 'หน้า 1: เอกสารสัญญารับจอง', bg: '#fbfbfb', fg: '#1e293b', w: 1200, h: 1600 },
      { name: 'document_scan_02.jpg', text: 'หน้า 2: แนบสำเนาบัตรประชาชน', bg: '#f1f5f9', fg: '#0f172a', w: 1200, h: 1600 },
      { name: 'document_scan_03.jpg', text: 'หน้า 3: เอกสารลงนามพยาน', bg: '#fafafa', fg: '#334155', w: 1200, h: 1600 }
    ];
    
    const mockImages: ImageFile[] = [];

    for (let i = 0; i < mockFilesConfig.length; i++) {
      const configItem = mockFilesConfig[i];
      const canvas = document.createElement('canvas');
      canvas.width = configItem.w;
      canvas.height = configItem.h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw plain clean mock page
        ctx.fillStyle = configItem.bg;
        ctx.fillRect(0, 0, configItem.w, configItem.h);
        
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 16;
        ctx.strokeRect(8, 8, configItem.w - 16, configItem.h - 16);

        // Header placeholder
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 36px "Inter", sans-serif';
        ctx.fillText('CONFIDENTIAL DOCUMENT', 80, 120);

        // Grid lines mock
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        for (let y = 200; y < configItem.h - 200; y += 80) {
          ctx.beginPath();
          ctx.moveTo(80, y);
          ctx.lineTo(configItem.w - 80, y);
          ctx.stroke();
        }

        // Draw visual emblem
        ctx.fillStyle = configItem.fg + '25';
        ctx.beginPath();
        ctx.arc(configItem.w / 2, configItem.h / 2, 200, 0, Math.PI * 2);
        ctx.fill();

        // Main text
        ctx.fillStyle = configItem.fg;
        ctx.font = 'bold 52px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(configItem.text, configItem.w / 2, configItem.h / 2);

        // Footer meta
        ctx.fillStyle = '#94a3b8';
        ctx.font = '400 24px "JetBrains Mono", monospace';
        ctx.fillText(`รหัสจำลอง: SYSTEM-MOCK-A${i + 1} | ขนาด: ${configItem.w} x ${configItem.h} px`, configItem.w / 2, configItem.h - 100);
      }

      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], configItem.name, { type: 'image/jpeg' });
            mockImages.push({
              id: `mock_${Date.now()}_${i}`,
              file,
              name: file.name,
              size: file.size,
              previewUrl: URL.createObjectURL(blob),
              width: configItem.w,
              height: configItem.h,
              rotation: 0,
            });
          }
          resolve();
        }, 'image/jpeg', 0.85);
      });
    }

    setImages(prev => [...prev, ...mockImages]);
    setIsLoadingFiles(false);
    resetGeneratedPdf();
    showToast('สร้างหน้าเอกสารจำลองเพื่อทดลองใช้งาน 3 แผ่นเรียบร้อย!', 'success');
  };

  // Compile PDF handler
  const handlePdfConversion = async () => {
    if (images.length === 0) {
      showToast('กรุณาอัปโหลดก่อนอย่างน้อย 1 ภาพเพื่อสร้างไฟล์ PDF', 'warning');
      return;
    }

    setIsConverting(true);
    resetGeneratedPdf();

    try {
      const blobResult = await convertImagesToPdf(images, config, (p) => {
        setProgress(p);
      });
      
      const resUrl = URL.createObjectURL(blobResult);
      setPdfBlob(blobResult);
      setPdfUrl(resUrl);
      setPdfSize(blobResult.size);
      
      showToast('สร้างไฟล์ PDF มัลติเพจเรียบร้อยแล้ว!', 'success');
    } catch (err: any) {
      console.error(err);
      setProgress(prev => ({
        ...prev,
        status: 'error',
        message: err.message || 'เกิดข้อผิดพลาดในการประมวลผล PDF',
      }));
      showToast('ล้มเหลวในการแปลงรูปเป็น PDF', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  // Download trigger
  const triggerPdfDownload = () => {
    if (!pdfUrl) return;
    const finalName = pdfFileName.trim() ? (pdfFileName.endsWith('.pdf') ? pdfFileName : `${pdfFileName}.pdf`) : 'converted_document.pdf';
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ดาวน์โหลดเอกสารสำเร็จแล้ว 📁', 'success');
  };

  // Calc total selected queue statistics
  const totalOriginalBytes = images.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] font-sans selection:bg-yellow-300 selection:text-black relative pb-16">
      
      {/* Toast Alert Drawer widget */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div
              className={`flex items-center gap-3 p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black ${
                toast.type === 'success'
                  ? 'bg-emerald-300 text-black'
                  : toast.type === 'warning'
                  ? 'bg-amber-300 text-black'
                  : toast.type === 'error'
                  ? 'bg-rose-300 text-black'
                  : 'bg-blue-300 text-black'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-black shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-black shrink-0" />}
              {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-black shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-black shrink-0" />}
              
              <div className="text-sm font-bold pr-2 break-words flex-1">
                {toast.message}
              </div>
              <button
                onClick={() => setToast(prev => ({ ...prev, show: false }))}
                className="hover:bg-black/10 p-1 rounded transition"
              >
                <X className="w-4 h-4 shrink-0 text-black font-extrabold" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-8 md:pt-12">
        
        {/* Typographical Header Area */}
        <header className="mb-8 md:mb-12 text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b-2 border-black">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight text-black mt-0.5">
                JPEG to PDF Converter
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 shrink-0">
            <button
              id="btn-load-mock"
              onClick={generateMockImages}
              disabled={isLoadingFiles}
              className="px-4 py-2.5 bg-white hover:bg-neutral-50 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Files className="w-3.5 h-3.5 text-black" />
              สุ่มหน้าเอกสารทดลอง (Mock)
            </button>
            {images.length > 0 && (
              <button
                id="btn-clear-all"
                onClick={clearAllImages}
                className="px-4 py-2.5 bg-rose-300 hover:bg-rose-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ล้างคิวรูปภาพ ({images.length})
              </button>
            )}
          </div>
        </header>

        {/* Bento Grid Structural Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Block: Panel Configurations (4 cols) */}
          <div className="lg:col-span-4 space-y-6 sticky top-6 order-2 lg:order-1">
            <section id="config-card" className="bg-[#EEF2FF] border-2 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 pb-4 border-b-2 border-black mb-6">
                <Settings className="w-5 h-5 text-black" />
                <h2 className="text-base font-bold text-black uppercase tracking-wider">การตั้งค่า PDF</h2>
              </div>

            {/* Config Item: Page Size Layout */}
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  ขนาดหน้ากระดาษ (Page Size)
                </label>
                <div className="grid grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2">
                  {[
                    { id: 'auto', label: 'ฟิตพอดีภาพ (Auto)', desc: 'ขนาดเท่าภาพจริง' },
                    { id: 'a4', label: 'กระดาษ A4', desc: 'A4 Standard' },
                    { id: 'letter', label: 'US Letter', desc: 'Letter' },
                  ].map((size) => (
                    <button
                      key={size.id}
                      id={`config-page-${size.id}`}
                      onClick={() => {
                        setConfig((prev) => ({ ...prev, pageSize: size.id as any }));
                        resetGeneratedPdf();
                      }}
                      className={`p-3 text-left border-2 border-black rounded-xl flex flex-col justify-between transition cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${
                        config.pageSize === size.id
                          ? 'bg-yellow-300 text-black font-bold'
                          : 'bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-bold leading-relaxed block">{size.label}</span>
                      <span className="text-[10px] text-slate-500 mt-1 block font-medium">{size.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Config Item: Orientation */}
              {config.pageSize !== 'auto' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    หมวดจัดวางแนวหน้ากระดาษ (Orientation)
                  </label>
                  <div className="grid grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2">
                    {[
                      { id: 'auto', label: 'แนวอัตโนมัติ' },
                      { id: 'portrait', label: 'แนวตั้ง' },
                      { id: 'landscape', label: 'แนวนอน' },
                    ].map((orient) => (
                      <button
                        key={orient.id}
                        id={`config-orientation-${orient.id}`}
                        onClick={() => {
                          setConfig((prev) => ({ ...prev, orientation: orient.id as any }));
                          resetGeneratedPdf();
                        }}
                        className={`py-2 px-3 text-center border-2 border-black rounded-xl text-xs font-bold transition cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${
                          config.orientation === orient.id
                            ? 'bg-yellow-300 text-black'
                            : 'bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {orient.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Config Item: Margins */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  ระยะขอบกระดาษ (Page Margin)
                </label>
                <div className="grid grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: '0px (เต็มแผ่น)' },
                    { id: 'thin', label: '15px (ขอบบาง)' },
                    { id: 'wide', label: '36px (ขอบกว้าง)' },
                  ].map((margin) => (
                    <button
                      key={margin.id}
                      id={`config-margin-${margin.id}`}
                      onClick={() => {
                        setConfig((prev) => ({ ...prev, margin: margin.id as any }));
                        resetGeneratedPdf();
                      }}
                      className={`py-2 px-3 text-center border-2 border-black rounded-xl text-xs font-bold transition cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${
                        config.margin === margin.id
                          ? 'bg-yellow-300 text-black'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {margin.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Config Item: Image Fit Aspect Ratio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  การย่อส่วนการครอบรูปภาพ (Image Fit)
                </label>
                <div className="grid grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2">
                  {[
                    { id: 'contain', label: 'Keep โครงสร้าง', desc: 'รักษาสัดส่วนหลัก' },
                    { id: 'stretch', label: 'Stretch ยืด', desc: 'ดึงขนาดแนบมุม' },
                    { id: 'cover', label: 'เต็มพื้นที่', desc: 'ขยายทับไม่เหลือขาว' },
                  ].map((fit) => (
                    <button
                      key={fit.id}
                      id={`config-fit-${fit.id}`}
                      onClick={() => {
                        setConfig((prev) => ({ ...prev, imageFit: fit.id as any }));
                        resetGeneratedPdf();
                      }}
                      className={`p-2.5 text-left border-2 border-black rounded-xl flex flex-col justify-between transition cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${
                        config.imageFit === fit.id
                          ? 'bg-yellow-300 text-black font-bold'
                          : 'bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-bold block">{fit.label}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5 block leading-tight">{fit.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Config Item: PDF Filename */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    ตั้งชื่อไฟล์ผลลัพธ์ (Filename)
                  </label>
                  {isCustomFileName && images.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCustomFileName(false)}
                      className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-bold cursor-pointer transition"
                    >
                      ใช้ชื่ออัตโนมัติ
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={pdfFileName.endsWith('.pdf') ? pdfFileName.slice(0, -4) : pdfFileName}
                    onChange={(e) => handleFileNameChange(e.target.value)}
                    placeholder="พิมพ์ระบุชื่อไฟล์ที่ต้องการ..."
                    className="w-full pl-3.5 pr-12 py-2.5 bg-white border-2 border-black rounded-xl text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none transition-all outline-none"
                  />
                  <span className="absolute right-3.5 top-2.5 text-[11px] text-gray-400 font-extrabold select-none">
                    .pdf
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 mt-1 leading-normal font-semibold">
                  * ชื่อนี้จะถูกตั้งค่าเป็นชื่อไฟล์เมื่อกดดาวน์โหลด PDF (หลีกเลี่ยงอักขระพิเศษ \ / : * ? " &lt; &gt; |)
                </p>
              </div>

              {/* Quality Settings / Compression */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    คุณภาพและการบีบอัดไฟล์ภาพ
                  </label>
                  <span className="text-xs font-mono font-extrabold text-[#1a1a1a] bg-yellow-300 px-1.5 py-0.5 rounded border border-black">
                    {Math.round(config.quality * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={config.quality}
                  onChange={(e) => {
                    setConfig((prev) => ({ ...prev, quality: parseFloat(e.target.value) }));
                    resetGeneratedPdf();
                  }}
                  className="w-full accent-black cursor-pointer mb-2"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                  <span>บีบอัดสูง (ไฟล์เล็กมาก)</span>
                  <span>สมดุล (แนะนำ)</span>
                  <span>ต้นฉบับคมชัดสูงสุด</span>
                </div>
              </div>

              <div className="bg-amber-100 rounded-2xl p-4 border-2 border-black flex gap-3 text-slate-800 text-xs leading-relaxed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Info className="w-4 h-4 text-black shrink-0 mt-0.5" />
                <div>
                  <b className="text-[#1a1a1a] block mb-0.5">💡 เคล็ดลับการแปลงภาพ:</b>
                  เลือกกระดาษเป็น <b>"ฟิตพอดีภาพ (Auto)"</b> และปรับระยะขอบเป็น <b>"0px"</b> เพื่อสร้างหน้าเอกสาร PDF ที่แนบขัดขอบเหลี่ยมกับรูปถาพของคุณพอดีเป๊ะ เหมาะสำหรับการรวมรูปโฉนด, สลิปโอนเงิน หรือภาพแคปหน้าจอ!
                </div>
              </div>
            </div>
          </section>

          {/* Quick stats and features card side-by-side Bento items */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-yellow-300 border-2 border-black rounded-3xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center items-center text-center">
              <span className="text-3xl font-black italic uppercase leading-none text-black">
                {images.length}
              </span>
              <span className="text-[10px] font-bold mt-1 text-black uppercase tracking-wider">
                คิวนำเข้าตอนนี้
              </span>
            </div>
            <div className="bg-orange-400 border-2 border-black rounded-3xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center items-center text-center">
              <span className="text-xs font-black uppercase leading-tight text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                ไม่จำกัด<br />จำนวนไฟล์
              </span>
              <span className="text-[9px] font-bold mt-1 text-black uppercase tracking-widest">
                unlimited
              </span>
            </div>
          </div>
        </div>

        {/* Right Block: Image Arena & Drag Drop Zone (8 cols) */}
        <section className="lg:col-span-8 space-y-6 order-1 lg:order-2">
          
          {/* Real-time PDF generated info block if exists */}
          {pdfBlob && pdfUrl && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-300 border-2 border-black rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-5 justify-between shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black"
            >
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full">
                <div className="p-3 bg-black text-emerald-300 border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0">
                  <FileDown className="w-8 h-8 animate-bounce text-emerald-400" />
                </div>
                <div className="flex-1 w-full min-w-0">
                  <div className="flex items-center justify-between sm:justify-start gap-3">
                    <h3 className="font-display font-black text-black text-xl">แปลงไฟล์ PDF พร้อมแล้ว!</h3>
                    {isCustomFileName && images.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsCustomFileName(false)}
                        className="text-[10px] text-blue-700 hover:text-blue-900 underline font-bold"
                      >
                        (รีเซ็ตเป็นชื่ออัตโนมัติ)
                      </button>
                    )}
                  </div>
                  <div className="mt-2 relative max-w-sm sm:max-w-md">
                    <input
                      type="text"
                      value={pdfFileName.endsWith('.pdf') ? pdfFileName.slice(0, -4) : pdfFileName}
                      onChange={(e) => handleFileNameChange(e.target.value)}
                      placeholder="ระบุชื่อไฟล์..."
                      className="w-full pl-3 pr-10 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-bold text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[0.5px] focus:translate-y-[0.5px] focus:shadow-none transition-all outline-none"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-gray-500 font-extrabold select-none">
                      .pdf
                    </span>
                  </div>
                  <p className="text-[10px] text-black/75 mt-1 font-bold">
                    ขนาดเอกสาร: {formatFileSize(pdfSize)} • จำนวนหน้า: {images.length} แผ่น
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
                <button
                  id="btn-preview-pdf"
                  onClick={() => {
                    window.open(pdfUrl, '_blank');
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-neutral-100 text-black border-2 border-black text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                >
                  <ExternalLink className="w-4 h-4" />
                  ดูตัวอย่างเอกสาร
                </button>
                <button
                  id="btn-download-pdf"
                  onClick={triggerPdfDownload}
                  className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white border-2 border-black text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-[3px_3px_0px_0px_rgba(0,0,0,0.35)] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                >
                  <Download className="w-4 h-4 text-emerald-300" />
                  ดาวน์โหลด PDF ทันที
                </button>
              </div>
            </motion.div>
          )}

          {/* If files list is empty: Draw huge beautiful Drag/Drop Courtyard */}
          {images.length === 0 ? (
            <div
              id="file-dropzone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border-2 border-dashed rounded-3xl p-12 md:p-16 flex flex-col items-center justify-center text-center cursor-pointer transition duration-300 min-h-[420px] bg-white border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${
                dragActive
                  ? 'bg-blue-50 ring-4 ring-blue-500/20'
                  : 'hover:bg-slate-50/50'
              }`}
            >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                />

                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-indigo-100/70 rounded-full blur-xl scale-125 animate-pulse" />
                  <div className="relative w-20 h-20 bg-blue-50 text-blue-600 border-2 border-black rounded-3xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <FileUp className="w-10 h-10 stroke-[1.5]" />
                  </div>
                </div>

                <h3 className="font-display font-extrabold text-[#1a1a1a] text-xl tracking-tight">
                  ลากไฟล์รูปภาพมาวางที่นี่ หรือคลิกเพื่ออัปโหลด
                </h3>
                
                <p className="text-gray-500 text-xs sm:text-sm mt-3 max-w-md leading-relaxed font-medium">
                  รองรับไฟล์ภาพสกุล <b>JPEG, JPG, PNG</b> และ <b>WEBP</b> <br />
                  อัปโหลดได้พร้อมกันได้หลายสิบไฟล์ ไม่จำกัดจำนวนและการรันระบบ
                </p>

                <button
                  type="button"
                  className="mt-8 px-8 py-3.5 bg-blue-600 border-2 border-black hover:bg-blue-700 text-white font-bold rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 cursor-pointer transition active:translate-x-[2px] active:translate-y-[2px]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  เลือกไฟล์รูปภาพจากอุปกรณ์ของคุณ
                </button>
              </div>
            ) : (
              /* If files are present in queue */
              <div className="bg-white border-2 border-black rounded-3xl p-6 space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-[#1a1a1a]">
                
                {/* File Queue Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-yellow-300 text-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <ImageIcon className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <h3 className="font-bold text-black text-sm leading-tight uppercase font-display">คิวรูปภาพสำหรับจัดทำ PDF</h3>
                      <p className="text-xs text-slate-500 mt-1 font-semibold">
                        เลือกแล้ว <span className="font-bold text-black">{images.length} ไฟล์</span> • รวมขนาด {formatFileSize(totalOriginalBytes)}
                      </p>
                    </div>
                  </div>

                  {/* Inline queue actions */}
                  <div className="flex items-center flex-wrap gap-2 justify-end">
                    <button
                      id="btn-sort-asc"
                      onClick={() => sortByName(true)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-black border-2 border-black rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      title="เรียงลำดับชื่อไฟล์ก-ฮ"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-black" />
                      เรียงชื่อ (A-Z)
                    </button>
                    <button
                      id="btn-sort-desc"
                      onClick={() => sortByName(false)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-black border-2 border-black rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      title="เรียงลำดับชื่อไฟล์ฮ-ก"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-black" />
                      เรียงชื่อ (Z-A)
                    </button>
                    <div className="h-6 w-px bg-black mx-1 hidden sm:block" />
                    
                    {/* View Style Indicators */}
                    <div className="flex border-2 border-black rounded-lg overflow-hidden bg-white">
                      <button
                        id="btn-view-grid"
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 transition cursor-pointer ${
                          viewMode === 'grid'
                            ? 'bg-black text-white font-extrabold'
                            : 'bg-white hover:bg-slate-100 text-black'
                        }`}
                      >
                        <LayoutGrid className="w-4 h-4 font-extrabold" />
                      </button>
                      <button
                        id="btn-view-list"
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 transition cursor-pointer ${
                          viewMode === 'list'
                            ? 'bg-black text-white font-extrabold'
                            : 'bg-white hover:bg-slate-100 text-black'
                        }`}
                      >
                        <List className="w-4 h-4 font-extrabold" />
                      </button>
                    </div>

                    {/* Add More button */}
                    <button
                      onClick={triggerFileInput}
                      className="px-3 py-1.5 bg-yellow-300 hover:bg-yellow-400 text-black text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มรูปภาพ
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Listing of image queue */}
                {isLoadingFiles ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 border-2 border-black rounded-2xl text-black gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Loader2 className="w-8 h-8 text-black animate-spin" />
                    <span className="text-sm font-bold animate-pulse">กำลังประมวลผลขนาดสัดส่วนภาพถ่าย...</span>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    {viewMode === 'grid' ? (
                      /* Grid-Style View layout */
                      <SortableContext
                        items={images.map(img => img.id)}
                        strategy={rectSortingStrategy}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <AnimatePresence initial={false}>
                            {images.map((img, index) => (
                              <SortableItemGrid
                                key={img.id}
                                img={img}
                                index={index}
                                totalLength={images.length}
                                rotateImageClockwise={rotateImageClockwise}
                                moveImage={moveImage}
                                removeImage={removeImage}
                                formatFileSize={formatFileSize}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </SortableContext>
                    ) : (
                      /* Compact list view layout for handling unlimited listings */
                      <SortableContext
                        items={images.map(img => img.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="border-2 border-black rounded-2xl overflow-hidden bg-white divide-y-2 divide-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <AnimatePresence initial={false}>
                            {images.map((img, index) => (
                              <SortableItemList
                                key={img.id}
                                img={img}
                                index={index}
                                totalLength={images.length}
                                rotateImageClockwise={rotateImageClockwise}
                                moveImage={moveImage}
                                removeImage={removeImage}
                                formatFileSize={formatFileSize}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </SortableContext>
                    )}

                    <DragOverlay adjustScale={true}>
                      {activeId ? (
                        (() => {
                          const activeFile = images.find(img => img.id === activeId);
                          if (!activeFile) return null;
                          return viewMode === 'grid' ? (
                            <DragOverlayItemGrid img={activeFile} formatFileSize={formatFileSize} />
                          ) : (
                            <DragOverlayItemList img={activeFile} formatFileSize={formatFileSize} />
                          );
                        })()
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                )}

                {/* Conversion trigger interface */}
                <div className="pt-4 border-t-2 border-black flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="text-xs text-black font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>ระบบจะประกอบและแพ็คภาพในบราวเซอร์ทันทีโดยรักษาความปลอดภัยสูงสุด</span>
                  </div>

                  <button
                    id="btn-start-conversion"
                    onClick={handlePdfConversion}
                    disabled={isConverting}
                    className="px-8 py-3.5 bg-green-400 hover:bg-green-500 disabled:bg-neutral-300 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {isConverting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        กำลังจัดระเบียบกระดาษ...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 text-black font-extrabold" />
                        เริ่มแปลงและดาวน์โหลด PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Progress screen Overlay */}
      <AnimatePresence>
        {isConverting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#1a1a1a]/80 backdrop-blur-sm flex items-center justify-center p-4 text-black"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border-4 border-black rounded-3xl max-w-lg w-full p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
            >
              <div className="flex flex-col items-center text-center py-4">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-yellow-200 rounded-full blur-xl animate-pulse scale-110" />
                  <div className="relative w-16 h-16 bg-yellow-300 text-black rounded-2xl flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                </div>

                <h3 className="font-display font-extrabold text-xl text-black">
                  กำลังสร้างไฟล์เอกสาร PDF
                </h3>
                
                <p className="text-xs text-gray-500 font-bold mt-2 max-w-sm">
                  {progress.message}
                </p>

                {/* Progress bar container */}
                <div className="w-full bg-zinc-100 rounded-full h-5 mt-8 border-2 border-black relative overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <motion.div
                    className="bg-blue-600 h-full rounded-none border-r-2 border-black"
                    initial={{ width: '0%' }}
                    animate={{
                      width: `${(progress.current / (progress.total || 1)) * 100}%`
                    }}
                    transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                  />
                </div>

                {/* Progress fraction detail */}
                <div className="flex items-center justify-between w-full mt-3 text-xs text-gray-400 font-extrabold font-mono">
                  <span className="text-black">
                    หน้า {progress.current} / {progress.total} รูปภาพ
                  </span>
                  <span className="bg-yellow-300 border border-black px-1.5 py-0.5 rounded text-black font-mono">
                    {Math.round((progress.current / (progress.total || 1)) * 100)}%
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
