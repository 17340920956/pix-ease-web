'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Download,
  Trash2,
  Image as ImageIcon,
  FileType,
  Minimize2,
  Grid3x3,
  Type,
  X,
  Check,
  ArrowRight,
  Palette,
  TextCursorInput,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useImageStore } from '@/store/useImageStore';
import TopHeader from '@/components/TopHeader';
import {
  convertImageFormat,
  compressImage,
  pixelateImage,
  gameboyPixelate,
  convertToAscii,
  formatFileSize,
  getFileExtension,
  FORMAT_CONVERSIONS,
  ASCII_PRESETS,
} from '@/lib/imageUtils';
import AuthGuard from '@/components/AuthGuard';
import type { ImageFile, ProcessType, ImageFormat, CompressQuality, PixelStyle, AsciiPreset } from '@/store/useImageStore';

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

/**
 * 图片处理工具页面
 * 支持格式转换、压缩、像素风、ASCII 转换等功能
 * 需要登录后才能访问
 */
export default function ImageToolPage() {
  return (
    <AuthGuard allowGuest>
      <ImageToolContent />
    </AuthGuard>
  );
}

/**
 * 图片处理工具内容组件
 */
function ImageToolContent() {
  const {
    images,
    processType,
    targetFormat,
    compressQuality,
    customQuality,
    pixelSize,
    pixelStyle,
    showPixelGrid,
    asciiPreset,
    asciiCustomChars,
    asciiWidth,
    asciiBgColor,
    asciiTextColors,
    asciiTextColorIndex,
    addImages,
    removeImage,
    updateImage,
    setProcessType,
    setTargetFormat,
    setCompressQuality,
    setCustomQuality,
    setPixelSize,
    setPixelStyle,
    setShowPixelGrid,
    setAsciiPreset,
    setAsciiCustomChars,
    setAsciiWidth,
    setAsciiBgColor,
    setAsciiTextColors,
    setAsciiTextColorIndex,
    clearImages,
  } = useImageStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [asciiResult, setAsciiResult] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [compareImage, setCompareImage] = useState<ImageFile | null>(null);
  const [fullPreviewUrl, setFullPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 处理文件上传
   */
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      addImages(Array.from(files));
      // 重置 input 值，允许重复上传同一文件
      e.target.value = '';
    },
    [addImages]
  );

  /**
   * 处理图片
   */
  const processImages = useCallback(async () => {
    if (images.length === 0) return;

    setIsProcessing(true);

    try {
      // 先标记所有待处理图片为处理中状态
      const pendingImages = images.filter((img) => img.status !== 'completed');
      pendingImages.forEach((image) => {
        updateImage(image.id, { status: 'processing' });
      });

      // 并行处理所有图片
      await Promise.all(
        pendingImages.map(async (image) => {
          let result: Blob | string;
          let processedUrl: string;

          try {
            switch (processType) {
              case 'convert':
                result = await convertImageFormat(image.file, targetFormat);
                processedUrl = URL.createObjectURL(result as Blob);
                updateImage(image.id, {
                  status: 'completed',
                  processedUrl,
                  processedSize: (result as Blob).size,
                  processParams: { processType, targetFormat },
                });
                break;

              case 'compress': {
                let quality: number;
                switch (compressQuality) {
                  case 'lossless':
                    quality = 0.95;
                    break;
                  case 'high':
                    quality = 0.8;
                    break;
                  case 'extreme':
                    quality = 0.5;
                    break;
                  case 'custom':
                    quality = customQuality / 100;
                    break;
                  default:
                    quality = 0.8;
                }
                result = await compressImage(image.file, quality);
                processedUrl = URL.createObjectURL(result);
                updateImage(image.id, {
                  status: 'completed',
                  processedUrl,
                  processedSize: result.size,
                  processParams: { processType, compressQuality, customQuality },
                });
                break;
              }

              case 'pixelate': {
                switch (pixelStyle) {
                  case 'pixel':
                    result = await pixelateImage(image.file, pixelSize, showPixelGrid);
                    break;
                  case 'gameboy':
                    result = await gameboyPixelate(image.file, pixelSize);
                    break;
                  default:
                    result = await pixelateImage(image.file, pixelSize, showPixelGrid);
                }
                processedUrl = URL.createObjectURL(result as Blob);
                updateImage(image.id, {
                  status: 'completed',
                  processedUrl,
                  processedSize: (result as Blob).size,
                  processParams: { processType, pixelSize, pixelStyle },
                });
                break;
              }

              case 'ascii': {
                const asciiHtml = await convertToAscii(image.file, {
                  preset: asciiPreset,
                  customChars: asciiCustomChars,
                  width: asciiWidth,
                  colored: pixelStyle === 'ascii-color',
                });
                setAsciiResult(asciiHtml);

                // 将 ASCII HTML 渲染为图片用于对比展示
                // 使用等宽渲染：每个字符（无论中英文）都占相同的单元格宽度
                const cellWidth = 10;
                const cellHeight = 14;
                const fontSize = 12;

                // 按行分割
                const allLines = asciiHtml.split('\n');
                const lines: string[] = [];
                for (const line of allLines) {
                  lines.push(line);
                }

                // 计算 canvas 尺寸：每行字符数 × 单元格宽度
                let maxLineChars = 0;
                for (const line of lines) {
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = line;
                  let charCount = 0;
                  for (const node of Array.from(tempDiv.childNodes)) {
                    const text = node.textContent || '';
                    charCount += text.length;
                  }
                  if (charCount > maxLineChars) maxLineChars = charCount;
                }

                const padding = 20;
                const canvasWidth = Math.max(maxLineChars * cellWidth + padding * 2, 200);
                const canvasHeight = Math.max(lines.length * cellHeight + padding * 2, 100);

                const asciiCanvas = document.createElement('canvas');
                asciiCanvas.width = canvasWidth;
                asciiCanvas.height = canvasHeight;
                const asciiCtx = asciiCanvas.getContext('2d')!;

                // 设置背景色 - 使用用户选择的颜色
                asciiCtx.fillStyle = asciiBgColor;
                asciiCtx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height);

                // 绘制 ASCII 文本 - 每个字符占固定 cellWidth
                asciiCtx.font = `${fontSize}px "Courier New", "Lucida Console", "Consolas", monospace`;
                asciiCtx.textBaseline = 'top';

                for (let row = 0; row < lines.length; row++) {
                  const line = lines[row];
                  let x = padding;
                  const y = row * cellHeight + padding;

                  if (!line.trim()) continue;

                  // 解析行中的 HTML span 和普通文本
                  const lineDiv = document.createElement('div');
                  lineDiv.innerHTML = line;

                  for (const node of Array.from(lineDiv.childNodes)) {
                    if (node.nodeType === Node.TEXT_NODE) {
                      const text = node.textContent || '';
                      for (const ch of text) {
                        asciiCtx.fillStyle = asciiTextColors[asciiTextColorIndex];
                        asciiCtx.fillText(ch, x, y);
                        x += cellWidth;
                      }
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                      const el = node as HTMLElement;
                      const text = el.textContent || '';
                      if (!text) continue;

                      // 提取颜色 - 支持 rgb() 和 #hex 格式
                      let color: string;
                      const styleAttr = el.getAttribute('style') || '';
                      const colorMatch = styleAttr.match(/color:\s*([^;]+)/i);
                      if (colorMatch) {
                        color = colorMatch[1].trim();
                      } else {
                        color = asciiTextColors[asciiTextColorIndex];
                      }

                      asciiCtx.fillStyle = color;
                      for (const ch of text) {
                        asciiCtx.fillText(ch, x, y);
                        x += cellWidth;
                      }
                    }
                  }
                }

                const asciiBlob = await new Promise<Blob>((resolve) => {
                  asciiCanvas.toBlob((blob) => resolve(blob!), 'image/png');
                });
                const asciiProcessedUrl = URL.createObjectURL(asciiBlob);

                updateImage(image.id, {
                  status: 'completed',
                  processedUrl: asciiProcessedUrl,
                  processedSize: asciiBlob.size,
                  processParams: { processType, asciiPreset, asciiWidth },
                });
                break;
              }
            }
          } catch (error) {
            console.error(`Processing error for image ${image.id}:`, error);
            updateImage(image.id, {
              status: 'error',
              error: '处理失败',
            });
          }
        })
      );
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    images,
    processType,
    targetFormat,
    compressQuality,
    customQuality,
    pixelSize,
    pixelStyle,
    showPixelGrid,
    asciiPreset,
    asciiCustomChars,
    asciiWidth,
    asciiBgColor,
    asciiTextColors,
    asciiTextColorIndex,
    updateImage,
  ]);

  /**
   * 下载处理后的图片
   */
  const downloadImage = useCallback((image: ImageFile) => {
    if (!image.processedUrl) return;

    const a = document.createElement('a');
    a.href = image.processedUrl;
    const ext = processType === 'convert' ? targetFormat : getFileExtension(image.file.name);
    a.download = `processed_${image.file.name.replace(/\.[^/.]+$/, '')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [processType, targetFormat]);

  /**
   * 获取处理类型图标
   */
  const getProcessTypeIcon = (type: ProcessType) => {
    switch (type) {
      case 'convert':
        return <FileType className="w-5 h-5" />;
      case 'compress':
        return <Minimize2 className="w-5 h-5" />;
      case 'pixelate':
        return <Grid3x3 className="w-5 h-5" />;
      case 'ascii':
        return <Type className="w-5 h-5" />;
    }
  };

  /**
   * 获取处理类型名称
   */
  const getProcessTypeName = (type: ProcessType) => {
    switch (type) {
      case 'convert':
        return '格式转换';
      case 'compress':
        return '图片压缩';
      case 'pixelate':
        return '像素风格';
      case 'ascii':
        return 'ASCII 艺术';
    }
  };

  const getProcessTypeColor = (type: ProcessType) => {
    switch (type) {
      case 'convert': return '#9333ea';
      case 'compress': return '#16a34a';
      case 'pixelate': return '#ea580c';
      case 'ascii': return '#db2777';
    }
  };

  /**
   * 计算压缩率
   */
  const getCompressionRate = (original: number, processed: number) => {
    if (original === 0) return 0;
    return Math.round(((original - processed) / original) * 100);
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* 顶部导航 */}
      <TopHeader />

      <div className="w-full max-w-[1920px] mx-auto p-4 lg:p-6 space-y-6">
        {/* 处理类型选择 */}
        <div className="glass rounded-2xl p-4">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {(['convert', 'compress', 'pixelate', 'ascii'] as ProcessType[]).map(
              (type) => (
                <motion.button
                  key={type}
                  onClick={() => setProcessType(type)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm"
                  style={{
                    backgroundColor: processType === type
                      ? type === 'convert' ? '#9333ea'
                      : type === 'compress' ? '#16a34a'
                      : type === 'pixelate' ? '#ea580c'
                      : '#db2777'
                      : 'var(--button-bg)',
                    color: processType === type ? '#ffffff' : 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (processType !== type) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (processType !== type) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                    }
                  }}
                 whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}>
                  {getProcessTypeIcon(type)}
                  <span className="font-medium">
                    {getProcessTypeName(type)}
                  </span>
                </motion.button>
              )
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧：图片列表和上传 */}
          <div className="flex-1 min-w-0 space-y-4 order-1">
            {/* 上传区域 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="glass rounded-2xl p-8 border-2 border-dashed cursor-pointer transition-colors"
              style={{ borderColor: 'var(--input-border)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--input-border)'; }}
            >
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  上传图片
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  点击或拖拽上传图片文件
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* 图片列表 */}
            <AnimatePresence>
              {images.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      图片列表 ({images.length})
                    </h3>
                    <motion.button
                      onClick={processImages}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                      style={{
                        backgroundColor: isProcessing ? 'var(--text-muted)' : 'var(--primary)',
                        color: '#ffffff',
                      }}
                     whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}>
                      {isProcessing ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      开始处理
                    </motion.button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))' }}>
                    {images.map((image) => {
                      const typeColor = image.processParams?.processType ? getProcessTypeColor(image.processParams.processType) : 'transparent';
                      const typeColorLight = image.processParams?.processType ? getProcessTypeColor(image.processParams.processType) + '18' : 'transparent';
                      return (
                      <motion.div
                        key={image.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative group flex flex-col rounded-xl overflow-hidden"
                        style={{
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {/* 图片预览 - 透明背景棋盘格 */}
                        <div className="aspect-square relative overflow-hidden"
                          style={{
                            backgroundImage: 'repeating-conic-gradient(var(--button-bg) 0% 25%, transparent 0% 50%) 50% / 20px 20px',
                          }}>
                          {image.status === 'completed' && image.processedUrl ? (
                            <div className="w-full h-full flex">
                              <div className="flex-1 relative cursor-pointer" style={{ borderRight: '1px solid var(--border-color)' }} onClick={() => setFullPreviewUrl(image.previewUrl)}>
                                <img
                                  src={image.previewUrl}
                                  alt="Original"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                                  原图
                                </div>
                              </div>
                              <div className="flex-1 relative cursor-pointer" onClick={() => setFullPreviewUrl(image.processedUrl!)}>
                                <img
                                  src={image.processedUrl}
                                  alt="Processed"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-1 right-1 text-white text-[10px] px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: typeColor }}>
                                  {image.processParams?.processType === 'convert' && '转换'}
                                  {image.processParams?.processType === 'compress' && '压缩'}
                                  {image.processParams?.processType === 'pixelate' && '像素'}
                                  {image.processParams?.processType === 'ascii' && 'ASCII'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={image.previewUrl}
                              alt={image.file.name}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setFullPreviewUrl(image.previewUrl)}
                            />
                          )}
                        </div>

                        {/* 详情卡片 */}
                        <div className="p-3 space-y-2" style={{ backgroundColor: typeColorLight }}>
                          {/* 文件名 */}
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {image.file.name}
                          </p>
                          {/* 文件大小 - 未完成时 */}
                          {image.status !== 'completed' && (
                            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <ImageIcon className="w-3 h-3" />
                              <span>{formatFileSize(image.originalSize)}</span>
                            </div>
                          )}
                          {/* 处理完成：显示处理详情 */}
                          {image.status === 'completed' && image.processedSize && (
                            <>
                              <div className="flex items-center justify-between text-xs">
                                <span style={{ color: 'var(--text-muted)' }}>处理前</span>
                                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{formatFileSize(image.originalSize)}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span style={{ color: 'var(--text-muted)' }}>处理后</span>
                                <span className="font-medium" style={{ color: typeColor }}>{formatFileSize(image.processedSize)}</span>
                              </div>
                              {image.processParams?.processType === 'compress' && (
                                <div className="flex items-center justify-between text-xs">
                                  <span style={{ color: 'var(--text-muted)' }}>压缩率</span>
                                  <span className="font-bold" style={{ color: getCompressionRate(image.originalSize, image.processedSize) >= 0 ? 'var(--success)' : 'var(--warning)' }}>
                                    {getCompressionRate(image.originalSize, image.processedSize) >= 0 ? '' : '+'}{Math.abs(getCompressionRate(image.originalSize, image.processedSize))}%
                                  </span>
                                </div>
                              )}
                              {image.processParams?.processType === 'convert' && (
                                <div className="flex items-center justify-between text-xs">
                                  <span style={{ color: 'var(--text-muted)' }}>目标格式</span>
                                  <span className="font-bold" style={{ color: 'var(--accent)' }}>{(image.processParams?.targetFormat || 'png').toUpperCase()}</span>
                                </div>
                              )}
                              {image.processParams?.processType === 'pixelate' && (
                                <div className="flex items-center justify-between text-xs">
                                  <span style={{ color: 'var(--text-muted)' }}>像素块</span>
                                  <span className="font-bold" style={{ color: 'var(--warning)' }}>{image.processParams?.pixelSize || 8}px</span>
                                </div>
                              )}
                              {image.processParams?.processType === 'ascii' && (
                                <>
                                  <div className="flex items-center justify-between text-xs">
                                    <span style={{ color: 'var(--text-muted)' }}>字符集</span>
                                    <span className="font-bold" style={{ color: 'var(--accent)' }}>{ASCII_PRESETS[image.processParams?.asciiPreset || 'default']?.name || '自定义'}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span style={{ color: 'var(--text-muted)' }}>模式</span>
                                    <span className="font-bold" style={{ color: 'var(--accent)' }}>{(image.processParams?.pixelStyle || 'ascii-bw') === 'ascii-color' ? '彩色' : '黑白'}</span>
                                  </div>
                                </>
                              )}
                              {/* 操作按钮 7:3 */}
                              <div className="grid grid-cols-10 gap-1.5 pt-1">
                                <motion.button
                                  onClick={() => setCompareImage(image)}
                                  className="col-span-7 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                  style={{ backgroundColor: typeColor, color: '#ffffff' }}
                                  whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}
                                >
                                  <Eye className="w-3 h-3" />
                                  对比
                                </motion.button>
                                <motion.button
                                  onClick={() => {
                                    if (image.processedUrl) {
                                      URL.revokeObjectURL(image.processedUrl);
                                    }
                                    setAsciiResult('');
                                    updateImage(image.id, {
                                      status: 'pending',
                                      processedUrl: undefined,
                                      processedSize: undefined,
                                      processParams: undefined,
                                    });
                                  }}
                                  className="col-span-3 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center"
                                  style={{ backgroundColor: 'var(--button-bg)', color: 'var(--text-secondary)' }}
                                  whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}
                                  title="重置为未处理状态"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </motion.button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* 悬浮操作按钮 */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {image.status === 'completed' && (
                            <motion.button
                              onClick={() => downloadImage(image)}
                              className="p-1.5 text-white rounded-lg"
                              style={{ backgroundColor: 'var(--primary)' }}
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={springFast}
                            >
                              <Download className="w-4 h-4" />
                            </motion.button>
                          )}
                          <motion.button
                            onClick={() => removeImage(image.id)}
                            className="p-1.5 text-white rounded-lg"
                            style={{ backgroundColor: 'var(--danger)' }}
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={springFast}
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        </div>

                        {/* 状态指示 */}
                        {image.status === 'processing' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


          </div>

          {/* 右侧：设置面板 */}
          <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-4 order-2">
            <div className="glass rounded-2xl p-4 space-y-6">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>处理设置</h3>

              {/* 格式转换设置 */}
              {processType === 'convert' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>
                      目标格式
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {([
                        { value: 'jpg', label: 'JPG', desc: '有损压缩格式，适合照片和复杂图像，文件较小' },
                        { value: 'png', label: 'PNG', desc: '无损压缩格式，支持透明背景，适合图标和截图' },
                        { value: 'webp', label: 'WebP', desc: 'Google开发的现代格式，压缩率高，支持透明和动画' },
                        { value: 'avif', label: 'AVIF', desc: '下一代图像格式，压缩率极高，支持HDR和透明' },
                        { value: 'heic', label: 'HEIC', desc: '苹果设备常用格式，高效压缩，支持Live Photo' },
                        { value: 'svg', label: 'SVG', desc: '矢量图形格式，可无限缩放，适合图标和Logo' },
                      ] as { value: ImageFormat; label: string; desc: string }[]).map(
                        (format) => (
                          <div key={format.value} className="relative group">
                            <motion.button
                              onClick={() => setTargetFormat(format.value)}
                              className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                              style={{
                                backgroundColor: targetFormat === format.value ? 'var(--primary)' : 'var(--button-bg)',
                                color: targetFormat === format.value ? '#ffffff' : 'var(--text-secondary)',
                              }}
                              onMouseEnter={(e) => {
                                if (targetFormat !== format.value) {
                                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)';
                                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (targetFormat !== format.value) {
                                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)';
                                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                                }
                              }}
                             whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}>
                              {format.label}
                            </motion.button>
                            {/* 悬浮提示 */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 w-48 text-center leading-relaxed"
                              style={{ backgroundColor: 'var(--text-primary)', color: 'var(--background)' }}
                            >
                              {format.desc}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: 'var(--text-primary)' }}></div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 压缩设置 */}
              {processType === 'compress' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>
                      压缩质量
                    </label>
                    <div className="space-y-2">
                      {(
                        [
                          { value: 'lossless', label: '无损压缩' },
                          { value: 'high', label: '高清压缩' },
                          { value: 'extreme', label: '极限压缩' },
                          { value: 'custom', label: '自定义' },
                        ] as { value: CompressQuality; label: string }[]
                      ).map((option) => (
                        <motion.button
                          key={option.value}
                          onClick={() => setCompressQuality(option.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors"
                          style={{
                            backgroundColor: compressQuality === option.value ? 'var(--primary)' : 'var(--button-bg)',
                            color: compressQuality === option.value ? '#ffffff' : 'var(--text-secondary)',
                          }}
                          onMouseEnter={(e) => {
                            if (compressQuality !== option.value) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)';
                              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (compressQuality !== option.value) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)';
                              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                            }
                          }}
                         whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}>
                          {option.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {compressQuality === 'custom' && (
                    <div>
                      <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>
                        质量: {customQuality}%
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={customQuality}
                        onChange={(e) =>
                          setCustomQuality(parseInt(e.target.value))
                        }
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 像素化设置 */}
              {processType === 'pixelate' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>
                      风格
                    </label>
                    <div className="space-y-2">
                      {(
                        [
                          {
                            value: 'pixel',
                            label: '像素风',
                          },
                          {
                            value: 'gameboy',
                            label: 'GameBoy',
                          },
                        ] as {
                          value: PixelStyle;
                          label: string;
                        }[]
                      ).map((option) => (
                        <motion.button
                          key={option.value}
                          onClick={() => setPixelStyle(option.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors"
                          style={{
                            backgroundColor: pixelStyle === option.value ? 'var(--primary)' : 'var(--button-bg)',
                            color: pixelStyle === option.value ? '#ffffff' : 'var(--text-secondary)',
                          }}
                          onMouseEnter={(e) => {
                            if (pixelStyle !== option.value) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)';
                              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (pixelStyle !== option.value) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)';
                              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                            }
                          }}
                         whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}>
                          {option.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>
                      像素块大小: {pixelSize}px
                    </label>
                    <input
                      type="range"
                      min="4"
                      max="64"
                      value={pixelSize}
                      onChange={(e) =>
                        setPixelSize(parseInt(e.target.value))
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      <span>4px</span>
                      <span>64px</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      数值越大，像素块越大，风格越明显
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <Grid3x3 className="w-4 h-4" />
                      显示辅助网格
                    </label>
                    <motion.button
                      onClick={() => setShowPixelGrid(!showPixelGrid)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      style={{ backgroundColor: showPixelGrid ? 'var(--primary)' : 'var(--text-muted)' }}
                     whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}>
                      <span
                        className="inline-block h-4 w-4 transform rounded-full transition-transform"
                        style={{
                          backgroundColor: '#ffffff',
                          transform: showPixelGrid ? 'translateX(1.5rem)' : 'translateX(0.25rem)',
                        }}
                      />
                    </motion.button>
                  </div>
                  <p className="text-xs -mt-2" style={{ color: 'var(--text-muted)' }}>
                    开启后在像素块之间显示白色网格线，方便手工复刻
                  </p>
                </div>
              )}

              {/* ASCII 设置 */}
              {processType === 'ascii' && (
                <div className="space-y-5">
                  {/* 风格选择 */}
                  <div>
                    <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>
                      风格
                    </label>
                    <div className="space-y-2">
                      {(
                        [
                          { value: 'ascii-bw', label: '黑白 ASCII' },
                          { value: 'ascii-color', label: '彩色 ASCII' },
                        ] as { value: PixelStyle; label: string }[]
                      ).map((option) => (
                        <motion.button
                          key={option.value}
                          onClick={() => {
                            setPixelStyle(option.value);
                            // 选择风格时重置颜色为默认值
                            setAsciiBgColor('#0f172a');
                            setAsciiTextColorIndex(0);
                          }}
                          className="w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors"
                          style={{
                            backgroundColor: pixelStyle === option.value ? 'var(--primary)' : 'var(--button-bg)',
                            color: pixelStyle === option.value ? '#ffffff' : 'var(--text-secondary)',
                          }}
                          onMouseEnter={(e) => {
                            if (pixelStyle !== option.value) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)';
                              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (pixelStyle !== option.value) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)';
                              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                            }
                          }}
                         whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}>
                          {option.label}
                        </motion.button>
                      ))}
                    </div>

                    {/* 颜色设置 - 放在风格下方 */}
                    <div className="mt-4 space-y-4">
                      {/* 背景颜色 */}
                      <div>
                        <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>
                          背景颜色
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {[
                            { color: '#0f172a', name: '黑色' },
                            { color: '#ffffff', name: '白色' },
                            { color: '#fef3c7', name: '暖黄' },
                            { color: '#dcfce7', name: '浅绿' },
                            { color: '#dbeafe', name: '浅蓝' },
                            { color: '#fce7f3', name: '浅粉' },
                          ].map((preset) => {
                            const isActive = asciiBgColor === preset.color;
                            return (
                              <button
                                key={preset.color}
                                onClick={() => setAsciiBgColor(preset.color)}
                                className="relative w-7 h-7 rounded transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
                                style={{
                                  backgroundColor: preset.color,
                                  transform: isActive ? 'scale(1.15)' : 'scale(1)',
                                  outline: isActive ? '2px solid var(--primary)' : 'none',
                                  outlineOffset: isActive ? 2 : 0,
                                }}
                                title={preset.name}
                                onMouseEnter={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.outline = '2px solid var(--primary)';
                                    e.currentTarget.style.outlineOffset = '2px';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.outline = 'none';
                                    e.currentTarget.style.outlineOffset = '0';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }
                                }}
                              />
                            );
                          })}
                        </div>
                        {/* 背景颜色自定义输入 */}
                        <div className="flex items-center gap-2">
                          <div className="relative w-7 h-7 rounded-lg border-2 cursor-pointer overflow-hidden flex-shrink-0"
                            style={{ borderColor: 'var(--input-border)' }}
                          >
                            <div
                              className="w-full h-full"
                              style={{ backgroundColor: asciiBgColor }}
                            />
                            <input
                              type="color"
                              value={asciiBgColor}
                              onChange={(e) => setAsciiBgColor(e.target.value)}
                              className="w-full h-full opacity-0 cursor-pointer absolute inset-0"
                            />
                          </div>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>#</span>
                          <input
                            type="text"
                            value={asciiBgColor.replace('#', '')}
                            onChange={(e) => {
                              let value = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                              if (value.length === 3 || value.length === 6) {
                                setAsciiBgColor('#' + value);
                              } else if (value.length > 0) {
                                setAsciiBgColor('#' + value);
                              }
                            }}
                            placeholder="000000"
                            className="w-20 px-2 py-1 rounded text-xs font-mono uppercase focus:outline-none"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              border: '1px solid var(--input-border)',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </div>
                      </div>

                      {/* 文字颜色 */}
                      <div>
                        <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>
                          文字颜色
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {asciiTextColors.map((color, index) => {
                            const isActive = asciiTextColorIndex === index;
                            return (
                              <button
                                key={`${color}-${index}`}
                                onClick={() => setAsciiTextColorIndex(index)}
                                className="relative w-7 h-7 rounded transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
                                style={{
                                  backgroundColor: color,
                                  transform: isActive ? 'scale(1.15)' : 'scale(1)',
                                  outline: isActive ? '2px solid var(--primary)' : 'none',
                                  outlineOffset: isActive ? 2 : 0,
                                }}
                                onMouseEnter={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.outline = '2px solid var(--primary)';
                                    e.currentTarget.style.outlineOffset = '2px';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.outline = 'none';
                                    e.currentTarget.style.outlineOffset = '0';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }
                                }}
                              />
                            );
                          })}
                        </div>
                        {/* 文字颜色自定义输入 */}
                        <div className="flex items-center gap-2">
                          <div className="relative w-7 h-7 rounded-lg border-2 cursor-pointer overflow-hidden flex-shrink-0"
                            style={{ borderColor: 'var(--input-border)' }}
                          >
                            <div
                              className="w-full h-full"
                              style={{ backgroundColor: asciiTextColors[asciiTextColorIndex] }}
                            />
                            <input
                              type="color"
                              value={asciiTextColors[asciiTextColorIndex]}
                              onChange={(e) => {
                                const newColors = [...asciiTextColors];
                                newColors[asciiTextColorIndex] = e.target.value;
                                setAsciiTextColors(newColors);
                              }}
                              className="w-full h-full opacity-0 cursor-pointer absolute inset-0"
                            />
                          </div>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>#</span>
                          <input
                            type="text"
                            value={asciiTextColors[asciiTextColorIndex].replace('#', '')}
                            onChange={(e) => {
                              let value = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                              if (value.length === 3 || value.length === 6) {
                                const newColors = [...asciiTextColors];
                                newColors[asciiTextColorIndex] = '#' + value;
                                setAsciiTextColors(newColors);
                              } else if (value.length > 0) {
                                const newColors = [...asciiTextColors];
                                newColors[asciiTextColorIndex] = '#' + value;
                                setAsciiTextColors(newColors);
                              }
                            }}
                            placeholder="000000"
                            className="w-20 px-2 py-1 rounded text-xs font-mono uppercase focus:outline-none"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              border: '1px solid var(--input-border)',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 字符集预设 */}
                  <div>
                    <label className="text-sm block mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <TextCursorInput className="w-4 h-4" />
                      字符集预设
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(ASCII_PRESETS) as [AsciiPreset, typeof ASCII_PRESETS[string]][]).map(
                        ([key, preset]) => (
                          <motion.button
                            key={key}
                            onClick={() => setAsciiPreset(key)}
                            className="px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors"
                            style={{
                              backgroundColor: asciiPreset === key ? 'var(--primary)' : 'var(--button-bg)',
                              color: asciiPreset === key ? '#ffffff' : 'var(--text-secondary)',
                            }}
                            onMouseEnter={(e) => {
                              if (asciiPreset !== key) {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)';
                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (asciiPreset !== key) {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)';
                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                              }
                            }}
                           whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}>
                            <div className="flex items-center justify-between">
                              <span>{preset.name}</span>
                            </div>
                            {preset.chars && (
                              <div className="text-xs opacity-60 mt-1 truncate font-mono">
                                {preset.chars}
                              </div>
                            )}
                          </motion.button>
                        )
                      )}
                    </div>
                  </div>

                  {/* 自定义字符输入 */}
                  {asciiPreset === 'custom' && (
                    <div>
                      <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>
                        自定义字符
                      </label>
                      <textarea
                        value={asciiCustomChars}
                        onChange={(e) => setAsciiCustomChars(e.target.value)}
                        placeholder="输入自定义字符，例如：@#*+=-:. "
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          border: '1px solid var(--input-border)',
                          color: 'var(--text-primary)',
                        }}
                        rows={2}
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        支持中文、字母、符号等任意字符
                      </p>
                    </div>
                  )}

                  {/* 输出宽度 */}
                  <div>
                    <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>
                      输出宽度: {asciiWidth} 字符
                    </label>
                    <input
                      type="range"
                      min="40"
                      max="200"
                      value={asciiWidth}
                      onChange={(e) => setAsciiWidth(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      <span>40</span>
                      <span>200</span>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* 清空按钮 */}
            {images.length > 0 && (
              <motion.button
                onClick={clearImages}
                whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)';
                  e.currentTarget.style.borderColor = 'var(--danger)';
                  e.currentTarget.style.color = 'var(--danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <Trash2 className="w-4 h-4" />
                清空全部
              </motion.button>
            )}

            {/* 统计信息 */}
            {images.length > 0 && (
              <div className="glass rounded-2xl p-4 space-y-3">
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>统计信息</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                    <span>总文件数</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{images.length}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                    <span>总大小</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatFileSize(
                        images.reduce((sum, img) => sum + img.originalSize, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                    <span>已完成</span>
                    <span className="font-medium" style={{ color: 'var(--success)' }}>
                      {images.filter((img) => img.status === 'completed').length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 处理对比弹窗 */}
      <AnimatePresence>
        {compareImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setCompareImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto"
              style={{ backgroundColor: 'var(--card-bg)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {compareImage.processParams?.processType === 'compress' && '压缩对比'}
                  {compareImage.processParams?.processType === 'convert' && '格式转换对比'}
                  {compareImage.processParams?.processType === 'pixelate' && '像素化对比'}
                  {compareImage.processParams?.processType === 'ascii' && 'ASCII 艺术对比'}
                </h3>
                <motion.button
                  onClick={() => setCompareImage(null)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                 whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}>
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 处理前 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>原图</span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{formatFileSize(compareImage.originalSize)}</span>
                  </div>
                  <div className="aspect-square rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--button-bg)' }}>
                    <img
                      src={compareImage.previewUrl}
                      alt="Original"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* 处理后 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {compareImage.processParams?.processType === 'compress' && '压缩后'}
                      {compareImage.processParams?.processType === 'convert' && '转换后'}
                      {compareImage.processParams?.processType === 'pixelate' && '像素化'}
                      {compareImage.processParams?.processType === 'ascii' && 'ASCII 艺术'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                        {formatFileSize(compareImage.processedSize || 0)}
                      </span>
                      {compareImage.processParams?.processType === 'compress' && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0) >= 0 ? 'var(--success)' : 'var(--warning)', backgroundColor: 'var(--button-bg)' }}>
                          {getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0) >= 0 ? '-' : '+'}{Math.abs(getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0))}%
                        </span>
                      )}
                      {compareImage.processParams?.processType === 'convert' && compareImage.processedSize && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: getCompressionRate(compareImage.originalSize, compareImage.processedSize) > 0 ? 'var(--success)' : 'var(--warning)', backgroundColor: 'var(--button-bg)' }}>
                          {getCompressionRate(compareImage.originalSize, compareImage.processedSize) > 0 ? '-' : '+'}{Math.abs(getCompressionRate(compareImage.originalSize, compareImage.processedSize))}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="aspect-square rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--button-bg)' }}>
                    {compareImage.processedUrl && (
                      <img
                        src={compareImage.processedUrl}
                        alt="Processed"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--button-bg)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>原始大小</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatFileSize(compareImage.originalSize)}</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--button-bg)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>处理后</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{formatFileSize(compareImage.processedSize || 0)}</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--button-bg)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {compareImage.processParams?.processType === 'compress' && (getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0) >= 0 ? '节省空间' : '体积增加')}
                    {compareImage.processParams?.processType === 'convert' && '大小变化'}
                    {compareImage.processParams?.processType === 'pixelate' && '大小变化'}
                    {compareImage.processParams?.processType === 'ascii' && '大小变化'}
                  </p>
                  <p className="text-lg font-bold" style={{ color: compareImage.processParams?.processType === 'compress' ? (getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0) >= 0 ? 'var(--success)' : 'var(--warning)') : 'var(--accent)' }}>
                    {compareImage.processParams?.processType === 'compress' && `${getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0) >= 0 ? '' : '+'}${Math.abs(getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0))}%`}
                    {compareImage.processParams?.processType === 'convert' && `${getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0) > 0 ? '-' : '+'}${Math.abs(getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0))}%`}
                    {compareImage.processParams?.processType === 'pixelate' && `${getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0) > 0 ? '-' : '+'}${Math.abs(getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0))}%`}
                    {compareImage.processParams?.processType === 'ascii' && `${getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0) > 0 ? '-' : '+'}${Math.abs(getCompressionRate(compareImage.originalSize, compareImage.processedSize || 0))}%`}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 单图全屏预览弹窗 */}
      <AnimatePresence>
        {fullPreviewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-8"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
            onClick={() => setFullPreviewUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={fullPreviewUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </motion.div>
            <motion.button
              onClick={() => setFullPreviewUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
