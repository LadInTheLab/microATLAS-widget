import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MicroAtlasViewer, SavedView, SavedViewAppearance, Annotation, ScaleBarConfig } from '../src';

const WIDGET_URL = 'https://LadInTheLab.github.io/microATLAS-widget/widget.js';
const DEFAULT_SOURCE = 'https://barkley-replication.s3.us-east-2.amazonaws.com/experiment1/sample1.zarr/';

const COLOR_SWATCHES: [number, number, number][] = [
  [235, 87, 87], [99, 179, 237], [104, 211, 145],
  [246, 196, 68], [176, 120, 235], [56, 224, 200],
  [237, 137, 54], [237, 100, 166], [154, 230, 96],
];

const POSITION_OPTIONS: ScaleBarConfig['position'][] = [
  'bottom-right', 'bottom-left', 'top-right', 'top-left',
];

const ACCENT = 'rgb(99, 144, 240)';
const ACCENT_15 = 'rgba(99, 144, 240, 0.15)';
const ACCENT_25 = 'rgba(99, 144, 240, 0.25)';
const ACCENT_40 = 'rgba(99, 144, 240, 0.40)';
const SUCCESS = 'rgb(104, 211, 145)';
const DANGER = 'rgb(235, 87, 87)';
const SURFACE_0 = '#0c0c0f';
const SURFACE_1 = '#131318';
const SURFACE_2 = '#1a1a22';
const SURFACE_3 = '#22222e';
const BORDER = 'rgba(255,255,255,0.06)';
const BORDER_HOVER = 'rgba(255,255,255,0.12)';
const TEXT_1 = 'rgba(255,255,255,0.92)';
const TEXT_2 = 'rgba(255,255,255,0.55)';
const TEXT_3 = 'rgba(255,255,255,0.30)';
const RADIUS = 10;
const RADIUS_SM = 7;
const MONO = "'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace";

function rgbStr(c: [number, number, number]) {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M4 10h3" /><path d="M4 14h5" /><path d="M4 18h3" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CrosshairIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  );
}

function generateMarkdown(
  source: string,
  views: SavedView[],
  annotations: Annotation[],
  scaleBar: ScaleBarConfig | false,
): string {
  const config: Record<string, unknown> = { source };
  if (views.length > 0) {
    config.views = views.map(({ default: d, ...rest }) => d ? { ...rest, default: true } : rest);
  }
  if (annotations.length > 0) config.annotations = annotations;
  if (scaleBar) config.scaleBar = scaleBar;
  const json = JSON.stringify(config, null, 2);
  return `:::{any:bundle} ${WIDGET_URL}\n${json}\n:::`;
}

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ color: TEXT_2, display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_2, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      {count !== undefined && count > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 600, color: ACCENT,
          background: ACCENT_15, borderRadius: 10,
          padding: '1px 7px', marginLeft: 'auto',
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

function ActionButton({ onClick, disabled, children, variant = 'primary', fullWidth }: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
  fullWidth?: boolean;
}) {
  const isPrimary = variant === 'primary';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        width: fullWidth ? '100%' : undefined,
        background: isPrimary ? ACCENT_15 : 'transparent',
        border: `1px solid ${isPrimary ? ACCENT_40 : BORDER}`,
        borderRadius: RADIUS_SM,
        padding: '7px 14px',
        fontSize: 12,
        fontWeight: 500,
        color: isPrimary ? ACCENT : TEXT_2,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit',
        opacity: disabled ? 0.35 : 1,
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = isPrimary ? ACCENT_25 : 'rgba(255,255,255,0.04)';
          e.currentTarget.style.borderColor = isPrimary ? ACCENT : BORDER_HOVER;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isPrimary ? ACCENT_15 : 'transparent';
        e.currentTarget.style.borderColor = isPrimary ? ACCENT_40 : BORDER;
      }}
    >
      {children}
    </button>
  );
}

function TextInput({ value, onChange, onEnter, placeholder, autoFocus, mono }: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  mono?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onEnter ? (e) => { if (e.key === 'Enter') onEnter(); } : undefined}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        width: '100%',
        background: SURFACE_2,
        border: `1px solid ${BORDER}`,
        borderRadius: RADIUS_SM,
        padding: '8px 10px',
        fontSize: 12,
        color: TEXT_1,
        fontFamily: mono ? MONO : 'inherit',
        transition: 'border-color 0.15s',
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT_40; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = BORDER; }}
    />
  );
}

