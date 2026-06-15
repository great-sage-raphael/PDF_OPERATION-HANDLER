import { useState } from 'react';
import DropZone from '../DropZone.jsx';
import { rotatePages, saveFile, getPageCount } from '../../utils/pdfOperations.js';
import { useToast, usePreview } from '../../App.jsx';

export default function RotatePages() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState('all');
  const [pageInput, setPageInput] = useState('');
  const [angle, setAngle] = useState(90);
  const [processing, setProcessing] = useState(false);
  const toast = useToast();
  const preview = usePreview();

  const addFile = async (files) => {
    setFile(files[0]);
    try { const c = await getPageCount(files[0]); setPageCount(c); } catch {}
  };

  const run = async () => {
    if (!file) { toast('Load a PDF first', 'error'); return; }
    setProcessing(true);
    try {
      let pages = mode === 'all' ? 'all' : pageInput.split(',').map(s => parseInt(s.trim())).filter(Boolean);
      const result = await rotatePages(file, pages, angle);
      const name = file.name.replace('.pdf', `_rotated${angle}.pdf`);
      const path = await saveFile(result, name);
      if (path) toast(`Pages rotated ${angle}°`, 'success');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    } finally { setProcessing(false); }
  };

  return (
    <div>
      <div className="tool-header">
        <h1>Rotate <span>Pages</span></h1>
        <p>Rotate all pages or specific pages by 90°, 180°, or 270°</p>
      </div>

      {!file ? (
        <DropZone onFiles={addFile} multiple={false} />
      ) : (
        <div className="file-item" style={{marginBottom:20}}>
          <span className="file-item-icon">↻</span>
          <span className="file-item-name">{file.name}</span>
              <button className="btn btn-ghost" style={{padding:'4px 8px', fontSize:12}} onClick={(e) => { e.stopPropagation(); preview(file); }}>👁 Preview</button>
          <span className="badge badge-cyan">{pageCount} pages</span>
          <button className="file-item-remove" onClick={() => setFile(null)}>✕</button>
        </div>
      )}

      {file && (
        <>
          <div className="card glass" style={{marginBottom:16}}>
            <div style={{display:'flex', gap:32, flexWrap:'wrap'}}>
              <div>
                <span className="label">Which Pages</span>
                <div style={{display:'flex',gap:8}}>
                  <button className={`btn ${mode==='all'?'btn-primary':'btn-ghost'}`} onClick={() => setMode('all')}>All Pages</button>
                  <button className={`btn ${mode==='select'?'btn-primary':'btn-ghost'}`} onClick={() => setMode('select')}>Select Pages</button>
                </div>
                {mode === 'select' && (
                  <input className="input" style={{marginTop:10}} placeholder="e.g. 1, 3, 5" value={pageInput} onChange={e => setPageInput(e.target.value)} />
                )}
              </div>
              <div>
                <span className="label">Rotation Angle</span>
                <div style={{display:'flex',gap:8}}>
                  {[90,180,270].map(a => (
                    <button key={a} className={`btn ${angle===a?'btn-primary':'btn-ghost'}`} onClick={() => setAngle(a)}>
                      {a === 90 ? '↻ 90°' : a === 180 ? '↺↺ 180°' : '↺ 270°'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="action-bar">
            <button className="btn btn-primary" onClick={run} disabled={processing}>
              {processing ? '↻ Rotating...' : `↻ Rotate ${angle}°`}
            </button>
          </div>
          {processing && <div className="progress-bar"><div className="progress-fill" style={{width:'55%'}} /></div>}
        </>
      )}
    </div>
  );
}
