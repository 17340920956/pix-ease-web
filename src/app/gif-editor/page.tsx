'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film,
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Trash2,
  RotateCcw,
  Images,
  Repeat,
  Plus,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useGifStore } from '@/store/useGifStore';
import { parseGifFileAdvanced, generateGifBlob, downloadFile, reverseFrames } from '@/lib/gifUtils';
import AuthGuard from '@/components/AuthGuard';
import TopHeader from '@/components/TopHeader';
import type { GifFrame } from '@/store/useGifStore';

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

/**
 * GIF 编辑器页面
 * 支持 GIF 帧编辑、播放、导出等功能
 * 需要登录后才能访问
 */
export default function GifEditorPage() {
  return (
    <AuthGuard allowGuest>
      <GifEditorContent />
    </AuthGuard>
  );
}

/**
 * GIF 编辑器内容组件
 */
function GifEditorContent() {
  const {
    frames,
    selectedFrameIndex,
    playbackSpeed,
    addFrames,
    removeFrame,
    reorderFrames,
    setSelectedFrameIndex,
    setPlaybackSpeed,
    reset,
    undo,
    redo,
    toggleFrameHidden,
    unhideAllFrames,
  } = useGifStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  useEffect(() => {
    loopRef.current = isLooping;
  }, [isLooping]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const dataUrlCacheRef = useRef<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameInputRef = useRef<HTMLInputElement>(null);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackStateRef = useRef({
    isPlaying: false,
    frameIndex: 0,
  });
  const loopRef = useRef(false);

  /**
   * 读取文件为图片
   */
  const readFileAsImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  /**
   * 处理 GIF 文件上传
   */
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      setProgress(0);

      try {
        const parsedFrames = await parseGifFileAdvanced(file);
        addFrames(parsedFrames);
      } catch (error) {
        console.error('GIF parsing error:', error);
        alert('GIF 文件解析失败');
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [addFrames]
  );

  /**
   * 处理添加帧（普通图片）
   */
  const handleAddFrame = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      setIsProcessing(true);
      setProgress(0);

      try {
        const newFrames: GifFrame[] = [];
        const totalFiles = files.length;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const img = await readFileAsImage(file);

          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);

          newFrames.push({
            id: crypto.randomUUID(),
            canvas,
            imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
            delay: 100,
          });

          setProgress(Math.round(((i + 1) / totalFiles) * 100));
        }

        addFrames(newFrames);
      } catch (error) {
        console.error('Frame adding error:', error);
        alert('添加帧失败');
      } finally {
        setIsProcessing(false);
        if (frameInputRef.current) frameInputRef.current.value = '';
      }
    },
    [addFrames]
  );

  /**
   * 导出 GIF
   */
  const handleExport = useCallback(async () => {
    if (frames.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const blob = await generateGifBlob(frames, (p) => setProgress(p));
      downloadFile(blob, 'animated.gif');
    } catch (error) {
      console.error('GIF export error:', error);
      alert('GIF 导出失败');
    } finally {
      setIsProcessing(false);
    }
  }, [frames]);

  /**
   * 开始播放
   */
  const startPlayback = useCallback(() => {
    if (frames.length === 0) return;

    const allFrames = frames;
    const visibleFrames = allFrames.filter((f) => !f.hidden);
    if (visibleFrames.length === 0) return;

    const currentIdx = playbackStateRef.current.frameIndex;
    const currentFrame = allFrames[currentIdx];
    const shouldStartFromCurrent = currentIdx >= 0 && currentIdx < allFrames.length && currentFrame && !currentFrame.hidden;

    const startIndex = shouldStartFromCurrent
      ? currentIdx
      : allFrames.findIndex((f) => !f.hidden);

    playbackStateRef.current.isPlaying = true;
    playbackStateRef.current.frameIndex = startIndex;
    setSelectedFrameIndex(startIndex);
    setIsPlaying(true);

    const findNextVisible = (fromIndex: number) => {
      for (let i = fromIndex + 1; i < allFrames.length; i++) {
        if (!allFrames[i].hidden) return i;
      }
      return -1;
    };

    const findFirstVisible = () => {
      return allFrames.findIndex((f) => !f.hidden);
    };

    const playNext = () => {
      if (!playbackStateRef.current.isPlaying) return;

      const currentIndex = playbackStateRef.current.frameIndex;
      const nextVisible = findNextVisible(currentIndex);

      if (nextVisible === -1) {
        if (!loopRef.current) {
          setTimeout(() => {
            playbackStateRef.current.isPlaying = false;
            setIsPlaying(false);
          }, (allFrames[currentIndex]?.delay || 100) / playbackSpeed);
          return;
        }
        const firstIdx = findFirstVisible();
        playbackStateRef.current.frameIndex = firstIdx;
        setSelectedFrameIndex(firstIdx);
        const delay = allFrames[firstIdx]?.delay || 100;
        playbackTimerRef.current = setTimeout(playNext, delay / playbackSpeed);
        return;
      }

      playbackStateRef.current.frameIndex = nextVisible;
      setSelectedFrameIndex(nextVisible);

      const delay = allFrames[nextVisible]?.delay || 100;
      playbackTimerRef.current = setTimeout(playNext, delay / playbackSpeed);
    };

    playNext();
  }, [frames, playbackSpeed, setSelectedFrameIndex]);

  /**
   * 停止播放
   */
  const stopPlayback = useCallback(() => {
    playbackStateRef.current.isPlaying = false;
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  /**
   * 切换播放状态
   */
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, startPlayback, stopPlayback]);

  /**
   * 处理倒放
   */
  const handleReverse = useCallback(() => {
    stopPlayback();
    const reversed = reverseFrames(frames);
    // 清空当前帧，添加反转后的帧
    reorderFrames([]);
    addFrames(reversed);
    setSelectedFrameIndex(0);
    playbackStateRef.current.frameIndex = 0;
  }, [frames, stopPlayback, reorderFrames, addFrames, setSelectedFrameIndex]);

  /**
   * 下载单帧
   */
  const downloadFrame = useCallback((frame: GifFrame, index: number) => {
    if (!frame.canvas) return;
    frame.canvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, `frame_${index + 1}.png`);
      }
    });
  }, []);

  // 拖拽处理
  const handleDragStart = useCallback((index: number) => {
    setDraggingIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragOverIndexRef.current === index) return;
      dragOverIndexRef.current = index;
      (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
    },
    []
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      dragOverIndexRef.current = null;
      if (draggingIndex === null || draggingIndex === targetIndex) {
        setDraggingIndex(null);
        return;
      }

      const newFrames = [...frames];
      const [removed] = newFrames.splice(draggingIndex, 1);
      newFrames.splice(targetIndex, 0, removed);

      reorderFrames(newFrames);
      setDraggingIndex(null);

      // 更新选中索引
      if (selectedFrameIndex === draggingIndex) {
        setSelectedFrameIndex(targetIndex);
      } else if (
        draggingIndex < selectedFrameIndex &&
        targetIndex >= selectedFrameIndex
      ) {
        setSelectedFrameIndex(selectedFrameIndex - 1);
      } else if (
        draggingIndex > selectedFrameIndex &&
        targetIndex <= selectedFrameIndex
      ) {
        setSelectedFrameIndex(selectedFrameIndex + 1);
      }
    },
    [draggingIndex, frames, reorderFrames, selectedFrameIndex, setSelectedFrameIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
    dragOverIndexRef.current = null;
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
      }
    };
  }, []);

  // 缓存帧图片 dataURL，避免每次渲染都重新序列化 Canvas
  const frameDataUrls = useMemo(() => {
    const urls: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (!frame.canvas) {
        urls.push('');
        continue;
      }
      const cached = dataUrlCacheRef.current.get(frame.id);
      if (cached) {
        urls.push(cached);
      } else {
        const url = frame.canvas.toDataURL();
        dataUrlCacheRef.current.set(frame.id, url);
        urls.push(url);
      }
    }
    return urls;
  }, [frames]);

  // 帧变化时清理缓存中已删除的帧
  useEffect(() => {
    const frameIds = new Set(frames.map(f => f.id));
    for (const key of dataUrlCacheRef.current.keys()) {
      if (!frameIds.has(key)) {
        dataUrlCacheRef.current.delete(key);
      }
    }
  }, [frames]);

  return (
    <div className="h-screen gradient-bg flex flex-col overflow-hidden">
      {/* 顶部导航 */}
      <TopHeader />

      <div className="flex-1 overflow-hidden p-4">
        {/* 上传区域 */}
        {frames.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex items-center justify-center"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
              <motion.div
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all text-center group"
                style={{ borderColor: 'var(--input-border)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(59,130,246,0.05)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--input-border)'; (e.currentTarget as HTMLDivElement).style.backgroundColor = ''; }}
              >
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: 'var(--primary)' }}>
                  <Film className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  上传 GIF 文件
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  自动拆分为帧序列进行编辑
                </p>
              </motion.div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/gif"
                onChange={handleFileUpload}
                className="hidden"
              />

              <motion.div
                onClick={() => frameInputRef.current?.click()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all text-center group"
                style={{ borderColor: 'var(--input-border)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--success)'; (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(34,197,94,0.05)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--input-border)'; (e.currentTarget as HTMLDivElement).style.backgroundColor = ''; }}
              >
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: 'var(--success)' }}>
                  <Images className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  批量上传图片
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  上传 JPG/PNG/WEBP 合成为 GIF
                </p>
              </motion.div>
              <input
                ref={frameInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/bmp"
                multiple
                onChange={handleAddFrame}
                className="hidden"
              />
            </div>
          </motion.div>
        )}

        {/* 编辑区域 */}
        {frames.length > 0 && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
            {/* 左侧：预览 + 播放控制 + 速度 + 操作 */}
            <div className="flex flex-col min-h-0 overflow-hidden">
              <div className="glass rounded-2xl p-4 flex flex-col flex-1 min-h-0">
                <div className="flex-1 rounded-xl flex items-center justify-center overflow-hidden min-h-0"
                  style={{
                    backgroundColor: 'var(--button-bg)',
                    backgroundImage: 'repeating-conic-gradient(var(--hover-overlay) 0% 25%, transparent 0% 50%) 50% / 20px 20px',
                  }}>
                  {frames[selectedFrameIndex]?.canvas && (
                    <img
                      key={`preview-${selectedFrameIndex}`}
                      src={frames[selectedFrameIndex].canvas!.toDataURL()}
                      alt={`Frame ${selectedFrameIndex + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                </div>

                {/* 播放控制 */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  {/* 帧进度 */}
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedFrameIndex + 1}</span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/</span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{frames.length}</span>
                  </div>

                  <motion.button
                    onClick={() => {
                      stopPlayback();
                      setSelectedFrameIndex(Math.max(0, selectedFrameIndex - 1));
                    }}
                    disabled={selectedFrameIndex === 0}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={springFast}
                    className="p-2 transition-colors disabled:opacity-30"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => { if (selectedFrameIndex !== 0) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                  >
                    <SkipBack className="w-5 h-5" />
                  </motion.button>

                  <motion.button
                    onClick={togglePlayback}
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} transition={springFast}
                    className="p-3 rounded-full transition-colors"
                    style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      stopPlayback();
                      setSelectedFrameIndex(Math.min(frames.length - 1, selectedFrameIndex + 1));
                    }}
                    disabled={selectedFrameIndex === frames.length - 1}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={springFast}
                    className="p-2 transition-colors disabled:opacity-30"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => { if (selectedFrameIndex !== frames.length - 1) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                  >
                    <SkipForward className="w-5 h-5" />
                  </motion.button>

                  {/* 循环播放切换 */}
                  <motion.button
                    onClick={() => setIsLooping(!isLooping)}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={springFast}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      color: isLooping ? 'var(--primary)' : 'var(--text-muted)',
                      backgroundColor: isLooping ? 'var(--button-bg)' : 'transparent',
                    }}
                    title={isLooping ? '关闭循环播放' : '开启循环播放'}
                    onMouseEnter={(e) => { if (!isLooping) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                    onMouseLeave={(e) => { if (!isLooping) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                  >
                    <Repeat className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* 播放速度 */}
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>速度</span>
                    {[0.25, 0.5, 1, 2, 4, 8].map((speed) => (
                      <motion.button
                        key={speed}
                        onClick={() => {
                          setPlaybackSpeed(speed);
                          if (playbackStateRef.current.isPlaying) {
                            stopPlayback();
                            setTimeout(() => startPlayback(), 0);
                          }
                        }}
                        whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}
                        className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: playbackSpeed === speed ? 'var(--primary)' : 'var(--button-bg)',
                          color: playbackSpeed === speed ? '#ffffff' : 'var(--text-secondary)',
                        }}
                        onMouseEnter={(e) => {
                          if (playbackSpeed !== speed) {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (playbackSpeed !== speed) {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        {speed}x
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 mt-3">
                  <motion.button
                    onClick={handleExport}
                    disabled={frames.length === 0 || isProcessing}
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-base font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--primary)' }}
                  >
                    <Download className="w-5 h-5" />
                    导出 GIF
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      stopPlayback();
                      reset();
                    }}
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-base font-medium transition-colors"
                    style={{
                      backgroundColor: 'var(--button-bg)',
                      color: 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)'; }}
                  >
                    <RotateCcw className="w-5 h-5" />
                    重置
                  </motion.button>
                </div>
              </div>
            </div>

            {/* 右侧：帧列表 */}
            <div className="flex flex-col min-h-0 overflow-hidden">
              <div className="glass rounded-2xl p-3 flex flex-col flex-1 min-h-0">
                {/* 固定标题 */}
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}>
                    帧列表
                    <span className="px-1.5 py-0.5 rounded-md text-xs font-medium"
                      style={{ backgroundColor: 'var(--button-bg)', color: 'var(--text-secondary)' }}>
                      {frames.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {frames.some((f) => f.hidden) && (
                      <motion.button
                        onClick={unhideAllFrames}
                        whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                        style={{ backgroundColor: 'var(--button-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                        title="取消全部隐藏"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        取消隐藏
                      </motion.button>
                    )}
                    <motion.button
                      onClick={undo}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}
                      className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                      style={{ backgroundColor: 'var(--button-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                      title="撤销"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      onClick={redo}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}
                      className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                      style={{ backgroundColor: 'var(--button-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                      title="重做"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      onClick={() => frameInputRef.current?.click()}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={springFast}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ backgroundColor: 'var(--success)', color: '#ffffff' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      添加帧
                    </motion.button>
                  </div>
                </div>

                <input
                  ref={frameInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/bmp"
                  multiple
                  onChange={handleAddFrame}
                  className="hidden"
                />

                {/* 可滚动帧图片区域 */}
                <div className="overflow-y-auto flex-1 min-h-0">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {frames.map((frame, index) => (
                          <motion.div
                            key={frame.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className="cursor-move rounded-lg overflow-hidden transition-transform group relative"
                            style={{
                              outline: index === selectedFrameIndex ? '3px solid var(--primary)' : 'none',
                              outlineOffset: -1,
                              opacity: draggingIndex === index ? 0.5 : frame.hidden ? 0.35 : 1,
                              transform: 'scale(1)',
                            }}
                            onClick={() => {
                              stopPlayback();
                              setSelectedFrameIndex(index);
                              playbackStateRef.current.frameIndex = index;
                            }}
                          >
                            <div className="relative">
                              {frame.canvas && (
                                <img
                                  src={frameDataUrls[index] || ''}
                                  alt={`Frame ${index + 1}`}
                                  className="w-full aspect-square object-cover"
                                  draggable={false}
                                />
                              )}
                              <div className="absolute bottom-0 right-0 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-tl">{index + 1}</div>
                              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <motion.button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFrameHidden(index);
                                  }}
                                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} transition={springFast}
                                  className="p-1 rounded cursor-pointer"
                                  style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff' }}
                                  title={frame.hidden ? '显示帧' : '隐藏帧'}
                                >
                                  {frame.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </motion.button>
                                <motion.button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadFrame(frame, index);
                                  }}
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={springFast}
                                  className="p-1 rounded"
                                  style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff' }}
                                  title="下载帧"
                                >
                                  <Download className="w-3 h-3" />
                                </motion.button>
                                <motion.button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    stopPlayback();
                                    removeFrame(index);
                                  }}
                                  disabled={frames.length <= 1}
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={springFast}
                                  className="p-1 rounded disabled:opacity-30"
                                  style={{ backgroundColor: 'var(--danger)', color: '#ffffff' }}
                                  title="删除帧"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
              </div>

                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  提示：拖动帧可改变顺序，点击帧选中，悬停显示操作按钮
                </p>
              </div>
          </div>
        )}

        {/* 处理进度 */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed bottom-6 right-6 glass rounded-xl p-4 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>处理中...</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{progress}%</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
