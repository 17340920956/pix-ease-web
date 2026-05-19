'use client';

import { memo, useCallback, useState, useRef } from 'react';
import { Plus, ChevronDown, Palette } from 'lucide-react';

export interface PaletteColor {
  color: string;
  name?: string;
}

export interface PaletteData {
  id: string;
  name: string;
  colors: PaletteColor[];
}

export const PRESET_PALETTES: PaletteData[] = [
  {
    id: 'default',
    name: '默认',
    colors: [
      { color: '#1d1d1f' }, { color: '#86868b' }, { color: '#a1a1a6' }, { color: '#d2d2d7' },
      { color: '#ff3b30' }, { color: '#ff9500' }, { color: '#ffcc00' }, { color: '#34c759' },
      { color: '#0071e3' }, { color: '#5ac8fa' }, { color: '#5856d6' }, { color: '#af52de' },
      { color: '#ff2d55' }, { color: '#a2845e' }, { color: '#ffffff' }, { color: '#000000' },
    ],
  },
  {
    id: 'pico8',
    name: 'PICO-8',
    colors: [
      { color: '#000000' }, { color: '#1D2B53' }, { color: '#7E2553' }, { color: '#008751' },
      { color: '#AB5236' }, { color: '#5F574F' }, { color: '#C2C3C7' }, { color: '#FFF1E8' },
      { color: '#FF004D' }, { color: '#FFA300' }, { color: '#FFEC27' }, { color: '#00E436' },
      { color: '#29ADFF' }, { color: '#83769C' }, { color: '#FF77A8' }, { color: '#FFCCAA' },
    ],
  },
  {
    id: 'db32',
    name: 'DB32',
    colors: [
      { color: '#000000' }, { color: '#222034' }, { color: '#45283c' }, { color: '#663931' },
      { color: '#8f563b' }, { color: '#df7126' }, { color: '#d9a066' }, { color: '#eec39a' },
      { color: '#fbf236' }, { color: '#99e550' }, { color: '#6abe30' }, { color: '#37946e' },
      { color: '#4b692f' }, { color: '#524b24' }, { color: '#323c39' }, { color: '#3f3f74' },
      { color: '#306082' }, { color: '#5b6ee1' }, { color: '#639bff' }, { color: '#5fcde4' },
      { color: '#cbdbfc' }, { color: '#ffffff' }, { color: '#9badb7' }, { color: '#847e87' },
      { color: '#696a6a' }, { color: '#595652' }, { color: '#76428a' }, { color: '#ac3232' },
      { color: '#d95763' }, { color: '#d77bba' }, { color: '#8f974a' }, { color: '#8a6f30' },
    ],
  },
  {
    id: 'endesga32',
    name: 'Endesga 32',
    colors: [
      { color: '#be4a2f' }, { color: '#d77643' }, { color: '#ead4aa' }, { color: '#e4a672' },
      { color: '#b86f50' }, { color: '#733e39' }, { color: '#3e2731' }, { color: '#a22633' },
      { color: '#e43b44' }, { color: '#f77622' }, { color: '#feae34' }, { color: '#fee761' },
      { color: '#63c74d' }, { color: '#3e8948' }, { color: '#265c42' }, { color: '#193c3e' },
      { color: '#124e89' }, { color: '#0099db' }, { color: '#2ce8f5' }, { color: '#ffffff' },
      { color: '#c0cbdc' }, { color: '#8b9bb4' }, { color: '#5a6988' }, { color: '#3a4466' },
      { color: '#262b44' }, { color: '#181425' }, { color: '#ff0044' }, { color: '#68386c' },
      { color: '#b55088' }, { color: '#f6757a' }, { color: '#e8b796' }, { color: '#c28569' },
    ],
  },
  {
    id: 'sweetie16',
    name: 'Sweetie 16',
    colors: [
      { color: '#1a1c2c' }, { color: '#5d275d' }, { color: '#b13e53' }, { color: '#ef7d57' },
      { color: '#ffcd75' }, { color: '#a7f070' }, { color: '#38b764' }, { color: '#257179' },
      { color: '#29366f' }, { color: '#3b5dc9' }, { color: '#41a6f6' }, { color: '#73eff7' },
      { color: '#f4f4f4' }, { color: '#94b0c2' }, { color: '#566c86' }, { color: '#333c57' },
    ],
  },
  {
    id: 'nes',
    name: 'NES',
    colors: [
      { color: '#7C7C7C' }, { color: '#0000FC' }, { color: '#0000BC' }, { color: '#4428BC' },
      { color: '#940084' }, { color: '#A80020' }, { color: '#A81000' }, { color: '#881400' },
      { color: '#503000' }, { color: '#007800' }, { color: '#006800' }, { color: '#005800' },
      { color: '#004058' }, { color: '#000000' }, { color: '#BCBCBC' }, { color: '#0078F8' },
    ],
  },
  {
    id: 'gameboy',
    name: 'GameBoy',
    colors: [
      { color: '#0f380f' }, { color: '#306230' }, { color: '#8bac0f' }, { color: '#9bbc0f' },
    ],
  },
  {
    id: 'grayscale',
    name: '灰度',
    colors: Array.from({ length: 16 }, (_, i) => ({
      color: `#${Math.round((i / 15) * 255).toString(16).padStart(2, '0').repeat(3)}`,
    })),
  },
];

