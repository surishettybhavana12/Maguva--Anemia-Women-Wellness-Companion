/**
 * Utility to compress and resize image files on the client side before API upload.
 * Reduces token consumption (TPM) and network payload size for AI Vision / OCR endpoints.
 */

export interface CompressionResult {
  base64Data: string;
  mimeType: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  width?: number;
  height?: number;
}

export async function compressAndPrepareImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.80
): Promise<CompressionResult> {
  const originalSizeKb = Math.round(file.size / 1024);
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (!isImage) {
    // If PDF or non-image file, read directly via FileReader
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const sizeKb = Math.round((rawDataUrl.length * 0.75) / 1024);
    return {
      base64Data: rawDataUrl,
      mimeType: isPdf ? 'application/pdf' : file.type || 'application/octet-stream',
      originalSizeKb,
      compressedSizeKb: sizeKb,
    };
  }

  // Handle Image compression via Canvas
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional aspect ratio scaling
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const rawResult = e.target?.result as string;
          resolve({
            base64Data: rawResult,
            mimeType: file.type || 'image/jpeg',
            originalSizeKb,
            compressedSizeKb: originalSizeKb,
          });
          return;
        }

        // Draw image with high quality scaling and contrast preservation for text readability
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export compressed JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        const compressedSizeKb = Math.round((compressedDataUrl.length * 0.75) / 1024);

        resolve({
          base64Data: compressedDataUrl,
          mimeType: 'image/jpeg',
          originalSizeKb,
          compressedSizeKb,
          width,
          height,
        });
      };
      img.onerror = () => {
        const rawResult = e.target?.result as string;
        resolve({
          base64Data: rawResult,
          mimeType: file.type || 'image/jpeg',
          originalSizeKb,
          compressedSizeKb: originalSizeKb,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
