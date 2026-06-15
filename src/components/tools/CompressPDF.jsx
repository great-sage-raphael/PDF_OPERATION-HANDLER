import { useState, useCallback, useEffect, useRef } from 'react';
import DropZone from '../DropZone.jsx';
import { compressPDF, previewCompressedPage, saveFile, formatBytes, b64ToUint8 } from '../../utils/pdfOperations.js';
import { useToast, usePreview } from '../../App.jsx';

// ── Score gauge SVG ──────────────────────────────────────────────────────────
function ScoreGauge({ score, label }) {
  const color = score >= 60 ? '#00ff88' : score >= 25 ? '#ffaa00' : '#ff4488';
  const circ = 2 * Math.PI * 40;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="90" height="90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle cx="50" cy="50" r="40" fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s' }} />
        <text x="50" y="54" textAnchor="middle" fill={color}
          style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700 }}>{score}</text>
      </svg>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label || 'Score'}
      </span>
    </div>
  );
}

// ── Range slider with gradient fill ──────────────────────────────────────────
function Slider({ label, value, min, max, step, unit, onChange, left, right }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label" style={{ margin: 0 }}>{label}</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
          color: 'var(--cyan)', background: 'rgba(0,240,255,0.08)',
          padding: '2px 10px', borderRadius: 6, border: '1px solid rgba(0,240,255,0.15)'
        }}>{value}{unit}</span>
      </div>
      <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3,
          width: `${pct}%`, background: 'linear-gradient(90deg, var(--cyan), var(--magenta))',
          transition: 'width 0.08s',
        }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} />
      </div>
      {(left || right) && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{left}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{right}</span>
        </div>
      )}
    </div>
  );
}

