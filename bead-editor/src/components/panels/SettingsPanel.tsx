import { useState, useCallback, useRef, ChangeEvent, forwardRef, useImperativeHandle } from 'react';
import { useBeadStore } from '../../store/useBeadStore';
import { getColors } from '../../palette/colors';
import { nearestColor } from '../../utils/colorMatch';
import { floydSteinberg } from '../../utils/dithering';
import { pixelate, imageDataToRgbPixels } from '../../utils/pixelate';
import { findBoundingBox } from '../../utils/boundingBox';
import type { BeadColor, ColorCount, BeadSize, PixelSize } from '../../types';

export const SettingsPanel = forwardRef<{ triggerUpload: () => void }>((_props, ref) => {
  const store = useBeadStore();
  const {
    brand, setBrand,
    beadSize, setBeadSize,
    beadShape, setBeadShape,
    viewMode, setViewMode,
    showGridLabels, setShowGridLabels,
    showColorCodes, setShowColorCodes,
    customWidth, setCustomWidth,
    customHeight, setCustomHeight,
    useCustomSize, setUseCustomSize,
    dithering, setDithering,
    removeBackground, setRemoveBackground,
    imageUrl, setImageUrl,
    setOriginalImage,
    setIsProcessing,
    setProgressMessage,
    setBeads, setColorCounts, setBackgroundCount,
    reset,
  } = store;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useImperativeHandle(ref, () => ({
    triggerUpload: () => fileInputRef.current?.click(),
  }));

  const processImage = useCallback(async (
    sourceImageData: ImageData,
    useRemoveBg: boolean,
    useDithering: boolean,
    targetBrand: string,
    targetSize: PixelSize
  ) => {
    setIsProcessing(true);
    setProgressMessage('加载图片...');

    try {
      let workingData = sourceImageData;
      let alphaMask: Uint8Array | undefined;

      if (useRemoveBg) {
        setProgressMessage('AI 去背景中...');
        const worker = new Worker(
          new URL('../../workers/ai.worker.ts', import.meta.url),
          { type: 'module' }
        );
        workerRef.current = worker;

        const result = await new Promise<{
          imageData: ImageData;
          alphaMask: Uint8Array;
        } | null>((resolve) => {
          worker.onmessage = (e) => {
            if (e.data.type === 'remove-bg-done') {
              const p = e.data.payload;
              const imgData = new ImageData(
                new Uint8ClampedArray(p.data),
                p.width,
                p.height
              );
              resolve({ imageData: imgData, alphaMask: e.data.alphaMask });
            } else if (e.data.type === 'remove-bg-error') {
              console.warn('AI background removal failed:', e.data.error);
              resolve(null);
            }
          };
          worker.onerror = (err) => {
            console.error('Worker error:', err);
            resolve(null);
          };
          worker.postMessage({
            type: 'remove-bg',
            id: 1,
            payload: {
              data: sourceImageData.data,
              width: sourceImageData.width,
              height: sourceImageData.height,
            },
          });
        });

        worker.terminate();
        workerRef.current = null;

        if (result) {
          workingData = result.imageData;
          alphaMask = result.alphaMask;
        }
      }

      setProgressMessage('像素化处理...');
      const pixelated = pixelate(workingData, targetSize, targetSize);

      const alphaValues = new Uint8Array(targetSize * targetSize);
      for (let i = 0; i < targetSize * targetSize; i++) {
        alphaValues[i] = pixelated.data[i * 4 + 3];
      }

      const pixels = imageDataToRgbPixels(pixelated);

      if (useDithering) {
        setProgressMessage('抖动算法处理...');
        floydSteinberg(pixels, targetSize, targetSize);
      }

      setProgressMessage('颜色匹配中...');

      const palette = getColors(targetBrand);
      const beadMap = new Map<string, string>();
      let bgCount = 0;
      const colorCountMap = new Map<string, ColorCount>();

      for (let y = 0; y < targetSize; y++) {
        for (let x = 0; x < targetSize; x++) {
          const pi = y * targetSize + x;

          if (alphaValues[pi] < 30) {
            bgCount++;
            continue;
          }

          const i = pi * 3;
          const r = Math.max(0, Math.min(255, Math.round(pixels[i])));
          const g = Math.max(0, Math.min(255, Math.round(pixels[i + 1])));
          const b = Math.max(0, Math.min(255, Math.round(pixels[i + 2])));
          const matched = nearestColor(r, g, b, palette);
          const key = `${x},${y}`;
          beadMap.set(key, matched.hex);

          const existing = colorCountMap.get(matched.code);
          if (existing) {
            existing.count++;
          } else {
            colorCountMap.set(matched.code, {
              code: matched.code,
              name: matched.name,
              hex: matched.hex,
              count: 1,
            });
          }
        }
      }

      const counts = Array.from(colorCountMap.values()).sort((a, b) => b.count - a.count);

      setBeads(beadMap, targetSize, targetSize);
      setColorCounts(counts);
      setBackgroundCount(bgCount);
    } catch (err) {
      console.error('Image processing failed:', err);
    } finally {
      setIsProcessing(false);
      setProgressMessage('');
    }
  }, [setIsProcessing, setProgressMessage, setBeads, setColorCounts, setBackgroundCount]);

  const loadImage = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        setOriginalImage(imageData);

        let workingData = imageData;

        if (img.width > 2048 || img.height > 2048) {
          const maxDim = Math.max(img.width, img.height);
          const scale = 2048 / maxDim;
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.round(img.width * scale);
          smallCanvas.height = Math.round(img.height * scale);
          const smallCtx = smallCanvas.getContext('2d')!;
          smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
          workingData = smallCtx.getImageData(0, 0, smallCanvas.width, smallCanvas.height);
        }

        const maxDim = Math.max(workingData.width, workingData.height);
        const actualSize = maxDim <= beadSize ? maxDim : beadSize;
        processImage(workingData, removeBackground, dithering, brand, actualSize);
      } catch (err) {
        console.error('Image load/processing error:', err);
        setIsProcessing(false);
        setProgressMessage('处理失败，请重试');
        setTimeout(() => setProgressMessage(''), 3000);
      }
    };
    img.onerror = () => {
      console.error('Failed to load image');
      setIsProcessing(false);
      setProgressMessage('图片加载失败，请检查文件格式');
      setTimeout(() => setProgressMessage(''), 3000);
    };
    img.src = url;
  }, [setImageUrl, setOriginalImage, setIsProcessing, setProgressMessage, processImage, removeBackground, dithering, brand, beadSize]);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      reset();
      loadImage(file);
    }
  }, [loadImage, reset]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      reset();
      loadImage(file);
    }
  }, [loadImage, reset]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleBrandChange = useCallback((newBrand: string) => {
    setBrand(newBrand);
    if (store.originalImage) {
      processImage(store.originalImage, removeBackground, dithering, newBrand, beadSize);
    }
  }, [setBrand, store.originalImage, processImage, removeBackground, dithering, beadSize]);

  const handleSizeChange = useCallback((newSize: BeadSize) => {
    setBeadSize(newSize);
    if (store.originalImage) {
      processImage(store.originalImage, removeBackground, dithering, brand, newSize);
    }
  }, [setBeadSize, store.originalImage, processImage, removeBackground, dithering, brand]);

  const handleDitheringChange = useCallback((v: boolean) => {
    setDithering(v);
    if (store.originalImage) {
      processImage(store.originalImage, removeBackground, v, brand, beadSize);
    }
  }, [setDithering, store.originalImage, processImage, removeBackground, brand, beadSize]);

  const handleRemoveBgChange = useCallback((v: boolean) => {
    setRemoveBackground(v);
    if (store.originalImage) {
      processImage(store.originalImage, v, dithering, brand, beadSize);
    }
  }, [setRemoveBackground, store.originalImage, processImage, dithering, brand, beadSize]);

  return (
    <div className="settings-panel" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="panel-section">
        <h3 className="panel-title">图片上传</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button className="btn btn-primary btn-full" onClick={() => fileInputRef.current?.click()}>
          上传图片
        </button>
        {imageUrl && (
          <button className="btn btn-outline btn-full" onClick={reset}>
            清除重置
          </button>
        )}
      </div>

      <div className="panel-section">
        <h3 className="panel-title">品牌</h3>
        <div className="brand-switch">
          <button
            className={`btn btn-sm ${brand === 'artkal' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleBrandChange('artkal')}
          >
            Artkal
          </button>
          <button
            className={`btn btn-sm ${brand === 'mard' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleBrandChange('mard')}
          >
            MARD
          </button>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">拼豆尺寸</h3>
        <div className="size-switch">
          {([32, 64, 128] as BeadSize[]).map((size) => (
            <button
              key={size}
              className={`btn btn-sm ${beadSize === size ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleSizeChange(size)}
            >
              {size}x{size}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">拼豆形状</h3>
        <div className="brand-switch">
          <button
            className={`btn btn-sm ${beadShape === 'circle' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setBeadShape('circle')}
          >
            ● 圆形
          </button>
          <button
            className={`btn btn-sm ${beadShape === 'square' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setBeadShape('square')}
          >
            ■ 方形
          </button>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">视图模式</h3>
        <div className="brand-switch">
          <button
            className={`btn btn-sm ${viewMode === 'edit' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('edit')}
          >
            编辑
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'pattern' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('pattern')}
          >
            图纸
          </button>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">图纸标注</h3>
        <label className="toggle-row">
          <span>网格坐标数字</span>
          <input
            type="checkbox"
            checked={showGridLabels}
            onChange={(e) => setShowGridLabels(e.target.checked)}
          />
        </label>
        <label className="toggle-row">
          <span>显示色号编号</span>
          <input
            type="checkbox"
            checked={showColorCodes}
            onChange={(e) => setShowColorCodes(e.target.checked)}
          />
        </label>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">处理选项</h3>
        <label className="toggle-row">
          <span>AI 去背景</span>
          <input
            type="checkbox"
            checked={removeBackground}
            onChange={(e) => handleRemoveBgChange(e.target.checked)}
          />
        </label>
        <label className="toggle-row">
          <span>Floyd-Steinberg 抖动</span>
          <input
            type="checkbox"
            checked={dithering}
            onChange={(e) => handleDitheringChange(e.target.checked)}
          />
        </label>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">快捷键</h3>
        <div className="shortcut-list">
          <div className="shortcut-item">
            <kbd>Ctrl+Z</kbd><span>撤销</span>
          </div>
          <div className="shortcut-item">
            <kbd>Ctrl+Shift+Z</kbd><span>重做</span>
          </div>
          <div className="shortcut-item">
            <kbd>滚轮</kbd><span>缩放</span>
          </div>
        </div>
      </div>
    </div>
  );
});
