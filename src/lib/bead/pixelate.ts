export function enhanceImage(
  imageData: ImageData,
  contrast: number = 1.15,
  saturation: number = 1.25,
): ImageData {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const cr = Math.min(255, Math.max(0, (r - 128) * contrast + 128));
    const cg = Math.min(255, Math.max(0, (g - 128) * contrast + 128));
    const cb = Math.min(255, Math.max(0, (b - 128) * contrast + 128));

    const gray = cr * 0.299 + cg * 0.587 + cb * 0.114;
    data[i] = Math.min(255, Math.max(0, gray + (cr - gray) * saturation));
    data[i + 1] = Math.min(255, Math.max(0, gray + (cg - gray) * saturation));
    data[i + 2] = Math.min(255, Math.max(0, gray + (cb - gray) * saturation));
  }
  return imageData;
}

export function pixelate(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const { width: srcW, height: srcH, data: srcData } = imageData;

  const dstData = new Uint8ClampedArray(targetWidth * targetHeight * 4);

  const cellW = srcW / targetWidth;
  const cellH = srcH / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcStartX = Math.floor(x * cellW);
      const srcStartY = Math.floor(y * cellH);
      const srcEndX = Math.min(srcW, Math.ceil((x + 1) * cellW));
      const srcEndY = Math.min(srcH, Math.ceil((y + 1) * cellH));

      let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
      let count = 0;

      for (let sy = srcStartY; sy < srcEndY; sy++) {
        for (let sx = srcStartX; sx < srcEndX; sx++) {
          const idx = (sy * srcW + sx) * 4;
          sumR += srcData[idx];
          sumG += srcData[idx + 1];
          sumB += srcData[idx + 2];
          sumA += srcData[idx + 3];
          count++;
        }
      }

      const dstIdx = (y * targetWidth + x) * 4;
      dstData[dstIdx] = Math.round(sumR / count);
      dstData[dstIdx + 1] = Math.round(sumG / count);
      dstData[dstIdx + 2] = Math.round(sumB / count);
      dstData[dstIdx + 3] = Math.round(sumA / count);
    }
  }

  return new ImageData(dstData, targetWidth, targetHeight);
}

export function imageDataToRgbPixels(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData;
  const pixels = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 3] = data[i * 4];
    pixels[i * 3 + 1] = data[i * 4 + 1];
    pixels[i * 3 + 2] = data[i * 4 + 2];
  }
  return pixels;
}

export function rgbPixelsToImageData(
  pixels: Float32Array, width: number, height: number,
  alphaMask?: Uint8Array
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = Math.max(0, Math.min(255, Math.round(pixels[i * 3])));
    data[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(pixels[i * 3 + 1])));
    data[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(pixels[i * 3 + 2])));
    data[i * 4 + 3] = alphaMask ? alphaMask[i] : 255;
  }
  return new ImageData(data, width, height);
}