// ── Pixel input ──────────────────────────────────────────────────────────────
function PxInput({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="label" style={{ margin: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="number" min={0} value={value || ''} placeholder={placeholder}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          className="input"
          style={{ width: 100, fontFamily: 'var(--font-mono)', fontSize: 13, padding: '6px 10px' }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>px</span>
      </div>
    </div>
  );
}

export default function CompressPDF() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState(72);
  const [maxWidth, setMaxWidth] = useState(null);
  const [maxHeight, setMaxHeight] = useState(null);
  const [format, setFormat] = useState('jpeg');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  // Preview state
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = fit, >1 = zoomed in
  const previewTimer = useRef(null);
  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const toast = useToast();
  const preview = usePreview();

  const addFile = (files) => { setFile(files[0]); setResult(null); setPreviewData(null); };

  // ── Live preview (debounced) ──────────────────────────────────────────────
  const updatePreview = useCallback(() => {
    if (!file) return;
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const data = await previewCompressedPage(file, 1, {
          quality: quality / 100,
          maxWidth: maxWidth || null,
          maxHeight: maxHeight || null,
          format,
        });
        setPreviewData(data);
      } catch (e) {
        console.error('Preview error:', e);
        setPreviewData({ error: e.message || 'Failed to render preview' });
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
  }, [file, quality, maxWidth, maxHeight, format]);

  useEffect(() => {
    updatePreview();
    return () => clearTimeout(previewTimer.current);
  }, [updatePreview]);

  // ── Run compression ────────────────────────────────────────────────────────
  const run = useCallback(async () => {
    if (!file) { toast('Load a PDF first', 'error'); return; }
    setProcessing(true);
    try {
      const compressed = await compressPDF(file, {
        quality: quality / 100,
        maxWidth: maxWidth || null,
        maxHeight: maxHeight || null,
        format,
      });
      const origSize = file.size || b64ToUint8(file.data).length;
      const newSize  = b64ToUint8(compressed).length;
      const savings  = origSize > 0 ? (((origSize - newSize) / origSize) * 100) : 0;
      const score    = savings <= 0 ? 0 : Math.min(100, Math.round(savings * 1.4));
      setResult({ data: compressed, origSize, newSize, savings: Number(savings.toFixed(1)), score });
      toast(savings > 0 ? `Compressed — saved ${savings.toFixed(1)}%` : 'Already optimal', savings > 0 ? 'success' : 'info');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    } finally { setProcessing(false); }
  }, [file, quality, maxWidth, maxHeight, format, toast]);

  const download = async () => {
    if (!result) return;
    try {
      const name = file.name.replace('.pdf', '_compressed.pdf');
      const saved = await saveFile(result.data, name);
      if (saved) toast('Saved successfully!', 'success');
    } catch (e) {
      console.error(e);
      toast(`Save Error: ${e.message}`, 'error');
      
      // Force browser fallback if Electron write fails
      try {
        const blob = new Blob([b64ToUint8(result.data)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = file.name.replace('.pdf', '_compressed.pdf'); 
        a.click();
        URL.revokeObjectURL(url);
        toast('Downloaded via browser fallback', 'success');
      } catch (err) {
        toast(`Browser fallback failed: ${err.message}`, 'error');
      }
    }
  };

  const reset = () => {
    setQuality(72); setMaxWidth(null); setMaxHeight(null);
    setFormat('jpeg'); setResult(null);
  };

  const handleMouseDown = (e) => {
    if (zoom <= 1 || !scrollRef.current) return;
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || zoom <= 1 || !scrollRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
    scrollRef.current.scrollTop = dragStart.current.scrollTop - dy;
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  return (
    <div>
      <div className="tool-header">
        <h1>Compress <span>PDF</span></h1>
        <p>Quality · resize · format controls with live preview</p>
      </div>

      {!file ? (
        <DropZone onFiles={addFile} multiple={false} />
      ) : (
        <div className="file-item" style={{ marginBottom: 20 }}>
          <span className="file-item-icon">◈</span>
          <span className="file-item-name">{file.name}</span>
          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}
            onClick={(e) => { e.stopPropagation(); preview(file); }}>👁 Preview</button>
          <span className="file-item-size">{formatBytes(file.size)}</span>
          <button className="file-item-remove" onClick={() => { setFile(null); setResult(null); setPreviewData(null); }}>✕</button>
        </div>
      )}

      {file && (
        <>
          {/* ── Controls ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Left: sliders & inputs */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Quality slider */}
              <Slider label="Image Quality" value={quality} min={10} max={100} step={1} unit="%"
                left="Smaller" right="Sharper"
                onChange={v => { setQuality(v); setResult(null); }} />

              {/* Format */}
              <div>
                <span className="label">Output Format</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['jpeg', 'png'].map(f => (
                    <button key={f}
                      className={`btn ${format === f ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => { setFormat(f); setResult(null); }}
                      style={{ fontSize: 12 }}>
                      {f.toUpperCase()}
                      <span style={{ fontSize: 9, display: 'block', color: format === f ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginTop: 2 }}>
                        {f === 'jpeg' ? 'Smaller files' : 'Lossless'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resize */}
              <div>
                <span className="label">Resize Pages (pixels)</span>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                  <PxInput label="Max Width" value={maxWidth} onChange={v => { setMaxWidth(v); setResult(null); }}
                    placeholder={previewData ? String(previewData.origWidth) : 'auto'} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-muted)', paddingBottom: 8 }}>×</span>
                  <PxInput label="Max Height" value={maxHeight} onChange={v => { setMaxHeight(v); setResult(null); }}
                    placeholder={previewData ? String(previewData.origHeight) : 'auto'} />
                </div>
                {previewData && (
                  <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                    Original: {previewData.origWidth} × {previewData.origHeight} px
                    {(maxWidth || maxHeight) && previewData && (
                      <span style={{ color: 'var(--cyan)' }}>
                        {' → '}{previewData.renderWidth} × {previewData.renderHeight} px
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button className="btn btn-ghost" onClick={reset} style={{ alignSelf: 'flex-start', fontSize: 11, padding: '4px 12px' }}>
                ↺ Reset defaults
              </button>
            </div>

            {/* Right: live preview */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 340, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', paddingBottom: 4 }}>
                <span className="label" style={{ margin: 0 }}>
                  Quality Preview (Page 1){previewData ? ` · ${previewData.totalPages} page${previewData.totalPages > 1 ? 's' : ''}` : ''}
                </span>
                {previewData && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{Math.round(zoom * 100)}%</span>
                    <input type="range" min="1" max="5" step="0.1" value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ width: 80 }} />
                  </div>
                )}
              </div>
              {previewLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: 'var(--radius)', zIndex: 2 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)' }}>Rendering...</span>
                </div>
              )}
              {previewData && previewData.error ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--amber)' }}>
                    Preview Error: {previewData.error}
                  </span>
                </div>
              ) : previewData ? (
                <>
                  <div 
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    style={{
                      flex: 1, width: '100%', height: 260, display: 'flex', 
                      alignItems: zoom > 1 ? 'flex-start' : 'center', 
                      justifyContent: zoom > 1 ? 'flex-start' : 'center',
                      overflow: 'auto', borderRadius: 'var(--radius-sm)', background: '#0a0a0a',
                      border: '1px solid var(--glass-border)',
                      cursor: zoom > 1 ? (isDragging.current ? 'grabbing' : 'grab') : 'default',
                    }}>
                    <img src={previewData.dataUrl} alt="Preview"
                      draggable="false"
                      style={{ 
                        width: zoom > 1 ? `${zoom * 100}%` : 'auto', 
                        height: zoom > 1 ? 'auto' : '100%', 
                        maxWidth: zoom === 1 ? '100%' : 'none', 
                        objectFit: 'contain', 
                        display: 'block' 
                      }} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                    <span>{previewData.renderWidth}×{previewData.renderHeight}px</span>
                    <span>~{formatBytes(previewData.estimatedBytes)}/page</span>
                    <span>{format.toUpperCase()} @ {quality}%</span>
                  </div>
                </>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>Loading preview...</span>
              )}
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="action-bar" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={run} disabled={processing}>
              {processing ? '◈ Compressing...' : '◈ Compress PDF'}
            </button>
            {result && (
              <button className="btn btn-success" onClick={download}>⬇ Save Compressed PDF</button>
            )}
          </div>
          {processing && <div className="progress-bar"><div className="progress-fill" style={{ width: '65%' }} /></div>}

          {/* ── Results ── */}
          {result && (
            <div style={{ marginTop: 20 }}>
              <div className="card glass" style={{
                display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
                background: result.savings > 0 ? 'rgba(0,255,136,0.04)' : 'rgba(255,170,0,0.04)',
                border: `1px solid ${result.savings > 0 ? 'rgba(0,255,136,0.2)' : 'rgba(255,170,0,0.2)'}`,
              }}>
                <ScoreGauge score={result.score} label="Compression" />
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, minWidth: 180 }}>
                  {[
                    ['Original', formatBytes(result.origSize), 'var(--text-secondary)'],
                    ['Compressed', formatBytes(result.newSize), result.newSize < result.origSize ? '#00ff88' : '#ffaa00'],
                    ['Saved', `${Math.max(0, result.savings)}%`, result.savings > 0 ? '#00ff88' : '#ffaa00'],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{k}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {result.savings <= 0 && (
                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', margin: 0 }}>
                    ◈ PDF is already optimized at these settings. Try lowering Quality or adding pixel constraints.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