interface ColorPaletteProps {
  colors: string[];
  activeColor: string;
  secondaryColor?: string;
  onSelectColor: (color: string) => void;
  onSetSecondaryColor?: (color: string) => void;
  activePaletteId?: string;
  onSwitchPalette?: (paletteId: string) => void;
  onAddColor?: (color: string) => void;
  onRemoveColor?: (index: number) => void;
}

const ColorCell = memo(function ColorCell({
  color,
  isActive,
  isSecondary,
  onClick,
  onContextMenu,
}: {
  color: string;
  isActive: boolean;
  isSecondary: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="relative w-7 h-7 rounded transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
      style={{
        backgroundColor: color,
        border: isActive
          ? '2px solid var(--text-primary)'
          : isSecondary
            ? '2px solid var(--text-primary)'
            : '1px solid var(--border-color)',
        transform: isActive ? 'scale(1.15)' : 'scale(1)',
        zIndex: isActive ? 2 : 1,
        outline: isActive ? `2px solid ${color}` : 'none',
        outlineOffset: '1px',
      }}
      title={`${color}\n${isActive ? '✓ 主色' : isSecondary ? '◎ 副色' : ''}${isActive || isSecondary ? '' : '左键选择 · 右键设为副色'}`}
    />
  );
});

export default memo(function ColorPalette({
  colors,
  activeColor,
  secondaryColor,
  onSelectColor,
  onSetSecondaryColor,
  activePaletteId = 'default',
  onSwitchPalette,
  onAddColor,
  onRemoveColor,
}: ColorPaletteProps) {
  const [showPaletteDropdown, setShowPaletteDropdown] = useState(false);
  const [customColor, setCustomColor] = useState('#000000');
  const colorInputRef = useRef<HTMLInputElement>(null);

  const activePalette = PRESET_PALETTES.find((p) => p.id === activePaletteId) || PRESET_PALETTES[0];

  const handleColorContextMenu = useCallback(
    (e: React.MouseEvent, color: string) => {
      e.preventDefault();
      onSetSecondaryColor?.(color);
    },
    [onSetSecondaryColor]
  );

  const handleAddCustomColor = useCallback(() => {
    onAddColor?.(customColor);
  }, [customColor, onAddColor]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setShowPaletteDropdown(!showPaletteDropdown)}
            className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--button-bg)' }}
          >
            <Palette className="w-3.5 h-3.5" />
            {activePalette.name}
            <ChevronDown className={`w-3 h-3 transition-transform ${showPaletteDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showPaletteDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPaletteDropdown(false)} />
              <div
                className="absolute top-full left-0 mt-1 z-50 rounded-lg shadow-xl border overflow-hidden min-w-[160px]"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                }}
              >
                {PRESET_PALETTES.map((palette) => (
                  <button
                    key={palette.id}
                    onClick={() => {
                      onSwitchPalette?.(palette.id);
                      setShowPaletteDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
                    style={{
                      backgroundColor: activePaletteId === palette.id ? 'var(--primary-light)' : 'transparent',
                      color: activePaletteId === palette.id ? 'var(--primary)' : 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      if (activePaletteId !== palette.id) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--button-bg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activePaletteId !== palette.id) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div className="flex gap-0.5">
                      {palette.colors.slice(0, 5).map((c, i) => (
                        <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.color, border: '1px solid var(--border-color)' }} />
                      ))}
                    </div>
                    <span>{palette.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 p-2 rounded-lg" style={{ backgroundColor: 'var(--button-bg)' }}>
        {colors.map((color, index) => (
          <ColorCell
            key={`${color}-${index}`}
            color={color}
            isActive={color === activeColor}
            isSecondary={color === secondaryColor}
            onClick={() => onSelectColor(color)}
            onContextMenu={(e) => handleColorContextMenu(e, color)}
          />
        ))}
      </div>

      {onAddColor && (
        <div className="flex items-center gap-1.5">
          <div className="relative w-7 h-7 rounded overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border-color)' }}>
            <div className="w-full h-full" style={{ backgroundColor: customColor }} />
            <input
              ref={colorInputRef}
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <button
            onClick={handleAddCustomColor}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="添加颜色"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
});