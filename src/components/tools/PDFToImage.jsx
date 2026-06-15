import { useState } from 'react';
import DropZone from '../DropZone.jsx';
import { pdfToImages, saveFile, getPageCount } from '../../utils/pdfOperations.js';
import { useToast, usePreview } from '../../App.jsx';

export default function PDFToImage() {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('jpeg');
  const [scale, setScale] = useState(2);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previews, setPreviews] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const toast = useToast();
  const preview = usePreview();

  const addFile = async (files) => {
    setFile(files[0]); setPreviews([]);
    try { const c = await getPageCount(files[0]); setPageCount(c); } catch {}
  };

  const run = async () => {
    if (!file) { toast('Load a PDF first', 'error'); return; }
    setProcessing(true); setProgress(0); setPreviews([]);
    try {
      const images = await pdfToImages(file, format, scale);
      setPreviews(images);
      setProgress(100);
      toast(`Converted ${images.length} pages`, 'success');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    } finally { setProcessing(false); }
  };

  const saveAll = async () => {
    for (const img of previews) {
      await saveFile(img.data, img.name, format === 'png' ? 'image/png' : 'image/jpeg');
    }
    toast(`Saved ${previews.length} images`, 'success');
  };

  const saveSingle = async (img) => {
    await saveFile(img.data, img.name);
    toast(`Saved ${img.name}`, 'success');
  };

  const scaleLabels = { 1: '72 DPI', 2: '144 DPI', 3: '216 DPI' };

  return (
    <div>
      <div className="tool-header">
        <h1>PDF → <span>Image</span></h1>
        <p>Convert each PDF page to a high-quality image file</p>
      </div>

      {!file ? (
        <DropZone onFiles={addFile} multiple={false} />
      ) : (
        <div className="file-item" style={{marginBottom:20}}>
          <span className="file-item-icon">◈</span>
          <span className="file-item-name">{file.name}</span>
              <button className="btn btn-ghost" style={{padding:'4px 8px', fontSize:12}} onClick={(e) => { e.stopPropagation(); preview(file); }}>👁 Preview</button>
          <span className="badge badge-cyan">{pageCount} pages</span>
          <button className="file-item-remove" onClick={() => { setFile(null); setPreviews([]); }}>✕</button>
        </div>
      )}

      {file && (
        <>
          <div className="card glass" style={{display:'flex', gap:32, marginBottom:16, flexWrap:'wrap'}}>
            <div>
              <span className="label">Format</span>
              <div style={{display:'flex',gap:8}}>
                {['jpeg','png'].map(f => (
                  <button key={f} className={`btn ${format===f?'btn-primary':'btn-ghost'}`} onClick={() => setFormat(f)}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Quality / DPI</span>
              <div style={{display:'flex',gap:8}}>
                {[1,2,3].map(s => (
                  <button key={s} className={`btn ${scale===s?'btn-primary':'btn-ghost'}`} onClick={() => setScale(s)}>
                    {scaleLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="action-bar">
            <button className="btn btn-primary" onClick={run} disabled={processing}>
              {processing ? '◫ Converting...' : '◫ Convert to Images'}
            </button>
            {previews.length > 0 && (
              <button className="btn btn-success" onClick={saveAll}>⬇ Save All ({previews.length})</button>
            )}
          </div>
          {processing && <div className="progress-bar"><div className="progress-fill" style={{width:'60%'}} /></div>}

          {previews.length > 0 && (
            <div style={{marginTop:24}}>
              <span className="label">{previews.length} pages converted</span>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginTop:10}}>
                {previews.map((img, i) => (
                  <div key={i} style={{
                    borderRadius:'var(--radius-sm)', overflow:'hidden',
                    border:'1px solid var(--glass-border)', cursor:'pointer',
                    transition:'border-color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='rgba(0,240,255,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--glass-border)'}
                  onClick={() => saveSingle(img)}
                  >
                    <img src={img.dataUrl} style={{width:'100%',display:'block'}} alt={`Page ${i+1}`} />
                    <div style={{padding:'8px 10px', background:'rgba(5,15,40,0.8)', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)'}}>
                      {img.name} · click to save
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
