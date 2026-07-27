import { jsPDF } from 'jspdf';
import { ImageFile, ConverterConfig, ConversionProgress } from '../types';
import { rotateAndOptimizeImage } from './imageProcessor';

/**
 * Compiles a list of processed image files into a single consolidated PDF document.
 */
export async function convertImagesToPdf(
  images: ImageFile[],
  config: ConverterConfig,
  onProgress: (progress: ConversionProgress) => void
): Promise<Blob> {
  if (images.length === 0) {
    throw new Error('กรุณาเลือกไฟล์รูปภาพอย่างน้อย 1 ไฟล์');
  }

  onProgress({
    status: 'processing',
    current: 0,
    total: images.length,
    message: 'กำลังเตรียมรูปภาพและประมวลผลระบบ...',
  });

  // Pre-process all images first (handle rotation and quality compression)
  const processedImages: Array<{ dataUrl: string; width: number; height: number; name: string }> = [];

  for (let i = 0; i < images.length; i++) {
    const imgFile = images[i];
    onProgress({
      status: 'processing',
      current: i,
      total: images.length,
      message: `กำลังประมวลผลรูปที่ ${i + 1} จากทั้งหมด ${images.length} (ปรับองศาและการบีบอัด)...`,
    });

    try {
      const optimized = await rotateAndOptimizeImage(imgFile, config.quality);
      processedImages.push({
        dataUrl: optimized.dataUrl,
        width: optimized.width,
        height: optimized.height,
        name: imgFile.name,
      });
    } catch (err) {
      console.error(`Error processing image ${imgFile.name}:`, err);
      // Fallback: use raw previewUrl if canvas processing fails (using original image info)
      processedImages.push({
        dataUrl: imgFile.previewUrl,
        width: imgFile.width,
        height: imgFile.height,
        name: imgFile.name,
      });
    }
  }

  // Determine standard base dimensions for Page 1 to initialize jsPDF
  const page1 = calculatePageDimensions(processedImages[0].width, processedImages[0].height, config);
  const firstOrientation = page1.pageWidth > page1.pageHeight ? 'landscape' : 'portrait';

  // Initialize jsPDF with calculated dimension of page 1
  const doc = new jsPDF({
    orientation: firstOrientation,
    unit: 'pt',
    format: [page1.pageWidth, page1.pageHeight],
  });

  // Render each image onto pages
  for (let i = 0; i < processedImages.length; i++) {
    onProgress({
      status: 'processing',
      current: i,
      total: images.length,
      message: `กำลังประกอบหน้าเอกสาร PDF หน้าที่ ${i + 1} จากทั้งหมด ${images.length}...`,
    });

    const img = processedImages[i];
    const { pageWidth, pageHeight, marginValue, printW, printH } = calculatePageDimensions(img.width, img.height, config);
    const pageOrientation = pageWidth > pageHeight ? 'landscape' : 'portrait';

    // If it's not the first page, add a new page with the dynamic dimensions matching this page
    if (i > 0) {
      doc.addPage([pageWidth, pageHeight], pageOrientation);
    }

    // Calculate rendering boundaries for the image on this page
    const layout = calculateImageLayout(img.width, img.height, printW, printH, marginValue, config.imageFit);

    // Add image onto the active page (uses compression internally and base64 string)
    doc.addImage(
      img.dataUrl,
      'JPEG',
      layout.x,
      layout.y,
      layout.w,
      layout.h,
      `img_${i}`,
      'FAST'
    );
  }

  onProgress({
    status: 'processing',
    current: images.length,
    total: images.length,
    message: 'กำลังรวบรวมไฟล์และบันทึกเอกสาร PDF...',
  });

  // Return the compiled blob
  const pdfBlob = doc.output('blob');

  onProgress({
    status: 'completed',
    current: images.length,
    total: images.length,
    message: 'การแปลงไฟล์เสร็จสมบูรณ์เรียบร้อยแล้ว!',
  });

  return pdfBlob;
}

/**
 * Calculates page width, height and margin in Points (pt)
 */
function calculatePageDimensions(
  imgWidth: number,
  imgHeight: number,
  config: ConverterConfig
) {
  let pageWidth = 595.28; // Default A4
  let pageHeight = 841.89;

  if (config.pageSize === 'a4') {
    pageWidth = 595.28;
    pageHeight = 841.89;
  } else if (config.pageSize === 'letter') {
    pageWidth = 612.00;
    pageHeight = 792.00;
  } else {
    // 'auto' - page size matches image perfectly
    // Maintain decent scale so text doesn't look absurdly small on high-res photos
    const maxDim = 1200;
    const factor = Math.min(1, maxDim / Math.max(imgWidth, imgHeight));
    pageWidth = imgWidth * factor;
    pageHeight = imgHeight * factor;
  }

  // Adjust orientations (unless page size is set to auto)
  if (config.pageSize !== 'auto') {
    const isLandscape =
      config.orientation === 'landscape' ||
      (config.orientation === 'auto' && imgWidth > imgHeight);

    const minDim = Math.min(pageWidth, pageHeight);
    const maxDim = Math.max(pageWidth, pageHeight);

    if (isLandscape) {
      pageWidth = maxDim;
      pageHeight = minDim;
    } else {
      pageWidth = minDim;
      pageHeight = maxDim;
    }
  }

  // Calculate pixel bounds of margins
  let marginValue = 0;
  if (config.margin === 'thin') {
    marginValue = 15;
  } else if (config.margin === 'wide') {
    marginValue = 36;
  }

  const printW = pageWidth - 2 * marginValue;
  const printH = pageHeight - 2 * marginValue;

  return {
    pageWidth,
    pageHeight,
    marginValue,
    printW,
    printH,
  };
}

/**
 * Computes location layout bounds of the image inside printable space
 */
function calculateImageLayout(
  imgW: number,
  imgH: number,
  printW: number,
  printH: number,
  margin: number,
  imageFit: 'contain' | 'cover' | 'stretch'
) {
  let x = margin;
  let y = margin;
  let w = printW;
  let h = printH;

  const imgRatio = imgW / imgH;
  const printRatio = printW / printH;

  if (imageFit === 'stretch') {
    return { x, y, w, h };
  } else if (imageFit === 'contain') {
    if (imgRatio > printRatio) {
      // Fit dynamically horizontally
      w = printW;
      h = printW / imgRatio;
      y = margin + (printH - h) / 2; // vertically centered
    } else {
      // Fit dynamically vertically
      h = printH;
      w = printH * imgRatio;
      x = margin + (printW - w) / 2; // horizontally centered
    }
  } else {
    // 'cover' - scale to scale up without white margins, but clip (represented as max fill)
    if (imgRatio > printRatio) {
      h = printH;
      w = printH * imgRatio;
      x = margin + (printW - w) / 2;
    } else {
      w = printW;
      h = printW / imgRatio;
      y = margin + (printH - h) / 2;
    }
  }

  return { x, y, w, h };
}
