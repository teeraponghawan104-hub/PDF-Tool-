export interface ImageFile {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  width: number;
  height: number;
  rotation: number; // in degrees: 0, 90, 180, 270
}

export type PageSize = 'a4' | 'letter' | 'auto';
export type PageOrientation = 'portrait' | 'landscape' | 'auto';
export type PageMargin = 'none' | 'thin' | 'wide';
export type ImageFit = 'contain' | 'cover' | 'stretch';

export interface ConverterConfig {
  pageSize: PageSize;
  orientation: PageOrientation;
  margin: PageMargin;
  imageFit: ImageFit;
  quality: number; // 0.1 to 1.0 compression quality
}

export interface ConversionProgress {
  status: 'idle' | 'processing' | 'completed' | 'error';
  current: number;
  total: number;
  message: string;
}
