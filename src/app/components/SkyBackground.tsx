'use client';

import { motion } from 'framer-motion';
import { useThemeStore } from '@/store/useThemeStore';

// ==================== 苹果风格 - 柔和光斑 ====================
const SoftOrb = ({ x, y, size, color, delay, duration }: { x: string; y: string; size: number; color: string; delay: number; duration: number }) => (
  <motion.div
    className="absolute pointer-events-none rounded-full"
    style={{
      left: x,
      top: y,
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      filter: 'blur(60px)',
    }}
    animate={{
      scale: [1, 1.15, 1],
      opacity: [0.3, 0.5, 0.3],
    }}
    transition={{
      duration,
      repeat: Infinity,
      delay,
      ease: 'easeInOut',
    }}
  />
);

// ==================== 苹果风格 - 网格纹理 ====================
const GridPattern = () => (
  <div
    className="absolute inset-0 pointer-events-none opacity-[0.02]"
    style={{
      backgroundImage: `
        linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
      `,
      backgroundSize: '80px 80px',
    }}
  />
);

// ==================== 白天主题 - 苹果风格 ====================
const DaySky = () => (
  <>
    <GridPattern />
    {/* 柔和光斑 - 更淡更优雅 */}
    <SoftOrb x="15%" y="10%" size={400} color="rgba(0,113,227,0.06)" delay={0} duration={12} />
    <SoftOrb x="75%" y="15%" size={350} color="rgba(175,82,222,0.05)" delay={3} duration={14} />
    <SoftOrb x="40%" y="50%" size={450} color="rgba(0,113,227,0.04)" delay={6} duration={16} />
    <SoftOrb x="85%" y="70%" size={300} color="rgba(255,55,95,0.04)" delay={2} duration={13} />
    <SoftOrb x="20%" y="80%" size={380} color="rgba(48,209,88,0.04)" delay={4} duration={15} />
  </>
);

// ==================== 夜间主题 - 苹果风格 ====================
const NightSky = () => (
  <>
    <GridPattern />
    {/* 柔和光斑 - 深色模式更暗 */}
    <SoftOrb x="20%" y="20%" size={350} color="rgba(10,132,255,0.05)" delay={0} duration={14} />
    <SoftOrb x="70%" y="30%" size={300} color="rgba(191,90,242,0.04)" delay={4} duration={16} />
    <SoftOrb x="45%" y="60%" size={400} color="rgba(10,132,255,0.03)" delay={7} duration={18} />
    <SoftOrb x="80%" y="75%" size={280} color="rgba(255,55,95,0.03)" delay={2} duration={15} />
    <SoftOrb x="25%" y="85%" size={320} color="rgba(48,209,88,0.03)" delay={5} duration={17} />
  </>
);

// ==================== 森林主题 - 苹果风格 ====================
const ForestTheme = () => (
  <>
    <GridPattern />
    {/* 柔和光斑 - 暖色调 */}
    <SoftOrb x="25%" y="15%" size={380} color="rgba(90,143,90,0.06)" delay={0} duration={13} />
    <SoftOrb x="65%" y="25%" size={320} color="rgba(138,122,90,0.05)" delay={3} duration={15} />
    <SoftOrb x="35%" y="55%" size={420} color="rgba(90,143,90,0.04)" delay={6} duration={17} />
    <SoftOrb x="80%" y="65%" size={280} color="rgba(122,138,106,0.05)" delay={2} duration={14} />
    <SoftOrb x="15%" y="80%" size={350} color="rgba(138,122,90,0.04)" delay={5} duration={16} />
  </>
);

// ==================== 主组件 ====================
export default function SkyBackground() {
  const { resolvedTheme } = useThemeStore();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {resolvedTheme === 'dark' && <NightSky />}
      {resolvedTheme === 'eye-care' && <ForestTheme />}
      {resolvedTheme === 'light' && <DaySky />}
    </div>
  );
}
