import { useState } from 'react';
import DropZone from '../DropZone.jsx';
import { addWatermark, saveFile } from '../../utils/pdfOperations.js';
import { useToast, usePreview } from '../../App.jsx';

export default function Watermark() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.15);
  const [fontSize, setFontSize] = useState(60);
  const [rotation, setRotation] = useState(-45);
  const [processing, setProcessing] = useState(false);
  const toast = useToast();
  const preview = usePreview();

  const run = async () => {
    if (!file) { toast('Load a PDF first', 'error'); return; }
    if (!text.trim()) { toast('Enter watermark text', 'error'); return; }
    setProcessing(true);
    try {
      const result = await addWatermark(file, text, { opacity, fontSize, rotation });
      const name = file.name.replace('.pdf', '_watermarked.pdf');
      const path = await saveFile(result, name);
      if (path) toast('Watermark added!', 'success');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    } finally { setProcessing(false); }
  };

  return (
    <div>
      <div className="tool-header">
        <h1>Add <span>Watermark</span></h1>
        <p>Stamp text watermark on every page of your PDF</p>
      </div>

      {!file ? (
        <DropZone onFiles={f => setFile(f[0])} multiple={false} />
      ) : (
        <div className="file-item" style={{marginBottom:20}}>
          <span className="file-item-icon">◎</span>
          <span className="file-item-name">{file.name}</span>
              <button className="btn btn-ghost" style={{padding:'4px 8px', fontSize:12}} onClick={(e) => { e.stopPropagation(); preview(file); }}>👁 Preview</button>
          <button className="file-item-remove" onClick={() => setFile(null)}>✕</button>
        </div>
      )}

      {file && (
        <>
          <div className="card glass" style={{marginBottom:16}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
              <div>
                <span className="label">Watermark Text</span>
                <input className="input" value={text} onChange={e => setText(e.target.value)} placeholder="CONFIDENTIAL" />
              </div>
              <div>
                <span className="label">Font Size: {fontSize}px</span>
                <input type="range" min={20} max={120} value={fontSize} onChange={e => setFontSize(+e.target.value)}
                  style={{width:'100%', accentColor:'var(--cyan)', marginTop:8}} />
              </div>
              <div>
                <span className="label">Opacity: {Math.round(opacity*100)}%</span>
                <input type="range" min={5} max={50} value={Math.round(opacity*100)} onChange={e => setOpacity(e.target.value/100)}
                  style={{width:'100%', accentColor:'var(--cyan)', marginTop:8}} />
              </div>
              <div>
                <span className="label">Rotation: {rotation}°</span>
                <input type="range" min={-90} max={0} value={rotation} onChange={e => setRotation(+e.target.value)}
                  style={{width:'100%', accentColor:'var(--cyan)', marginTop:8}} />
              </div>
            </div>

            {/* Preview */}
            <div style={{
              marginTop:16, height:80, borderRadius:'var(--radius-sm)',
              background:'rgba(255,255,255,0.04)', border:'1px solid var(--glass-border)',
              display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative'
            }}>
              <span style={{
                fontFamily:'var(--font-display)', fontSize: Math.min(fontSize*0.35, 40),
                color:`rgba(0,240,255,${opacity*3})`,
                transform:`rotate(${rotation}deg)`,
                letterSpacing:'0.1em', fontWeight:700, userSelect:'none',
                textTransform:'uppercase',
              }}>{text || 'PREVIEW'}</span>
            </div>
          </div>

          <div className="action-bar">
            <button className="btn btn-primary" onClick={run} disabled={processing}>
              {processing ? '◎ Applying...' : '◎ Apply Watermark'}
            </button>
          </div>
          {processing && <div className="progress-bar"><div className="progress-fill" style={{width:'60%'}} /></div>}
        </>
      )}
    </div>
  );
}
