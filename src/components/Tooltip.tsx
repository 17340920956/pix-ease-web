'use client';

import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  delay?: number;
}

interface TooltipPos {
  left: number;
  top: number;
  place: 'bottom' | 'top';
}

const TOOLTIP_BG = 'rgba(30, 30, 35, 0.88)';

export default function Tooltip({ text, children, delay = 0 }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<TooltipPos | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const cancelTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const handleEnter = () => {
    cancelTimer();
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current || !triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const place = rect.top < 60 ? 'top' : 'bottom';
      setPos({
        left: rect.left + rect.width / 2,
        top: place === 'bottom' ? rect.bottom + 6 : rect.top - 6,
        place,
      });
      setShow(true);
    }, delay);
  };

  const handleLeave = () => {
    cancelTimer();
    setShow(false);
  };

  return (
    <div
      ref={triggerRef}
      className="inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {show && text && pos && (
        <div
          className="fixed z-[9999] pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] font-medium shadow-lg"
          style={{
            left: pos.left,
            top: pos.top,
            transform: 'translate(-50%, 0)',
            backgroundColor: TOOLTIP_BG,
            color: '#fff',
            opacity: 1,
            transition: 'opacity 0.1s',
          }}
        >
          {text}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-2 h-1"
            style={{
              [pos.place === 'bottom' ? 'top' : 'bottom']: '-4px',
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              [pos.place === 'bottom' ? 'borderTop' : 'borderBottom']: `4px solid ${TOOLTIP_BG}`,
            }}
          />
        </div>
      )}
    </div>
  );
}
