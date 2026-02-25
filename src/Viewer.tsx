import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type VivModule = typeof import('@hms-dbmi/viv');

interface VivChannel {
  channelsVisible: boolean;
  color: string;
  label: string;
  window: { start: number; end: number; min?: number; max?: number };
}
interface VivMetadata {
  omero: {
    channels: VivChannel[];
    rdefs: { defaultT?: number; defaultZ?: number };
  };
}

const FALLBACK_COLORS: [number, number, number][] = [
  [255, 128, 0], [0, 200, 100], [0, 128, 255],
  [255, 220, 0], [220, 0, 255], [0, 255, 220],
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const GLASS: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(30,30,30,0.55)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

const BTN_SIZE = 28;
const INSET = 6;
const TRANSITION = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

const PANEL_MIN_W = 100;
const PANEL_MIN_H = 120;
const PANEL_MAX_W = 220;
const PANEL_MAX_H = 260;
const PANEL_MARGIN = 20;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
  );
}

function MenuCloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5L21 15.59z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
    </svg>
  );
}

function ColorLensIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </svg>
  );
}

function SearchInfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );
}

type PanelTab = 'views' | 'appearance' | 'info';

const TAB_ICONS: { key: PanelTab; Icon: React.FC; tooltip: string }[] = [
  { key: 'views', Icon: MapIcon, tooltip: 'Views/Locations' },
  { key: 'appearance', Icon: ColorLensIcon, tooltip: 'Appearance' },
  { key: 'info', Icon: SearchInfoIcon, tooltip: 'Info' },
];

interface ChannelHistogramData {
  bins: number[];
  min: number;
  max: number;
}

interface ChannelInfo {
  label: string;
  color: [number, number, number];
  visible: boolean;
  histogram?: ChannelHistogramData;
  contrastLimits: [number, number];
}

type BlendMode = 'merged' | 'single';

const COLORMAP_OPTIONS = [
  'viridis', 'plasma', 'inferno', 'magma', 'jet',
  'hot', 'cool', 'spring', 'summer', 'autumn', 'winter',
  'bluered', 'rdbu', 'picnic', 'rainbow', 'rainbow_soft',
  'cubehelix', 'greens', 'greys', 'bone', 'copper',
  'blackbody', 'electric', 'portland', 'earth',
];

interface OverlayMenuProps {
  containerW: number;
  containerH: number;
  views: SavedView[];
  channels: ChannelInfo[];
  blendMode: BlendMode;
  colormap: string;
  portalTarget: HTMLElement | null;
  onToggleChannel: (index: number) => void;
  onColorChange: (index: number, color: [number, number, number]) => void;
  onContrastChange: (index: number, limits: [number, number]) => void;
  onBlendModeChange: (mode: BlendMode) => void;
  onColormapChange: (colormap: string) => void;
  onApplyAppearance: (appearance: SavedViewAppearance) => void;
  annotationsVisible: boolean;
  onAnnotationsVisibleChange: (visible: boolean) => void;
  scaleBarVisible: boolean;
  onScaleBarVisibleChange: (visible: boolean) => void;
  hasScaleBar: boolean;
  navigateTo: (dest: { zoom: number; target: [number, number, number] }) => void;
}

const ELLIPSIS: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

function ViewCard({ view, onSelect }: { view: SavedView; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '8px 10px',
        marginBottom: 6,
        cursor: 'pointer',
        color: 'inherit',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget.style.background = 'rgba(255,255,255,0.12)'); }}
      onMouseLeave={(e) => { (e.currentTarget.style.background = 'rgba(255,255,255,0.06)'); }}
    >
      <div style={{ ...ELLIPSIS, fontSize: 12, fontWeight: 500 }}>{view.name}</div>
      {view.description && (
        <div style={{ ...ELLIPSIS, fontSize: 10, opacity: 0.5, marginTop: 2 }}>{view.description}</div>
      )}
    </button>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
    </svg>
  );
}

function rgbStr(c: [number, number, number]) {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
    </svg>
  );
}

const HIST_BINS = 64;

function computeHistogram(pixelData: ArrayLike<number>, bins: number): { bins: number[]; min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pixelData.length; i++) {
    const v = pixelData[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) return { bins: Array(bins).fill(1), min, max: max + 1 };
  const counts = new Array(bins).fill(0);
  const range = max - min;
  for (let i = 0; i < pixelData.length; i++) {
    const idx = Math.min(Math.floor(((pixelData[i] - min) / range) * bins), bins - 1);
    counts[idx]++;
  }
  // Log scale for better visual spread
  const maxCount = Math.max(...counts);
  const normalized = counts.map((c: number) => maxCount > 0 ? Math.log1p(c) / Math.log1p(maxCount) : 0);
  return { bins: normalized, min, max };
}

