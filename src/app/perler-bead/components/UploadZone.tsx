'use client';

import { Upload, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

interface UploadZoneProps {
  isUploading: boolean;
  error: string | null;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

export default function UploadZone({ isUploading, error, onClick, onDrop, onDragOver }: UploadZoneProps) {
  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex-1 flex items-center justify-center"
    >
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={onClick}
        className="w-[420px] max-w-[90%] h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:scale-[1.01]"
        style={{
          borderColor: error ? 'var(--danger)' : 'var(--input-border)',
          backgroundColor: 'var(--card-bg)',
        }}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--primary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
              正在读取图片...
            </span>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)' }}>
              <Upload className="w-7 h-7" style={{ color: 'var(--primary)' }} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                拖拽图片到此处，或点击上传
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                支持 PNG / JPG / WebP · 最大 50MB
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
