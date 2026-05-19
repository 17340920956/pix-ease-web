'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
  GripVertical,
  ChevronDown,
  ChevronUp,
  Images,
} from 'lucide-react';
import { useGifStore } from '@/store/useGifStore';
import { parseGifFileAdvanced, generateGifBlob, downloadFile, reverseFrames } from '@/lib/gifUtils';
import AuthGuard from '@/components/AuthGuard';
import TopHeader from '@/components/TopHeader';
import type { GifFrame } from '@/store/useGifStore';

/**
 * GIF 编辑器页面
 * 支持 GIF 帧编辑、播放、导出等功能
 * 需要登录后才能访问
 */
export default function GifEditorPage() {
  return (
    <AuthGuard>
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
    framesExpanded,
    addFrames,
    removeFrame,
    reorderFrames,
    setSelectedFrameIndex,
    setPlaybackSpeed,
    setFramesExpanded,
    reset,
  } = useGifStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameInputRef = useRef<HTMLInputElement>(null);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackStateRef = useRef({
    isPlaying: false,
    frameIndex: 0,
  });

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
            delay: 100, // 默认 100ms
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

    playbackStateRef.current.isPlaying = true;
    setIsPlaying(true);

    const playNext = () => {
      if (!playbackStateRef.current.isPlaying) return;

      const nextIndex =
        (playbackStateRef.current.frameIndex + 1) % frames.length;
      playbackStateRef.current.frameIndex = nextIndex;
      setSelectedFrameIndex(nextIndex);

      const delay = frames[nextIndex]?.delay || 100;
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
      setDragOverIndex(index);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggingIndex === null || draggingIndex === targetIndex) {
        setDraggingIndex(null);
        setDragOverIndex(null);
        return;
      }

      const newFrames = [...frames];
      const [removed] = newFrames.splice(draggingIndex, 1);
      newFrames.splice(targetIndex, 0, removed);

      reorderFrames(newFrames);
      setDraggingIndex(null);
      setDragOverIndex(null);

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
    setDragOverIndex(null);
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen gradient-bg">
      {/* 顶部导航 */}
      <TopHeader>
        <button
          onClick={handleExport}
          disabled={frames.length === 0 || isProcessing}
          className="flex items-center gap-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          <span>导出 GIF</span>
        </button>
      </TopHeader>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 上传区域 */}
        {frames.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 上传 GIF */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors text-center"
                style={{ borderColor: 'var(--input-border)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--input-border)'; }}
              >
                <Film className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--primary)' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  上传 GIF 文件
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  点击上传 GIF 文件，自动拆分为帧序列
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/gif"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* 批量上传普通图片 */}
              <div
                onClick={() => frameInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors text-center"
                style={{ borderColor: 'var(--input-border)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--success)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--input-border)'; }}
              >
                <Images className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--success)' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  批量上传图片
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  点击批量上传 JPG/PNG/WEBP 等图片，合成为 GIF
                </p>
              </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：预览区域 */}
            <div className="lg:col-span-2 space-y-4">
              {/* 主预览 */}
              <div className="glass rounded-2xl p-6">
                <div className="aspect-video rounded-xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--button-bg)' }}>
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
                  <button
                    onClick={() => {
                      stopPlayback();
                      setSelectedFrameIndex(Math.max(0, selectedFrameIndex - 1));
                    }}
                    disabled={selectedFrameIndex === 0}
                    className="p-2 transition-colors disabled:opacity-30"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => { if (selectedFrameIndex !== 0) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={togglePlayback}
                    className="p-3 rounded-full transition-colors"
                    style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      stopPlayback();
                      setSelectedFrameIndex(Math.min(frames.length - 1, selectedFrameIndex + 1));
                    }}
                    disabled={selectedFrameIndex === frames.length - 1}
                    className="p-2 transition-colors disabled:opacity-30"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => { if (selectedFrameIndex !== frames.length - 1) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                {/* 帧信息 */}
                <div className="text-center text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                  帧 {selectedFrameIndex + 1} / {frames.length}
                </div>
              </div>

              {/* 帧列表 - 可展开收起 */}
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setFramesExpanded(!framesExpanded)}
                    className="flex items-center gap-2 font-semibold transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {framesExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                    帧列表 ({frames.length})
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => frameInputRef.current?.click()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
                      style={{ backgroundColor: 'var(--success)', color: '#ffffff' }}
                    >
                      <Images className="w-4 h-4" />
                      添加帧
                    </button>
                    <button
                      onClick={handleReverse}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
                      style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      倒放
                    </button>
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

                {/* 始终显示两行预览 */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {frames.slice(0, 20).map((frame, index) => (
                    <motion.div
                      key={frame.id}
                      layout
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className="cursor-move rounded-lg overflow-hidden border-2 transition-all group"
                      style={{
                        borderColor: index === selectedFrameIndex
                          ? 'var(--primary)'
                          : dragOverIndex === index
                          ? 'var(--primary)'
                          : 'transparent',
                        boxShadow: index === selectedFrameIndex ? `0 0 0 2px var(--primary)` : 'none',
                        transform: dragOverIndex === index ? 'scale(1.05)' : 'scale(1)',
                        opacity: draggingIndex === index ? 0.5 : 1,
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
                            src={frame.canvas.toDataURL()}
                            alt={`Frame ${index + 1}`}
                            className="w-full aspect-square object-cover"
                            draggable={false}
                          />
                        )}
                        {/* 操作按钮组 */}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* 下载按钮 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFrame(frame, index);
                            }}
                            className="p-1 rounded"
                            style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff' }}
                            title="下载帧"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          {/* 删除按钮 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              stopPlayback();
                              removeFrame(index);
                            }}
                            disabled={frames.length <= 1}
                            className="p-1 rounded disabled:opacity-30"
                            style={{ backgroundColor: 'var(--danger)', color: '#ffffff' }}
                            title="删除帧"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="px-2 py-1 text-center flex items-center justify-center gap-1" style={{ backgroundColor: 'var(--text-primary)' }}>
                        <GripVertical className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs text-white">
                          {index + 1}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <AnimatePresence>
                  {framesExpanded && frames.length > 20 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 mt-2">
                        {frames.slice(20).map((frame, index) => (
                          <motion.div
                            key={frame.id}
                            layout
                            draggable
                            onDragStart={() => handleDragStart(index + 20)}
                            onDragOver={(e) => handleDragOver(e, index + 20)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index + 20)}
                            onDragEnd={handleDragEnd}
                            className="cursor-move rounded-lg overflow-hidden border-2 transition-all group"
                            style={{
                              borderColor: index + 20 === selectedFrameIndex
                                ? 'var(--primary)'
                                : dragOverIndex === index + 20
                                ? 'var(--primary)'
                                : 'transparent',
                              boxShadow: index + 20 === selectedFrameIndex ? `0 0 0 2px var(--primary)` : 'none',
                              transform: dragOverIndex === index + 20 ? 'scale(1.05)' : 'scale(1)',
                              opacity: draggingIndex === index + 20 ? 0.5 : 1,
                            }}
                            onClick={() => {
                              stopPlayback();
                              setSelectedFrameIndex(index + 20);
                              playbackStateRef.current.frameIndex = index + 20;
                            }}
                          >
                            <div className="relative">
                              {frame.canvas && (
                                <img
                                  src={frame.canvas.toDataURL()}
                                  alt={`Frame ${index + 21}`}
                                  className="w-full aspect-square object-cover"
                                  draggable={false}
                                />
                              )}
                              {/* 操作按钮组 */}
                              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* 下载按钮 */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadFrame(frame, index + 20);
                                  }}
                                  className="p-1 rounded"
                                  style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff' }}
                                  title="下载帧"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                                {/* 删除按钮 */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    stopPlayback();
                                    removeFrame(index + 20);
                                  }}
                                  disabled={frames.length <= 1}
                                  className="p-1 rounded disabled:opacity-30"
                                  style={{ backgroundColor: 'var(--danger)', color: '#ffffff' }}
                                  title="删除帧"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="px-2 py-1 text-center flex items-center justify-center gap-1" style={{ backgroundColor: 'var(--text-primary)' }}>
                              <GripVertical className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                              <span className="text-xs text-white">
                                {index + 21}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  提示：拖动帧可改变顺序，点击帧选中，悬停显示操作按钮
                  {frames.length > 20 && `（共 ${frames.length} 帧，折叠显示前 20 帧）`}
                </p>
              </div>
            </div>

            {/* 右侧：编辑工具 */}
            <div className="space-y-4">
              {/* 速度控制 */}
              <div className="glass rounded-2xl p-4 space-y-4">
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>播放速度</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[0.25, 0.5, 1, 2, 4, 8].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        // 如果正在播放，重启以应用新速度
                        if (playbackStateRef.current.isPlaying) {
                          stopPlayback();
                          setTimeout(() => startPlayback(), 0);
                        }
                      }}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
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
                    </button>
                  ))}
                </div>
              </div>

              {/* 全局操作 */}
              <div className="glass rounded-2xl p-4 space-y-4">
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>全局操作</h3>
                <button
                  onClick={() => {
                    stopPlayback();
                    reset();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    backgroundColor: 'var(--button-bg)',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)'; }}
                >
                  <RotateCcw className="w-4 h-4" />
                  重置所有
                </button>
              </div>
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
