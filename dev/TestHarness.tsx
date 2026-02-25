import { useState } from 'react';
import { MicroAtlasViewer, SavedView, Annotation, ScaleBarConfig } from '../src';

const DEFAULT_CONFIG = {
  source: 'https://barkley-replication.s3.us-east-2.amazonaws.com/experiment1/sample1.zarr/',
  width: 500,
  height: 500,
  views: [
    {
      name: 'Top-left quadrant',
      description: 'Zoomed into the upper-left region',
      zoom: -3.0,
      target: [2400, 2400, 0],
    },
    {
      name: 'Center detail',
      description: 'Close-up of the center',
      zoom: -2.0,
      target: [4886, 4886, 0],
    },
    {
      name: 'Channel 1 solo',
      description: 'Only first channel, high contrast',
      zoom: -3.0,
      target: [4886, 4886, 0],
      appearance: {
        channelsVisible: [true, false, false, false],
        blendMode: 'single',
      },
    },
  ],
  annotations: [
    { name: 'Region of interest', target: [2400, 2400], color: [100, 200, 255] },
    { name: 'Center', target: [4886, 4886] },
    { name: 'A very long annotation name that should truncate', target: [3500, 3500], color: [100, 255, 150] },
  ],
  scaleBar: { maxWidth: 120, position: 'bottom-right' },
};

export function TestHarness() {
  const [json, setJson] = useState(JSON.stringify(DEFAULT_CONFIG, null, 2));
  const [source, setSource] = useState(DEFAULT_CONFIG.source);
  const [width, setWidth] = useState(DEFAULT_CONFIG.width);
  const [height, setHeight] = useState(DEFAULT_CONFIG.height);
  const [views, setViews] = useState<SavedView[]>(DEFAULT_CONFIG.views as SavedView[]);
  const [annotations, setAnnotations] = useState<Annotation[]>(DEFAULT_CONFIG.annotations as Annotation[]);
  const [scaleBar, setScaleBar] = useState<ScaleBarConfig | boolean>(DEFAULT_CONFIG.scaleBar as ScaleBarConfig);
  const [parseError, setParseError] = useState<string | null>(null);
  const [debugView, setDebugView] = useState<{ zoom: number; target: [number, number, number] } | null>(null);

  function handleJsonChange(value: string) {
    setJson(value);
    try {
      const raw = JSON.parse(value);
      setParseError(null);
      if (raw.source) setSource(raw.source);
      if (raw.width) setWidth(raw.width);
      if (raw.height) setHeight(raw.height);
      if (Array.isArray(raw.views)) setViews(raw.views);
      if (Array.isArray(raw.annotations)) setAnnotations(raw.annotations);
      if (raw.scaleBar !== undefined) setScaleBar(raw.scaleBar);
    } catch (e) {
      setParseError((e as Error).message);
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div
        style={{
          width: 320,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #222',
          background: '#111',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #222', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
          Widget Config (markdown JSON)
        </div>
        <textarea
          value={json}
          onChange={(e) => handleJsonChange(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1, resize: 'none', background: '#0d0d0d', color: '#a8d8a8',
            border: 'none', outline: 'none', padding: '16px', fontSize: '12px',
            lineHeight: 1.6, fontFamily: 'inherit',
          }}
        />
        {parseError && (
          <div style={{ padding: '10px 16px', background: '#1a0a0a', color: '#c0392b', fontSize: '11px', borderTop: '1px solid #2a0a0a' }}>
            {parseError}
          </div>
        )}
      </div>

      <div style={{ flex: 1, background: '#f5c6d0', overflow: 'auto', padding: 40 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ color: '#333', fontFamily: 'Georgia, serif', fontSize: 28, marginBottom: 8 }}>
            My Research Paper
          </h1>
          <p style={{ color: '#555', fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
            Below is an embedded microATLAS widget showing the OME-Zarr data.
            This simulates how the widget will appear when embedded via <code style={{ background: '#e8a0b0', padding: '2px 6px', borderRadius: 3 }}>:::any:bundle</code> in a Curvenote/JupyterBook page.
          </p>

          <div
            style={{
              border: '2px solid #fff',
              borderRadius: 8,
              overflow: 'hidden',
              width,
              height,
              position: 'relative',
              background: '#000',
            }}
          >
            <MicroAtlasViewer key={source} source={source} views={views} annotations={annotations} scaleBar={scaleBar} onViewStateChange={setDebugView} />
          </div>

          {debugView && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(0,0,0,0.05)', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', color: '#444' }}>
              zoom: {debugView.zoom.toFixed(3)} &nbsp; target: [{debugView.target.map(v => v.toFixed(1)).join(', ')}]
            </div>
          )}

          <p style={{ color: '#555', fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.8, marginTop: 24 }}>
            The widget above supports pan and zoom. More controls coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
