/**
 * Client-side image optimizer for blueprint & floor plan uploads.
 * Downscales huge camera/gallery images (e.g. 12-48MP from phones/tablets)
 * to a crisp, high-resolution max dimension (1800px) and compresses to clean JPEG/WebP.
 * This ensures ultra-fast transmission to AI models, prevents 413 Payload Too Large,
 * and eliminates timeout/memory crashes on tablet/mobile browsers.
 */
export async function optimizeFloorPlanImage(
  file: File,
  maxDimension = 1800,
  quality = 0.88
): Promise<{ base64Url: string; mimeType: string; originalSize: number; optimizedSize: number }> {
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file.'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for optimization.'));

      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect ratio preserving resize
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to raw dataUrl if canvas context fails
          const rawUrl = e.target?.result as string;
          resolve({
            base64Url: rawUrl,
            mimeType: file.type || 'image/jpeg',
            originalSize,
            optimizedSize: rawUrl.length,
          });
          return;
        }

        // Fill background with white in case of transparent PNG blueprints
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG (best compatibility across all vision APIs)
        const targetMime = 'image/jpeg';
        const base64Url = canvas.toDataURL(targetMime, quality);

        resolve({
          base64Url,
          mimeType: targetMime,
          originalSize,
          optimizedSize: Math.round((base64Url.length * 3) / 4),
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