function NumberInput({ value, onChange, min, max, error }: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  error?: boolean;
}) {
  const borderColor = error ? DANGER : BORDER;
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      {...(min !== undefined ? { min } : {})}
      {...(max !== undefined ? { max } : {})}
      style={{
        width: '100%',
        background: error ? 'rgba(235,87,87,0.06)' : SURFACE_2,
        border: `1px solid ${borderColor}`,
        borderRadius: RADIUS_SM,
        padding: '8px 10px',
        fontSize: 12,
        color: TEXT_1,
        fontFamily: MONO,
        textAlign: 'center',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = error ? DANGER : ACCENT_40; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = borderColor; }}
    />
  );
}

function ListItem({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 8px',
      borderRadius: RADIUS_SM,
      background: SURFACE_2,
      marginBottom: 4,
      transition: 'background 0.12s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = SURFACE_3; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = SURFACE_2; }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        {children}
      </div>
      <button
        onClick={onDelete}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: TEXT_3,
          padding: 4,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          transition: 'color 0.15s, background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = DANGER; e.currentTarget.style.background = 'rgba(235,87,87,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_3; e.currentTarget.style.background = 'none'; }}
        title="Remove"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        border: 'none',
        background: checked ? ACCENT : SURFACE_3,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s ease',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <div style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        background: '#fff',
        position: 'absolute',
        top: 3,
        left: checked ? 19 : 3,
        transition: 'left 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

export function Builder() {
  const [urlInput, setUrlInput] = useState(DEFAULT_SOURCE);
  const [source, setSource] = useState(DEFAULT_SOURCE);

  const [viewerWidth, setViewerWidth] = useState(500);
  const [viewerHeight, setViewerHeight] = useState(500);
  const [views, setViews] = useState<SavedView[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [scaleBarEnabled, setScaleBarEnabled] = useState(false);
  const [scaleBarMaxWidth, setScaleBarMaxWidth] = useState(100);
  const [scaleBarPosition, setScaleBarPosition] = useState<ScaleBarConfig['position']>('bottom-right');

  const viewStateRef = useRef<{ zoom: number; target: [number, number, number] } | null>(null);
  const [hasViewState, setHasViewState] = useState(false);
  const handleViewStateChange = useCallback((vs: { zoom: number; target: [number, number, number] }) => {
    viewStateRef.current = vs;
    if (!hasViewState) setHasViewState(true);
  }, [hasViewState]);

  const appearanceRef = useRef<SavedViewAppearance | null>(null);
  const handleAppearanceChange = useCallback((a: SavedViewAppearance) => {
    appearanceRef.current = a;
  }, []);

  const [captureFormOpen, setCaptureFormOpen] = useState(false);
  const [captureName, setCaptureName] = useState('');
  const [captureDesc, setCaptureDesc] = useState('');
  const [captureAppearance, setCaptureAppearance] = useState(true);

  const [annotationFormOpen, setAnnotationFormOpen] = useState(false);
  const [annotationName, setAnnotationName] = useState('');
  const [annotationColor, setAnnotationColor] = useState<[number, number, number]>(COLOR_SWATCHES[0]);
  const [annotationMode, setAnnotationMode] = useState(false);

  const [copied, setCopied] = useState(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!annotationMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAnnotationMode(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [annotationMode]);

  const scaleBar: ScaleBarConfig | false = scaleBarEnabled
    ? { maxWidth: scaleBarMaxWidth, position: scaleBarPosition }
    : false;

  const widthValid = viewerWidth >= 100 && viewerWidth <= 2000;
  const heightValid = viewerHeight >= 100 && viewerHeight <= 2000;
  const sizeValid = widthValid && heightValid;

  const markdown = sizeValid
    ? generateMarkdown(source, views, annotations, scaleBar)
    : '// Fix widget size errors above';

  const handleLoad = () => {
    const trimmed = urlInput.trim();
    if (trimmed && trimmed !== source) {
      setSource(trimmed);
      setViews([]);
      setAnnotations([]);
      viewStateRef.current = null;
      setHasViewState(false);
    }
  };

  const handleCaptureView = () => {
    const vs = viewStateRef.current;
    if (!vs || !captureName.trim()) return;
    setViews((prev) => [...prev, {
      name: captureName.trim(),
      ...(captureDesc.trim() ? { description: captureDesc.trim() } : {}),
      zoom: Math.round(vs.zoom * 1000) / 1000,
      target: [Math.round(vs.target[0]), Math.round(vs.target[1]), 0],
      ...(captureAppearance && appearanceRef.current ? { appearance: appearanceRef.current } : {}),
    }]);
    setCaptureName('');
    setCaptureDesc('');
    setCaptureFormOpen(false);
  };

  const handleStartAnnotationPlace = () => {
    if (!annotationName.trim()) return;
    setAnnotationMode(true);
  };

  const handleViewerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const vs = viewStateRef.current;
    if (!annotationMode || !vs || !viewerContainerRef.current) return;
    const rect = viewerContainerRef.current.getBoundingClientRect();
    const scale = Math.pow(2, vs.zoom);
    const imageX = Math.round((e.clientX - rect.left - rect.width / 2) / scale + vs.target[0]);
    const imageY = Math.round((e.clientY - rect.top - rect.height / 2) / scale + vs.target[1]);
    setAnnotations((prev) => [...prev, { name: annotationName.trim(), target: [imageX, imageY], color: annotationColor }]);
    setAnnotationMode(false);
    setAnnotationName('');
    setAnnotationFormOpen(false);
  }, [annotationMode, annotationName, annotationColor]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: SURFACE_0 }}>

      {/* ─── Header ─── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 20px',
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
        background: SURFACE_1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${ACCENT}, #a78bfa)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
            boxShadow: '0 2px 8px rgba(99,144,240,0.3)',
          }}>
            m
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_1, letterSpacing: '-0.02em', lineHeight: 1 }}>
              microATLAS
            </div>
            <div style={{ fontSize: 9, fontWeight: 500, color: TEXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>
              Widget Builder
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: BORDER, flexShrink: 0 }} />

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          background: SURFACE_2,
          border: `1px solid ${BORDER}`,
          borderRadius: RADIUS_SM,
          padding: '0 4px 0 12px',
          transition: 'border-color 0.15s',
        }}
          onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT_40; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = BORDER; }}
        >
          <span style={{ fontSize: 11, color: TEXT_3, whiteSpace: 'nowrap', marginRight: 6 }}>Source</span>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLoad(); }}
            placeholder="https://your-bucket.s3.amazonaws.com/data.zarr/"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '9px 4px',
              fontSize: 12,
              color: TEXT_1,
              fontFamily: MONO,
              minWidth: 0,
            }}
          />
          <button
            onClick={handleLoad}
            style={{
              background: ACCENT,
              border: 'none',
              borderRadius: 5,
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'opacity 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Load
          </button>
        </div>
      </header>

      {/* ─── Main ─── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        <div style={{
          flex: 1,
          overflow: 'auto',
          background: `radial-gradient(ellipse at center, ${SURFACE_2} 0%, ${SURFACE_0} 70%)`,
          minWidth: 0,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: 48,
            minHeight: '100%',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div
                ref={viewerContainerRef}
                style={{
                  width: viewerWidth,
                  height: viewerHeight,
                  flexShrink: 0,
                  position: 'relative',
                  background: '#000',
                  borderRadius: RADIUS + 2,
                  overflow: 'hidden',
                  border: `1px solid rgba(255,255,255,0.06)`,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 12px 48px rgba(0,0,0,0.2)',
                }}
              >
                {source && (
                  <MicroAtlasViewer
                    key={source}
                    source={source}
                    views={views}
                    annotations={annotations}
                    scaleBar={scaleBar || undefined}
                    onViewStateChange={handleViewStateChange}
                    onAppearanceChange={handleAppearanceChange}
                  />
                )}
                {annotationMode && (
                  <div
                    onClick={handleViewerClick}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      cursor: 'crosshair',
                      zIndex: 20,
                      background: 'rgba(99,144,240,0.04)',
                      borderRadius: RADIUS + 2,
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(12,12,15,0.92)',
                      border: `1px solid ${ACCENT_40}`,
                      borderRadius: RADIUS,
                      padding: '8px 16px',
                      fontSize: 12,
                      fontWeight: 500,
                      color: ACCENT,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backdropFilter: 'blur(12px)',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    }}>
                      <CrosshairIcon />
                      Click to place "{annotationName}"
                      <span style={{ color: TEXT_3, fontSize: 11 }}>Esc to cancel</span>
                    </div>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 11, color: TEXT_3, fontFamily: MONO }}>
                {viewerWidth} x {viewerHeight}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Tools sidebar ─── */}
        <div style={{
          width: 300,
          flexShrink: 0,
          borderLeft: `1px solid ${BORDER}`,
          background: SURFACE_1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>

            <div style={{ marginBottom: 16 }}>
              <SectionHeader icon={<MaximizeIcon />} label="Widget Size" />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: widthValid ? TEXT_3 : DANGER, marginBottom: 4 }}>Width</div>
                  <NumberInput value={viewerWidth} onChange={setViewerWidth} error={!widthValid} />
                </div>
                <span style={{ fontSize: 12, color: TEXT_3, marginTop: 16 }}>x</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: heightValid ? TEXT_3 : DANGER, marginBottom: 4 }}>Height</div>
                  <NumberInput value={viewerHeight} onChange={setViewerHeight} error={!heightValid} />
                </div>
              </div>
              {!sizeValid && (
                <div style={{ fontSize: 10, color: DANGER, marginTop: 6 }}>
                  Must be between 100 and 2000
                </div>
              )}
            </div>

            <div style={{ height: 1, background: BORDER, margin: '0 -16px 16px' }} />

            <div style={{ marginBottom: 16 }}>
              <SectionHeader icon={<CameraIcon />} label="Saved Views" count={views.length} />
              {views.map((v, i) => (
                <ListItem key={i} onDelete={() => setViews((p) => p.filter((_, j) => j !== i))}>
                  <button
                    onClick={() => setViews((p) => p.map((view, j) => ({
                      ...view,
                      default: j === i ? !view.default : false,
                    })))}
                    title={v.default ? 'Remove as default view' : 'Set as default view'}
                    style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: `1.5px solid ${v.default ? ACCENT : TEXT_3}`,
                      background: v.default ? ACCENT : 'transparent',
                      cursor: 'pointer', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {v.default && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: TEXT_1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.name}
                      {v.default && (
                        <span style={{ fontSize: 9, color: ACCENT, marginLeft: 6, fontWeight: 600 }}>default</span>
                      )}
                      {v.appearance && (
                        <span style={{ fontSize: 9, color: TEXT_3, marginLeft: 6, fontWeight: 400 }}>+ appearance</span>
                      )}
                    </div>
                    {v.description && (
                      <div style={{ fontSize: 10, color: TEXT_3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{v.description}</div>
                    )}
                  </div>
                </ListItem>
              ))}
              {captureFormOpen ? (
                <div style={{ background: SURFACE_2, borderRadius: RADIUS_SM, padding: 10, marginTop: 4 }}>
                  <div style={{ marginBottom: 6 }}>
                    <TextInput value={captureName} onChange={setCaptureName} onEnter={handleCaptureView} placeholder="View name" autoFocus />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <TextInput value={captureDesc} onChange={setCaptureDesc} onEnter={handleCaptureView} placeholder="Description (optional)" />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 12, color: TEXT_2 }}>
                    <input
                      type="checkbox"
                      checked={captureAppearance}
                      onChange={(e) => setCaptureAppearance(e.target.checked)}
                      style={{ accentColor: ACCENT }}
                    />
                    Save appearance
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <ActionButton onClick={handleCaptureView} disabled={!captureName.trim() || !hasViewState}>Save</ActionButton>
                    <ActionButton onClick={() => { setCaptureFormOpen(false); setCaptureName(''); setCaptureDesc(''); }} variant="ghost">Cancel</ActionButton>
                  </div>
                </div>
              ) : (
                <ActionButton onClick={() => setCaptureFormOpen(true)} disabled={!hasViewState} fullWidth>
                  <CameraIcon /> Capture Current View
                </ActionButton>
              )}
            </div>

            <div style={{ height: 1, background: BORDER, margin: '0 -16px 16px' }} />

            <div style={{ marginBottom: 16 }}>
              <SectionHeader icon={<PinIcon />} label="Annotations" count={annotations.length} />
              {annotations.map((a, i) => (
                <ListItem key={i} onDelete={() => setAnnotations((p) => p.filter((_, j) => j !== i))}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: rgbStr(a.color ?? [235, 87, 87]),
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${rgbStr(a.color ?? [235, 87, 87])}40`,
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: TEXT_1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.name}
                  </span>
                </ListItem>
              ))}
              {annotationFormOpen && !annotationMode ? (
                <div style={{ background: SURFACE_2, borderRadius: RADIUS_SM, padding: 10, marginTop: 4 }}>
                  <div style={{ marginBottom: 8 }}>
                    <TextInput value={annotationName} onChange={setAnnotationName} onEnter={handleStartAnnotationPlace} placeholder="Annotation name" autoFocus />
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                    {COLOR_SWATCHES.map((c, i) => {
                      const selected = c[0] === annotationColor[0] && c[1] === annotationColor[1] && c[2] === annotationColor[2];
                      return (
                        <button
                          key={i}
                          onClick={() => setAnnotationColor(c)}
                          style={{
                            width: 22, height: 22, borderRadius: 6,
                            border: selected ? '2px solid #fff' : `1px solid ${BORDER}`,
                            background: rgbStr(c),
                            cursor: 'pointer',
                            padding: 0,
                            transform: selected ? 'scale(1.15)' : 'scale(1)',
                            transition: 'transform 0.12s, box-shadow 0.12s',
                            boxShadow: selected ? `0 0 8px ${rgbStr(c)}60` : 'none',
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <ActionButton onClick={handleStartAnnotationPlace} disabled={!annotationName.trim() || !hasViewState}>
                      <CrosshairIcon /> Place on Image
                    </ActionButton>
                    <ActionButton onClick={() => { setAnnotationFormOpen(false); setAnnotationName(''); }} variant="ghost">Cancel</ActionButton>
                  </div>
                </div>
              ) : !annotationMode ? (
                <ActionButton onClick={() => setAnnotationFormOpen(true)} disabled={!hasViewState} fullWidth>
                  <PinIcon /> Add Annotation
                </ActionButton>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: RADIUS_SM,
                  background: ACCENT_15,
                  border: `1px solid ${ACCENT_40}`,
                  marginTop: 4,
                }}>
                  <CrosshairIcon />
                  <span style={{ fontSize: 11, color: ACCENT, fontWeight: 500 }}>Click on the image...</span>
                </div>
              )}
            </div>

            <div style={{ height: 1, background: BORDER, margin: '0 -16px 16px' }} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ color: TEXT_2, display: 'flex' }}><RulerIcon /></span>
                <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_2, letterSpacing: '0.04em', textTransform: 'uppercase', flex: 1 }}>Scale Bar</span>
                <ToggleSwitch checked={scaleBarEnabled} onChange={setScaleBarEnabled} />
              </div>
              {scaleBarEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: TEXT_2, whiteSpace: 'nowrap', width: 60 }}>Max width</span>
                    <div style={{ width: 70 }}>
                      <NumberInput value={scaleBarMaxWidth} onChange={setScaleBarMaxWidth} min={40} max={300} />
                    </div>
                    <span style={{ fontSize: 11, color: TEXT_3 }}>px</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: TEXT_2, whiteSpace: 'nowrap', width: 60 }}>Position</span>
                    <select
                      value={scaleBarPosition}
                      onChange={(e) => setScaleBarPosition(e.target.value as ScaleBarConfig['position'])}
                      style={{
                        flex: 1,
                        background: SURFACE_2,
                        border: `1px solid ${BORDER}`,
                        borderRadius: RADIUS_SM,
                        padding: '7px 10px',
                        fontSize: 12,
                        color: TEXT_1,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT_40; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = BORDER; }}
                    >
                      {POSITION_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Output bar ─── */}
      <div style={{
        flexShrink: 0,
        borderTop: `1px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'stretch',
        background: SURFACE_1,
      }}>
        <div style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          borderRight: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: TEXT_3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Output</span>
        </div>
        <pre style={{
          flex: 1,
          margin: 0,
          padding: '10px 16px',
          fontSize: 11.5,
          lineHeight: 1.6,
          color: 'rgb(152, 220, 152)',
          background: SURFACE_0,
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: 180,
          whiteSpace: 'pre',
          fontFamily: MONO,
        }}>
          {markdown}
        </pre>
        <button
          onClick={handleCopy}
          style={{
            flexShrink: 0,
            width: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: copied ? 'rgba(104,211,145,0.08)' : SURFACE_1,
            border: 'none',
            borderLeft: `1px solid ${BORDER}`,
            color: copied ? SUCCESS : TEXT_2,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.background = SURFACE_2; e.currentTarget.style.color = TEXT_1; } }}
          onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.background = SURFACE_1; e.currentTarget.style.color = TEXT_2; } }}
        >
          {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
        </button>
      </div>
    </div>
  );
}
