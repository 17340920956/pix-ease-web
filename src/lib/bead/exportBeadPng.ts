import { parseHexColor } from '@/lib/pixelation/colorMatch';
import type { BeadColor } from '@/lib/bead/types';

export interface ExportBeadPngOptions {
  beadMap: Map<string, string>;
  paletteColors: BeadColor[];
  width: number;
  height: number;
  beadShape: 'circle' | 'square';
}

/**
 * 将拼豆图纸导出为 PNG 并触发下载
 */
export function exportBeadToPng(options: ExportBeadPngOptions): void {
  const { beadMap, paletteColors, width: w, height: h, beadShape } = options;

  const hexToCode = new Map<string, string>();
  for (const c of paletteColors) {
    hexToCode.set(c.hex.toUpperCase(), c.code);
  }

  const countMap = new Map<string, number>();
  for (const hex of beadMap.values()) {
    countMap.set(hex, (countMap.get(hex) || 0) + 1);
  }
  const legendItems: { code: string; hex: string; count: number; percentage: number }[] = [];
  countMap.forEach((count, hex) => {
    const code = hexToCode.get(hex.toUpperCase()) || '';
    legendItems.push({ code, hex, count, percentage: 0 });
  });
  const grandTotal = legendItems.reduce((s, i) => s + i.count, 0);
  legendItems.forEach(i => i.percentage = grandTotal > 0 ? (i.count / grandTotal) * 100 : 0);
  legendItems.sort((a, b) => b.count - a.count);

  // 导出配置
  const expCellSize = 28;
  const expTotalW = w * expCellSize;
  const expGridH = h * expCellSize;
  const expPad = 24;
  const borderW = 4;
  const borderRadius = 8;

  // 品牌头部设计
  const brandHeaderH = 80;
  const statsBarH = 48;

  // 图例配置
  const itemsPerRow = Math.max(3, Math.min(5, Math.floor((expTotalW - expPad * 2) / 200)));
  const capsuleGap = 10;
  const capsuleH = 36;
  const capsuleW = Math.floor((expTotalW - expPad * 2 - (itemsPerRow - 1) * capsuleGap) / itemsPerRow);
  const capsuleR = 10;
  const legendRows = Math.ceil(legendItems.length / itemsPerRow);
  const legendTitleH = 24;
  const legendPadY = 20;
  const legendH = legendItems.length > 0
    ? legendPadY + legendTitleH + legendPadY + legendRows * (capsuleH + capsuleGap)
    : 0;
  const expTotalH = brandHeaderH + statsBarH + expGridH + legendH;

  const canvas = document.createElement('canvas');
  canvas.width = expTotalW + borderW * 2;
  canvas.height = expTotalH + borderW * 2;
  const ctx = canvas.getContext('2d')!;

  // 圆角矩形辅助函数
  function roundRect(x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  // 左半胶囊
  function halfCapsuleLeft(x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  // 右半胶囊
  function halfCapsuleRight(x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x, y + height);
    ctx.closePath();
  }

  // 背景底色
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 主内容区圆角背景
  ctx.fillStyle = '#ffffff';
  roundRect(borderW, borderW, expTotalW, expTotalH, borderRadius);
  ctx.fill();

  // ========================
  // 品牌头部区域
  // ========================
  const headerY = borderW;

  // 渐变背景条
  const gradient = ctx.createLinearGradient(borderW, headerY, borderW + expTotalW, headerY);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = gradient;
  roundRect(borderW, headerY, expTotalW, brandHeaderH, borderRadius);
  ctx.fill();

  // 品牌名称
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('PixEase', expPad, headerY + 14);

  // 副标题
  ctx.font = '12px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('专业拼豆图纸设计', expPad, headerY + 44);

  // 右侧：生成时间
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  ctx.textAlign = 'right';
  ctx.font = '11px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(`生成于 ${timeStr}`, borderW + expTotalW - expPad, headerY + 16);

  ctx.textAlign = 'right';
  ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(`${w} × ${h} 格`, borderW + expTotalW - expPad, headerY + 38);

  // ========================
  // 统计信息栏
  // ========================
  const statsY = headerY + brandHeaderH;
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(borderW, borderW + statsY, expTotalW, statsBarH);

  // 分隔线
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(borderW, borderW + statsY);
  ctx.lineTo(borderW + expTotalW, borderW + statsY);
  ctx.stroke();

  // 统计信息
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px -apple-system, system-ui, sans-serif';
  ctx.fillText('总计', expPad, borderW + statsY + statsBarH / 2);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
  const totalBeadText = `${grandTotal.toLocaleString()} 颗`;
  ctx.fillText(totalBeadText, expPad + 36, borderW + statsY + statsBarH / 2);

  ctx.fillStyle = '#6b7280';
  ctx.font = '11px -apple-system, system-ui, sans-serif';
  ctx.fillText(`颜色 ${legendItems.length} 种`, expPad + 140, borderW + statsY + statsBarH / 2);

  // 下分隔线
  const gridStartY = statsY + statsBarH;
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(borderW, borderW + gridStartY);
  ctx.lineTo(borderW + expTotalW, borderW + gridStartY);
  ctx.stroke();

  // ========================
  // 网格区域
  // ========================
  const gridY = borderW + gridStartY;

  // 棋盘格背景
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((x + y) % 2 === 1) {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(borderW + x * expCellSize, gridY + y * expCellSize, expCellSize, expCellSize);
      }
    }
  }

  // 网格线 — 按样式批量绘制
  // 每 20 格 — 灰色粗线
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let y = 0; y <= h; y += 20) {
    ctx.moveTo(borderW, gridY + y * expCellSize);
    ctx.lineTo(borderW + expTotalW, gridY + y * expCellSize);
  }
  for (let x = 0; x <= w; x += 20) {
    ctx.moveTo(borderW + x * expCellSize, gridY);
    ctx.lineTo(borderW + x * expCellSize, gridY + expGridH);
  }
  ctx.stroke();

  // 每 5 格 — 浅灰细线（跳过 20 的倍数，已由上面绘制）
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let y = 0; y <= h; y += 5) {
    if (y % 20 === 0) continue;
    ctx.moveTo(borderW, gridY + y * expCellSize);
    ctx.lineTo(borderW + expTotalW, gridY + y * expCellSize);
  }
  for (let x = 0; x <= w; x += 5) {
    if (x % 20 === 0) continue;
    ctx.moveTo(borderW + x * expCellSize, gridY);
    ctx.lineTo(borderW + x * expCellSize, gridY + expGridH);
  }
  ctx.stroke();

  const expBlockPadding = expCellSize * 0.08;
  const expBlockSize = expCellSize - expBlockPadding * 2;

  function expTextColor(hex: string): string {
    const [r, g, b] = parseHexColor(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#333' : '#fff';
  }

  // 豆子渲染
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = borderW + x * expCellSize + expCellSize / 2;
      const cy = gridY + y * expCellSize + expCellSize / 2;
      const hex = beadMap.get(`${x},${y}`);
      const code = hex ? hexToCode.get(hex.toUpperCase()) : undefined;

      if (hex && code) {
        if (beadShape === 'square') {
          // 方形豆子 - 带轻微阴影
          const bx = borderW + x * expCellSize + expBlockPadding;
          const by = gridY + y * expCellSize + expBlockPadding;
          
          // 阴影
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(bx + 1, by + 1, expBlockSize, expBlockSize);
          
          // 主体
          ctx.fillStyle = hex;
          ctx.fillRect(bx, by, expBlockSize, expBlockSize);
        } else {
          // 圆形豆子 - 带高光
          const radius = expBlockSize / 2;
          
          // 阴影
          ctx.beginPath();
          ctx.arc(cx + 1, cy + 1, radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fill();
          
          // 主体
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = hex;
          ctx.fill();
          
          // 高光
          ctx.beginPath();
          ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fill();
        }

        // 颜色代码
        ctx.fillStyle = expTextColor(hex);
        ctx.font = `bold ${Math.max(8, expCellSize * 0.32)}px -apple-system, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(code, cx, cy);
      }
    }
  }

  // ========================
  // 图例区域 - 与页面色卡胶囊保持一致
  // ========================
  if (legendItems.length > 0) {
    const legendStartY = gridY + expGridH;
    
    // 分隔线
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(borderW, borderW + legendStartY);
    ctx.lineTo(borderW + expTotalW, borderW + legendStartY);
    ctx.stroke();

    // 图例标题
    const titleY = borderW + legendStartY + legendPadY;
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('色卡图例', expPad, titleY);

    ctx.fillStyle = '#6b7280';
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.fillText(`按数量排序 · 共 ${legendItems.length} 色`, expPad + 80, titleY);

    // 色卡胶囊
    const capsulesStartY = titleY + legendTitleH + legendPadY;
    
    legendItems.forEach((item, i) => {
      const col = i % itemsPerRow;
      const row = Math.floor(i / itemsPerRow);
      const cx = expPad + col * (capsuleW + capsuleGap);
      const cy = capsulesStartY + row * (capsuleH + capsuleGap);

      // 胶囊阴影
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      roundRect(cx + 1, cy + 2, capsuleW, capsuleH, capsuleR);
      ctx.fill();

      // 左半部分：颜色色块
      const halfW = capsuleW / 2;
      
      // 颜色部分
      halfCapsuleLeft(cx, cy, halfW, capsuleH, capsuleR);
      ctx.fillStyle = item.hex;
      ctx.fill();

      // 颜色部分分隔线
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + halfW, cy + 2);
      ctx.lineTo(cx + halfW, cy + capsuleH - 2);
      ctx.stroke();

      // 右半部分：色号 + 数量
      halfCapsuleRight(cx + halfW, cy, halfW, capsuleH, capsuleR);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // 外边框
      roundRect(cx, cy, capsuleW, capsuleH, capsuleR);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 右半部分文字
      const rightCenterX = cx + halfW + halfW / 2;
      
      // 色号
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 12px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.code, rightCenterX, cy + capsuleH / 2 - 6);

      // 数量
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px -apple-system, system-ui, sans-serif';
      ctx.fillText(`×${item.count.toLocaleString()}`, rightCenterX, cy + capsuleH / 2 + 8);
    });
  }

  const link = document.createElement('a');
  link.download = `PixEase-拼豆图纸-${w}x${h}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
