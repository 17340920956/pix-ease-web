export function pixelate(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const { width: srcW, height: srcH, data: srcData } = imageData;

  const dstData = new Uint8ClampedArray(targetWidth * targetHeight * 4);

  const scaleX = srcW / targetWidth;
  const scaleY = srcH / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.min(srcW - 1, Math.floor(x * scaleX));
      const srcY = Math.min(srcH - 1, Math.floor(y * scaleY));
      const srcIdx = (srcY * srcW + srcX) * 4;
      const dstIdx = (y * targetWidth + x) * 4;

      dstData[dstIdx] = srcData[srcIdx];
      dstData[dstIdx + 1] = srcData[srcIdx + 1];
      dstData[dstIdx + 2] = srcData[srcIdx + 2];
      dstData[dstIdx + 3] = srcData[srcIdx + 3];
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