function ChannelHistogramSlider({ histogram, contrastLimits, color, onChange }: {
  histogram: ChannelHistogramData;
  contrastLimits: [number, number];
  color: [number, number, number];
  onChange: (limits: [number, number]) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'lo' | 'hi' | null>(null);

  const range = histogram.max - histogram.min;
  const loFrac = range > 0 ? (contrastLimits[0] - histogram.min) / range : 0;
  const hiFrac = range > 0 ? (contrastLimits[1] - histogram.min) / range : 1;

  const valFromX = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(histogram.min + frac * range);
  }, [histogram.min, range]);

  const onPointerDown = useCallback((which: 'lo' | 'hi') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = which;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const val = valFromX(e.clientX);
    if (dragging.current === 'lo') {
      onChange([Math.min(val, contrastLimits[1] - 1), contrastLimits[1]]);
    } else {
      onChange([contrastLimits[0], Math.max(val, contrastLimits[0] + 1)]);
    }
  }, [valFromX, contrastLimits, onChange]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const barColor = `rgba(${color[0]},${color[1]},${color[2]},0.6)`;
  const dimColor = `rgba(${color[0]},${color[1]},${color[2]},0.15)`;
  const handleColor = `rgb(${color[0]},${color[1]},${color[2]})`;

  return (
    <div
      ref={trackRef}
      style={{ position: 'relative', width: '100%', height: 48, userSelect: 'none', touchAction: 'none' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg width="100%" height="38" viewBox={`0 0 ${histogram.bins.length} 1`} preserveAspectRatio="none"
        style={{ display: 'block', borderRadius: '6px 6px 0 0', overflow: 'hidden' }}>
        {histogram.bins.map((h, i) => {
          const frac = i / histogram.bins.length;
          const inRange = frac >= loFrac && frac <= hiFrac;
          return (
            <rect
              key={i}
              x={i}
              y={1 - h}
              width={1.05}
              height={h}
              fill={inRange ? barColor : dimColor}
            />
          );
        })}
      </svg>

      <div style={{
        position: 'relative', height: 10,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '0 0 6px 6px',
      }}>
        <div style={{
          position: 'absolute',
          left: `${loFrac * 100}%`,
          width: `${(hiFrac - loFrac) * 100}%`,
          top: 3, height: 4,
          background: `rgba(${color[0]},${color[1]},${color[2]},0.4)`,
          borderRadius: 2,
        }} />

        <div
          onPointerDown={onPointerDown('lo')}
          style={{
            position: 'absolute',
            left: `${loFrac * 100}%`,
            top: 0, transform: 'translateX(-50%)',
            width: 10, height: 10,
            borderRadius: 3,
            background: handleColor,
            border: '1.5px solid rgba(255,255,255,0.6)',
            cursor: 'ew-resize',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        />

        <div
          onPointerDown={onPointerDown('hi')}
          style={{
            position: 'absolute',
            left: `${hiFrac * 100}%`,
            top: 0, transform: 'translateX(-50%)',
            width: 10, height: 10,
            borderRadius: 3,
            background: handleColor,
            border: '1.5px solid rgba(255,255,255,0.6)',
            cursor: 'ew-resize',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        />
      </div>
    </div>
  );
}

const COLOR_SWATCHES: [number, number, number][] = [
  [255, 0, 0], [0, 255, 0], [0, 0, 255],
  [255, 255, 0], [0, 255, 255], [255, 0, 255],
  [255, 128, 0], [0, 200, 100], [128, 0, 255],
  [255, 80, 80], [80, 255, 80], [80, 180, 255],
  [255, 200, 60], [60, 220, 200], [200, 100, 255],
  [255, 255, 255], [200, 200, 200], [128, 128, 128],
];

const SWATCH_SIZE = 22;
const SWATCH_GAP = 5;
const PICKER_PAD = 8;
const PICKER_MARGIN = 6;

function pickerGridCols(containerW: number): number {
  const availW = containerW - PICKER_MARGIN * 2 - PICKER_PAD * 2;
  const cols = Math.floor((availW + SWATCH_GAP) / (SWATCH_SIZE + SWATCH_GAP));
  return Math.max(3, Math.min(6, cols));
}

function ColorPickerPopover({ color, onSelect, onClose, anchorRef, portalTarget }: {
  color: [number, number, number];
  onSelect: (c: [number, number, number]) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  portalTarget: HTMLElement | null;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [cols, setCols] = useState(6);

  useEffect(() => {
    if (!anchorRef.current || !portalTarget) return;

    const containerRect = portalTarget.getBoundingClientRect();
    const numCols = pickerGridCols(containerRect.width);
    setCols(numCols);

    requestAnimationFrame(() => {
      if (!anchorRef.current || !popoverRef.current) return;
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const popRect = popoverRef.current.getBoundingClientRect();
      const cRect = portalTarget.getBoundingClientRect();

      let top = anchorRect.top - cRect.top - PICKER_MARGIN;
      let left = anchorRect.right - cRect.left - popRect.width;

      top = Math.max(PICKER_MARGIN, Math.min(top, cRect.height - popRect.height - PICKER_MARGIN));
      left = Math.max(PICKER_MARGIN, Math.min(left, cRect.width - popRect.width - PICKER_MARGIN));

      if (anchorRect.top - cRect.top < popRect.height + PICKER_MARGIN * 2) {
        top = anchorRect.bottom - cRect.top + PICKER_MARGIN;
        top = Math.min(top, cRect.height - popRect.height - PICKER_MARGIN);
      }

      setPos({ top, left });
    });
  }, [anchorRef, portalTarget]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  if (!portalTarget) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
        ...GLASS,
        background: 'rgba(20,20,20,0.85)',
        borderRadius: 10,
        padding: PICKER_PAD,
        zIndex: 100,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: SWATCH_GAP,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        maxWidth: `calc(100% - ${PICKER_MARGIN * 2}px)`,
        maxHeight: `calc(100% - ${PICKER_MARGIN * 2}px)`,
        overflowY: 'auto',
      }}
    >
      {COLOR_SWATCHES.map((c, i) => {
        const selected = c[0] === color[0] && c[1] === color[1] && c[2] === color[2];
        return (
          <button
            key={i}
            onClick={() => onSelect(c)}
            style={{
              width: SWATCH_SIZE, height: SWATCH_SIZE, borderRadius: 5,
              border: selected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.12)',
              background: rgbStr(c),
              cursor: 'pointer',
              padding: 0,
              boxShadow: selected ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
              transform: selected ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.12s, box-shadow 0.12s',
            }}
          />
        );
      })}
    </div>,
    portalTarget,
  );
}

function ChannelCard({ channel, onToggle, onColorChange, onContrastChange, portalTarget }: {
  channel: ChannelInfo;
  onToggle: () => void;
  onColorChange: (color: [number, number, number]) => void;
  onContrastChange: (limits: [number, number]) => void;
  portalTarget: HTMLElement | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const swatchRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        marginBottom: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', height: 22 }}>
        <button
          onClick={onToggle}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            display: 'flex', alignItems: 'center',
            color: channel.visible ? rgbStr(channel.color) : 'rgba(255,255,255,0.2)',
            flexShrink: 0, transition: 'color 0.15s',
          }}
        >
          <EyeIcon visible={channel.visible} />
        </button>
        <div
          style={{
            ...ELLIPSIS, flex: 1, fontSize: 11,
            color: channel.visible ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
            transition: 'color 0.15s',
          }}
        >
          {channel.label}
        </div>
        <button
          onClick={() => { setExpanded((v) => !v); if (expanded) setColorPickerOpen(false); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            display: 'flex', alignItems: 'center',
            color: 'rgba(255,255,255,0.4)', flexShrink: 0,
          }}
        >
          <ChevronIcon open={expanded} />
        </button>
      </div>

      <div style={{ display: expanded ? 'flex' : 'none', alignItems: 'center', gap: 6, padding: '4px 8px 8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {channel.histogram ? (
            <ChannelHistogramSlider
              histogram={channel.histogram}
              contrastLimits={channel.contrastLimits}
              color={channel.color}
              onChange={onContrastChange}
            />
          ) : (
            <div style={{
              height: 48, borderRadius: 6,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }} />
          )}
        </div>
        <button
          ref={swatchRef}
          onClick={() => setColorPickerOpen((v) => !v)}
          style={{
            width: 22, height: 22, flexShrink: 0,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.2)',
            background: rgbStr(channel.color),
            cursor: 'pointer',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            padding: 0,
            boxShadow: `0 0 6px ${rgbStr(channel.color)}40`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
        />
        {colorPickerOpen && (
          <ColorPickerPopover
            color={channel.color}
            anchorRef={swatchRef}
            portalTarget={portalTarget}
            onSelect={(c) => { onColorChange(c); setColorPickerOpen(false); }}
            onClose={() => setColorPickerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function AdditiveToggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      style={{
        flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 6,
        background: active ? 'rgba(130,180,255,0.25)' : 'transparent',
        color: active ? 'rgba(130,180,255,1)' : 'rgba(255,255,255,0.35)',
        fontSize: 9,
        fontWeight: 600,
        padding: '4px 6px',
        cursor: 'pointer',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      Add.
    </button>
  );
}

function AppearancePanel({ channels, blendMode, colormap, onToggleChannel, onColorChange, onContrastChange, onBlendModeChange, onColormapChange, portalTarget }: {
  channels: ChannelInfo[];
  blendMode: BlendMode;
  colormap: string;
  onToggleChannel: (i: number) => void;
  onColorChange: (i: number, color: [number, number, number]) => void;
  onContrastChange: (i: number, limits: [number, number]) => void;
  onBlendModeChange: (m: BlendMode) => void;
  onColormapChange: (c: string) => void;
  portalTarget: HTMLElement | null;
}) {
  return (
    <>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
        <AdditiveToggle active={blendMode === 'merged'} onChange={(v) => onBlendModeChange(v ? 'merged' : 'single')} />
        <select
          disabled={blendMode !== 'merged'}
          value={colormap}
          onChange={(e) => onColormapChange(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: blendMode === 'merged' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)',
            fontSize: 10,
            padding: '4px 6px',
            cursor: blendMode === 'merged' ? 'pointer' : 'default',
            outline: 'none',
          }}
        >
          {COLORMAP_OPTIONS.map((name) => (
            <option key={name} value={name}>
              {name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {channels.map((ch, i) => (
          <ChannelCard key={i} channel={ch} onToggle={() => onToggleChannel(i)} onColorChange={(c) => onColorChange(i, c)} onContrastChange={(l) => onContrastChange(i, l)} portalTarget={portalTarget} />
        ))}
      </div>
    </>
  );
}

function PlaceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

const ANNOTATION_MAX_W = 120;
const ANNOTATION_HIT_RADIUS = 16;
const DEFAULT_ANNOTATION_COLOR: [number, number, number] = [255, 100, 100];

function useAnnotationHover(
  containerRef: React.RefObject<HTMLElement | null>,
  annotations: Annotation[],
  visible: boolean,
  viewState: any,
  containerW: number,
  containerH: number,
) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const viewStateRef = useRef(viewState);
  const annotationsRef = useRef(annotations);
  const sizeRef = useRef({ w: containerW, h: containerH });
  viewStateRef.current = viewState;
  annotationsRef.current = annotations;
  sizeRef.current = { w: containerW, h: containerH };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !visible) {
      setHoveredIdx(null);
      return;
    }

    const onMove = (e: MouseEvent) => {
      const vs = viewStateRef.current;
      const anns = annotationsRef.current;
      const { w, h } = sizeRef.current;
      if (!vs || anns.length === 0) { setHoveredIdx(null); return; }

      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const scale = Math.pow(2, vs.zoom);

      let closest: number | null = null;
      let closestDist = Infinity;

      for (let i = 0; i < anns.length; i++) {
        const a = anns[i];
        const sx = (a.target[0] - vs.target[0]) * scale + w / 2;
        const sy = (a.target[1] - vs.target[1]) * scale + h / 2 - 9;
        const dx = mx - sx;
        const dy = my - sy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ANNOTATION_HIT_RADIUS && dist < closestDist) {
          closest = i;
          closestDist = dist;
        }
      }
      setHoveredIdx(closest);
    };

    const onLeave = () => setHoveredIdx(null);

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [containerRef, visible]);

  return hoveredIdx;
}

function AnnotationOverlay({ annotations, visible, viewState, containerW, containerH, hoveredIdx }: {
  annotations: Annotation[];
  visible: boolean;
  viewState: any;
  containerW: number;
  containerH: number;
  hoveredIdx: number | null;
}) {
  if (!visible || !viewState || annotations.length === 0) return null;

  const scale = Math.pow(2, viewState.zoom);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {annotations.map((a, i) => {
        const sx = (a.target[0] - viewState.target[0]) * scale + containerW / 2;
        const sy = (a.target[1] - viewState.target[1]) * scale + containerH / 2;
        const hovered = hoveredIdx === i;
        const color = a.color ?? DEFAULT_ANNOTATION_COLOR;
        const colorStr = rgbStr(color);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: sx,
              top: sy,
              transform: 'translate(-50%, -100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{
              ...GLASS,
              background: 'rgba(20,20,20,0.75)',
              borderRadius: 6,
              padding: '3px 8px',
              marginBottom: 2,
              maxWidth: ANNOTATION_MAX_W,
              ...ELLIPSIS,
              fontSize: 10,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.9)',
              lineHeight: '16px',
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'translateY(0)' : 'translateY(4px)',
              transition: 'opacity 0.15s, transform 0.15s',
            }}>
              {a.name}
            </div>
            <div style={{
              color: colorStr,
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
              transition: 'transform 0.15s',
              transform: hovered ? 'scale(1.2)' : 'scale(1)',
            }}>
              <PlaceIcon />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface PhysicalScale {
  pixelSize: number;
  unit: string;
}

const UNIT_LABELS: Record<string, string> = {
  micrometer: '\u00b5m',
  micrometre: '\u00b5m',
  nanometer: 'nm',
  nanometre: 'nm',
  millimeter: 'mm',
  millimetre: 'mm',
  centimeter: 'cm',
  centimetre: 'cm',
  meter: 'm',
  metre: 'm',
  angstrom: '\u00c5',
};

function extractPhysicalScale(metadata: any): PhysicalScale | null {
  try {
    const ms = metadata?.multiscales?.[0];
    if (!ms) return null;

    const axes: any[] = ms.axes ?? [];
    const xIdx = axes.findIndex((a: any) =>
      (a.type === 'space' && a.name === 'x') ||
      (typeof a === 'string' && a === 'x')
    );
    if (xIdx < 0) return null;

    const unit = typeof axes[xIdx] === 'object' ? axes[xIdx].unit : undefined;
    if (!unit) return null;

    const dataset0 = ms.datasets?.[0];
    const perLevel = dataset0?.coordinateTransformations?.find((t: any) => t.type === 'scale');
    const groupLevel = ms.coordinateTransformations?.find((t: any) => t.type === 'scale');

    let pixelSize = perLevel?.scale?.[xIdx] ?? 1;
    if (groupLevel?.scale?.[xIdx]) {
      pixelSize *= groupLevel.scale[xIdx];
    }

    return { pixelSize, unit };
  } catch {
    return null;
  }
}

const NICE_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

function niceScaleValue(maxPhysical: number): number {
  let best = NICE_STEPS[0];
  for (const step of NICE_STEPS) {
    if (step <= maxPhysical) best = step;
    else break;
  }
  return best;
}

const SCALE_BAR_DEFAULTS = {
  maxWidth: 100,
  position: 'bottom-right' as const,
};

function ScaleBarOverlay({ physicalScale, viewState, config, visible }: {
  physicalScale: PhysicalScale;
  viewState: any;
  config: Required<Pick<ScaleBarConfig, 'maxWidth' | 'position'>>;
  visible: boolean;
}) {
  if (!visible || !viewState) return null;

  const zoom = viewState.zoom;
  const screenScale = Math.pow(2, zoom); // pixels per image-pixel at current zoom
  const physPerScreenPx = physicalScale.pixelSize / screenScale;

  // How many physical units fit in maxWidth screen pixels?
  const maxPhysical = physPerScreenPx * config.maxWidth;
  const niceVal = niceScaleValue(maxPhysical);
  const barWidthPx = niceVal / physPerScreenPx;

  const unitLabel = UNIT_LABELS[physicalScale.unit] ?? physicalScale.unit;
  const label = `${niceVal} ${unitLabel}`;

  const pos = config.position;
  const margin = 12;
  const posStyle: React.CSSProperties = {
    position: 'absolute',
    ...(pos.includes('bottom') ? { bottom: margin } : { top: margin }),
    ...(pos.includes('right') ? { right: margin } : { left: margin }),
  };

  return (
    <div style={{
      ...posStyle,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: pos.includes('right') ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.9)',
        textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        marginBottom: 3,
        letterSpacing: '0.02em',
      }}>
        {label}
      </div>
      <div style={{
        width: barWidthPx,
        height: 3,
        background: 'rgba(255,255,255,0.9)',
        borderRadius: 1.5,
        boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
        transition: 'width 0.15s ease',
      }} />
    </div>
  );
}

const OverlayMenu = memo(function OverlayMenu({ containerW, containerH, views, channels, blendMode, colormap, portalTarget, onToggleChannel, onColorChange, onContrastChange, onBlendModeChange, onColormapChange, onApplyAppearance, annotationsVisible, onAnnotationsVisibleChange, scaleBarVisible, onScaleBarVisibleChange, hasScaleBar, navigateTo }: OverlayMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>('views');

  const panelW = clamp(containerW - PANEL_MARGIN, PANEL_MIN_W, PANEL_MAX_W);
  const panelH = clamp(containerH - PANEL_MARGIN, PANEL_MIN_H, PANEL_MAX_H);

  return (
    <div
      style={{
        ...GLASS,
        position: 'absolute',
        top: INSET,
        left: INSET,
        zIndex: 10,
        width: open ? panelW : BTN_SIZE,
        height: open ? panelH : BTN_SIZE,
        borderRadius: open ? 12 : BTN_SIZE / 2,
        overflow: 'hidden',
        color: 'rgba(255,255,255,0.85)',
        transition: TRANSITION,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: BTN_SIZE,
        }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            width: BTN_SIZE,
            height: BTN_SIZE,
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            color: 'inherit',
          }}
        >
          {open ? <MenuCloseIcon /> : <MenuIcon />}
        </button>

        {open && (
          <div
            style={{
              display: 'flex',
              flex: 1,
              justifyContent: 'space-evenly',
              alignItems: 'center',
              opacity: open ? 1 : 0,
              transition: 'opacity 0.15s ease 0.15s',
            }}
          >
            {TAB_ICONS.map(({ key, Icon, tooltip }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  title={tooltip}
                  onClick={() => setActiveTab(key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: active
                      ? 'rgba(130,180,255,1)'
                      : 'rgba(255,255,255,0.5)',
                    transition: 'color 0.2s',
                  }}
                >
                  <Icon />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          top: BTN_SIZE + 2,
          left: 0,
          right: 0,
          bottom: 0,
          padding: '0 10px 10px',
          opacity: open ? 1 : 0,
          transition: open
            ? 'opacity 0.2s ease 0.15s'
            : 'opacity 0.1s ease',
          pointerEvents: open ? 'auto' : 'none',
          fontSize: 13,
          overflowY: 'auto',
        }}
      >
        {activeTab === 'views' && views.map((v, i) => (
          <ViewCard key={i} view={v} onSelect={() => {
            navigateTo(v);
            if (v.appearance) onApplyAppearance(v.appearance);
          }} />
        ))}
        {activeTab === 'appearance' && (
          <AppearancePanel
            channels={channels}
            blendMode={blendMode}
            colormap={colormap}
            onToggleChannel={onToggleChannel}
            onColorChange={onColorChange}
            onContrastChange={onContrastChange}
            onBlendModeChange={onBlendModeChange}
            onColormapChange={onColormapChange}
            portalTarget={portalTarget}
          />
        )}
        {activeTab === 'info' && (
          <div>
            <button
              onClick={() => onAnnotationsVisibleChange(!annotationsVisible)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '6px 10px',
                cursor: 'pointer',
                color: 'inherit',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            >
              <span style={{
                display: 'flex', alignItems: 'center',
                color: annotationsVisible ? 'rgba(255,100,100,0.9)' : 'rgba(255,255,255,0.2)',
                transition: 'color 0.15s',
              }}>
                <EyeIcon visible={annotationsVisible} />
              </span>
              <span style={{
                fontSize: 11, fontWeight: 500,
                color: annotationsVisible ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                transition: 'color 0.15s',
              }}>
                Annotations
              </span>
            </button>
            {hasScaleBar && (
              <button
                onClick={() => onScaleBarVisibleChange(!scaleBarVisible)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  marginTop: 6,
                  cursor: 'pointer',
                  color: 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                <span style={{
                  display: 'flex', alignItems: 'center',
                  color: scaleBarVisible ? 'rgba(130,180,255,0.9)' : 'rgba(255,255,255,0.2)',
                  transition: 'color 0.15s',
                }}>
                  <EyeIcon visible={scaleBarVisible} />
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  color: scaleBarVisible ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                  transition: 'color 0.15s',
                }}>
                  Scale Bar
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export interface SavedViewAppearance {
  channelsVisible?: boolean[];
  channelColors?: [number, number, number][];
  contrastLimits?: [number, number][];
  blendMode?: BlendMode;
  colormap?: string;
}

export interface SavedView {
  name: string;
  description?: string;
  zoom: number;
  target: [number, number, number];
  appearance?: SavedViewAppearance;
  default?: boolean;
}

export interface Annotation {
  name: string;
  target: [number, number];
  color?: [number, number, number];
}

export interface ScaleBarConfig {
  maxWidth?: number;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const FLY_DURATION_MS = 800;

function useAnimatedNavigation(
  viewState: any,
  setViewState: (vs: any) => void,
  onViewStateChange?: (vs: any) => void,
) {
  const animRef = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const navigateTo = useCallback(
    (dest: { zoom: number; target: [number, number, number] }) => {
      cancel();
      const from = viewState;
      if (!from) {
        setViewState(dest);
        onViewStateChange?.(dest);
        return;
      }

      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const raw = Math.min(elapsed / FLY_DURATION_MS, 1);
        const t = easeInOutCubic(raw);

        const next = {
          ...from,
          zoom: lerp(from.zoom, dest.zoom, t),
          target: [
            lerp(from.target[0], dest.target[0], t),
            lerp(from.target[1], dest.target[1], t),
            lerp(from.target[2] ?? 0, dest.target[2] ?? 0, t),
          ] as [number, number, number],
        };

        setViewState(next);
        onViewStateChange?.(next);

        if (raw < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          animRef.current = null;
        }
      };

      animRef.current = requestAnimationFrame(tick);
    },
    [viewState, cancel, setViewState, onViewStateChange],
  );

  useEffect(() => cancel, [cancel]);

  return { navigateTo, cancelAnimation: cancel };
}

function useContainerSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState(() => {
    const el = ref.current;
    if (el) return { w: el.clientWidth, h: el.clientHeight };
    return { w: PANEL_MAX_W + PANEL_MARGIN, h: PANEL_MAX_H + PANEL_MARGIN };
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export interface ViewerProps {
  source: string;
  views?: SavedView[];
  annotations?: Annotation[];
  scaleBar?: ScaleBarConfig | boolean;
  onViewStateChange?: (viewState: { zoom: number; target: [number, number, number] }) => void;
  onAppearanceChange?: (appearance: SavedViewAppearance) => void;
}

export function MicroAtlasViewer({ source, views: externalViews, annotations: externalAnnotations, scaleBar: scaleBarProp, onViewStateChange, onAppearanceChange }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<any>(null);
  // Reuse extension/view instances so deck.gl doesn't diff new refs every render
  const extensionsRef = useRef<{ additive: any[]; palette: any[] } | null>(null);
  const viewsRef = useRef<any[] | null>(null);
  const containerSize = useContainerSize(containerRef);
  const [viewState, setViewState] = useState<any>(null);
  const [fitView, setFitView] = useState<SavedView | null>(null);
  const { navigateTo, cancelAnimation } = useAnimatedNavigation(viewState, setViewState, onViewStateChange);
  const onViewStateChangeRef = useRef(onViewStateChange);
  onViewStateChangeRef.current = onViewStateChange;
  const cancelAnimationRef = useRef(cancelAnimation);
  cancelAnimationRef.current = cancelAnimation;
  const handleDeckViewStateChange = useCallback((e: any) => {
    cancelAnimationRef.current();
    setViewState(e.viewState);
    onViewStateChangeRef.current?.(e.viewState);
  }, []);
  const [channelsVisible, setChannelsVisible] = useState<boolean[]>([]);
  const [channelColors, setChannelColors] = useState<[number, number, number][] | null>(null);
  const [contrastLimitsState, setContrastLimitsState] = useState<[number, number][] | null>(null);
  const [histograms, setHistograms] = useState<ChannelHistogramData[]>([]);
  const [blendMode, setBlendMode] = useState<BlendMode>('single');
  const [colormap, setColormap] = useState('viridis');
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const annotationHoveredIdx = useAnnotationHover(containerRef, externalAnnotations ?? [], annotationsVisible, viewState, containerSize.w, containerSize.h);
  const [scaleBarVisible, setScaleBarVisible] = useState(!!scaleBarProp);
  const [physicalScale, setPhysicalScale] = useState<PhysicalScale | null>(null);
  const scaleBarConfig: Required<Pick<ScaleBarConfig, 'maxWidth' | 'position'>> = {
    maxWidth: (typeof scaleBarProp === 'object' ? scaleBarProp.maxWidth : undefined) ?? SCALE_BAR_DEFAULTS.maxWidth,
    position: (typeof scaleBarProp === 'object' ? scaleBarProp.position : undefined) ?? SCALE_BAR_DEFAULTS.position,
  };
  const [loaded, setLoaded] = useState<{
    viv: VivModule;
    data: any[];
    metadata: VivMetadata;
    numChannels: number;
    deckDeps: { DeckGL: any; OrthographicView: any };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const onAppearanceChangeRef = useRef(onAppearanceChange);
  onAppearanceChangeRef.current = onAppearanceChange;
  useEffect(() => {
    if (!onAppearanceChangeRef.current || channelsVisible.length === 0) return;
    onAppearanceChangeRef.current({
      channelsVisible,
      ...(channelColors ? { channelColors } : {}),
      ...(contrastLimitsState ? { contrastLimits: contrastLimitsState } : {}),
      blendMode,
      colormap,
    });
  }, [channelsVisible, channelColors, contrastLimitsState, blendMode, colormap]);

  useEffect(() => {
    if (!source) return;
    setIsLoading(true);
    setError(null);
    setLoaded(null);
    setViewState(null);

    Promise.all([
      import('@hms-dbmi/viv'),
      import('@deck.gl/react'),
      import('@deck.gl/core'),
    ])
      .then(([viv, deckReact, deckCore]) =>
        (viv.loadOmeZarr as any)(source, { type: 'multiscales' }).then(
          ({ data, metadata }: { data: any[]; metadata: VivMetadata }) => {
            const labels: string[] = data[0]?.labels ?? [];
            const cIdx = labels.indexOf('c');
            const numChannels = cIdx >= 0 ? data[0].shape[cIdx] : 1;
            const omero = metadata?.omero?.channels ?? [];
            setChannelsVisible(
              Array.from({ length: numChannels }, (_, i) => {
                const ch = omero[i] as any;
                return ch?.channelsVisible ?? ch?.active ?? true;
              }),
            );
            setChannelColors(
              Array.from({ length: numChannels }, (_, i) => {
                const ch = omero[i];
                return ch?.color ? hexToRgb(ch.color) : FALLBACK_COLORS[i % FALLBACK_COLORS.length];
              }),
            );
            setContrastLimitsState(
              Array.from({ length: numChannels }, (_, i) => {
                const ch = omero[i];
                return ch ? [ch.window.start, ch.window.end] as [number, number] : [0, 65535] as [number, number];
              }),
            );
            setLoaded({
              viv,
              data,
              metadata,
              numChannels,
              deckDeps: {
                DeckGL: deckReact.default,
                OrthographicView: deckCore.OrthographicView,
              },
            });
            setPhysicalScale(extractPhysicalScale(metadata));
            setIsLoading(false);
          },
        ),
      )
      .catch((err: Error) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [source]);

  // Initial view state — wait for non-zero deck dimensions, then either apply
  // the single default view or fit to the full image.
  useEffect(() => {
    if (!loaded || viewState) return;
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      if (deckRef.current?.deck) {
        const { deck } = deckRef.current;
        if (deck.width > 0 && deck.height > 0) {
          const { getDefaultInitialViewState } = loaded.viv as any;
          const fitVs = getDefaultInitialViewState(loaded.data, { width: deck.width, height: deck.height }, 0);
          setFitView({ name: 'Fit to viewer', description: 'Reset zoom and center', zoom: fitVs.zoom, target: fitVs.target });

          const defaultViews = (externalViews ?? []).filter((v) => v.default);
          const initialView = defaultViews.length === 1 ? defaultViews[0] : null;

          if (initialView) {
            const vs = { ...fitVs, zoom: initialView.zoom, target: initialView.target };
            setViewState(vs);
            onViewStateChangeRef.current?.(vs);
            if (initialView.appearance) handleApplyAppearance(initialView.appearance);
          } else {
            setViewState(fitVs);
            onViewStateChangeRef.current?.(fitVs);
          }
        } else {
          requestAnimationFrame(check);
        }
      } else {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
    return () => { cancelled = true; };
  }, [loaded]);

  // Per-channel histograms (computed from lowest resolution for speed)
  useEffect(() => {
    if (!loaded) return;
    const { data, numChannels, metadata } = loaded;
    const defaultT = metadata?.omero?.rdefs?.defaultT ?? 0;
    const defaultZ = metadata?.omero?.rdefs?.defaultZ ?? 0;
    const lowestRes = data[data.length - 1];
    let cancelled = false;

    Promise.all(
      Array.from({ length: numChannels }, (_, c) =>
        lowestRes.getRaster({ selection: { t: defaultT, z: defaultZ, c } })
      ),
    ).then((rasters: any[]) => {
      if (cancelled) return;
      setHistograms(rasters.map((r: any) => computeHistogram(r.data, HIST_BINS)));
    }).catch(() => { /* histogram is optional, fail silently */ });

    return () => { cancelled = true; };
  }, [loaded]);

  const handleToggleChannel = useCallback((index: number) => {
    setChannelsVisible((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const handleColorChange = useCallback((index: number, color: [number, number, number]) => {
    setChannelColors((prev) => {
      const next = [...(prev ?? [])];
      next[index] = color;
      return next;
    });
  }, []);

  const handleContrastChange = useCallback((index: number, limits: [number, number]) => {
    setContrastLimitsState((prev) => {
      const next = [...(prev ?? [])];
      next[index] = limits;
      return next;
    });
  }, []);

  const handleApplyAppearance = useCallback((a: SavedViewAppearance) => {
    if (a.channelsVisible) setChannelsVisible(a.channelsVisible);
    if (a.channelColors) setChannelColors(a.channelColors);
    if (a.contrastLimits) setContrastLimitsState(a.contrastLimits);
    if (a.blendMode) setBlendMode(a.blendMode);
    if (a.colormap) setColormap(a.colormap);
  }, []);

  const channelInfos = useMemo<ChannelInfo[]>(() => {
    if (!loaded) return [];
    const { metadata, numChannels } = loaded;
    const omeroChannels = metadata?.omero?.channels ?? [];

    const defaultContrastLimits: [number, number][] = Array.from({ length: numChannels }, (_, i) => {
      const ch = omeroChannels[i];
      return ch ? [ch.window.start, ch.window.end] : [0, 65535];
    });
    const cl = contrastLimitsState && contrastLimitsState.length === numChannels
      ? contrastLimitsState : defaultContrastLimits;

    const defaultColors: [number, number, number][] = Array.from({ length: numChannels }, (_, i) => {
      const ch = omeroChannels[i];
      return ch?.color ? hexToRgb(ch.color) : FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    });
    const cols = channelColors && channelColors.length === numChannels ? channelColors : defaultColors;

    const vis = channelsVisible.length === numChannels
      ? channelsVisible : Array.from({ length: numChannels }, () => true);

    return Array.from({ length: numChannels }, (_, i) => ({
      label: omeroChannels[i]?.label ?? `Channel ${i}`,
      color: cols[i],
      visible: vis[i],
      histogram: histograms[i],
      contrastLimits: cl[i],
    }));
  }, [loaded, channelsVisible, channelColors, contrastLimitsState, histograms]);

  const menuViews = useMemo(
    () => [...(fitView ? [fitView] : []), ...(externalViews ?? [])],
    [fitView, externalViews],
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '0.85rem' }}>
          Loading zarr&hellip;
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ position: 'absolute', inset: 0, padding: '1rem', color: '#c0392b' }}>
          <strong>Failed to load zarr</strong>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#888', fontSize: '0.75rem', marginTop: '0.5rem' }}>{error}</pre>
        </div>
      );
    }

    if (!loaded) return null;

    const { viv, data, metadata, numChannels, deckDeps } = loaded;
    const { DeckGL, OrthographicView } = deckDeps;
    const { MultiscaleImageLayer, ImageLayer, ColorPaletteExtension, AdditiveColormapExtension } = viv as any;

    const omeroChannels = metadata?.omero?.channels ?? [];
    const defaultT = metadata?.omero?.rdefs?.defaultT ?? 0;
    const defaultZ = metadata?.omero?.rdefs?.defaultZ ?? 0;

    const defaultContrastLimits: [number, number][] = Array.from({ length: numChannels }, (_, i) => {
      const ch = omeroChannels[i];
      return ch ? [ch.window.start, ch.window.end] : [0, 65535];
    });
    const contrastLimits = contrastLimitsState && contrastLimitsState.length === numChannels
      ? contrastLimitsState
      : defaultContrastLimits;

    const defaultColors: [number, number, number][] = Array.from({ length: numChannels }, (_, i) => {
      const ch = omeroChannels[i];
      return ch?.color ? hexToRgb(ch.color) : FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    });
    const colors = channelColors && channelColors.length === numChannels ? channelColors : defaultColors;

    const visibleArr = channelsVisible.length === numChannels
      ? channelsVisible
      : Array.from({ length: numChannels }, () => true);

    const selections = Array.from({ length: numChannels }, (_, c) => ({
      t: defaultT, z: defaultZ, c,
    }));

    const loader = data.length > 1 ? data : data[0];
    const Layer = data.length > 1 ? MultiscaleImageLayer : ImageLayer;

    const isAdditive = blendMode === 'merged';

    if (!extensionsRef.current) {
      extensionsRef.current = {
        additive: [new AdditiveColormapExtension()],
        palette: [new ColorPaletteExtension()],
      };
    }
    if (!viewsRef.current) {
      viewsRef.current = [new OrthographicView({ id: 'ortho', controller: true })];
    }

    const layer = new Layer({
      loader,
      contrastLimits,
      colors,
      channelsVisible: visibleArr,
      selections,
      extensions: isAdditive ? extensionsRef.current.additive : extensionsRef.current.palette,
      ...(isAdditive ? { colormap } : {}),
      id: 'microatlas-image',
    });

    return (
      <>
        <DeckGL
          ref={deckRef}
          layers={[layer]}
          viewState={viewState && { ortho: viewState }}
          onViewStateChange={handleDeckViewStateChange}
          views={viewsRef.current}
        />
        <AnnotationOverlay
          annotations={externalAnnotations ?? []}
          visible={annotationsVisible}
          viewState={viewState}
          containerW={containerSize.w}
          containerH={containerSize.h}
          hoveredIdx={annotationHoveredIdx}
        />
        {physicalScale && (
          <ScaleBarOverlay
            physicalScale={physicalScale}
            viewState={viewState}
            config={scaleBarConfig}
            visible={scaleBarVisible}
          />
        )}
      </>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {renderContent()}
      {loaded && (
        <OverlayMenu
          containerW={containerSize.w}
          containerH={containerSize.h}
          views={menuViews}
          channels={channelInfos}
          blendMode={blendMode}
          colormap={colormap}
          portalTarget={containerRef.current}
          onToggleChannel={handleToggleChannel}
          onColorChange={handleColorChange}
          onContrastChange={handleContrastChange}
          onBlendModeChange={setBlendMode}
          onColormapChange={setColormap}
          onApplyAppearance={handleApplyAppearance}
          annotationsVisible={annotationsVisible}
          onAnnotationsVisibleChange={setAnnotationsVisible}
          scaleBarVisible={scaleBarVisible}
          onScaleBarVisibleChange={setScaleBarVisible}
          hasScaleBar={!!physicalScale && !!scaleBarProp}
          navigateTo={navigateTo}
        />
      )}
    </div>
  );
}
