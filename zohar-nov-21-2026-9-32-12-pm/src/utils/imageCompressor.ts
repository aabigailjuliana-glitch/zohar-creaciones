/**
 * Image compressor utility for fast cloud synchronization and mobile optimization.
 * Ensures images fit within Firestore's 1MB document limit and load instantly across all devices.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  preferredMimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * Compresses an image file (or base64 string) down to an optimized size
 * preserving aspect ratio and quality while staying lightweight.
 */
export async function compressImage(
  source: File | string,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.75,
    preferredMimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const processImageElement = (img: HTMLImageElement, mime: string) => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          // Fallback if dimensions cannot be read
          width = 600;
          height = 600;
        }

        // Calculate proportional scale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        // Use high quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // White background for JPEGs to prevent black backgrounds on transparent PNGs
        if (mime === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        let compressedDataUrl = canvas.toDataURL(mime, quality);

        // If data URL is still larger than ~350KB, reduce quality and dimensions once more
        if (compressedDataUrl.length > 450 * 1024 && mime !== 'image/png') {
          const secondCanvas = document.createElement('canvas');
          const halfWidth = Math.round(width * 0.8);
          const halfHeight = Math.round(height * 0.8);
          secondCanvas.width = halfWidth;
          secondCanvas.height = halfHeight;
          const secondCtx = secondCanvas.getContext('2d');
          if (secondCtx) {
            if (mime === 'image/jpeg') {
              secondCtx.fillStyle = '#FFFFFF';
              secondCtx.fillRect(0, 0, halfWidth, halfHeight);
            }
            secondCtx.drawImage(img, 0, 0, halfWidth, halfHeight);
            compressedDataUrl = secondCanvas.toDataURL(mime, 0.65);
          }
        }

        resolve(compressedDataUrl);
      } catch (err) {
        reject(err);
      }
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // If original had PNG extension and we want transparency, check format
      let targetMime: string = preferredMimeType;
      if (typeof source !== 'string' && source.type === 'image/png' && preferredMimeType === 'image/png') {
        targetMime = 'image/png';
      }
      processImageElement(img, targetMime);
    };

    img.onerror = (e) => {
      reject(new Error(`Failed to load image for compression: ${e}`));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          img.src = result;
        } else {
          reject(new Error('FileReader returned empty result'));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(source);
    }
  });
}
