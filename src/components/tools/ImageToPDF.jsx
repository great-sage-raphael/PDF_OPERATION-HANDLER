import { useState } from 'react';
import DropZone from '../DropZone.jsx';
import { imagesToPDF, saveFile, formatBytes } from '../../utils/pdfOperations.js';
import { useToast, usePreview } from '../../App.jsx';

export default function ImageToPDF() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const toast = useToast();
  const preview = usePreview();

  const addFiles = (newFiles) => setFiles(prev => [...prev, ...newFiles]);
  const remove = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));
  const moveUp = (i) => { if (i===0) return; setFiles(prev => { const a=[...prev]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a; }); };
  const moveDown = (i) => { setFiles(prev => { if (i>=prev.length-1) return prev; const a=[...prev]; [a[i],a[i+1]]=[a[i+1],a[i]]; return a; }); };

  const run = async () => {
    if (!files.length) { toast('Add images first', 'error'); return; }
    setProcessing(true);
    try {
      const result = await imagesToPDF(files);
      const path = await saveFile(result, 'images_combined.pdf');
      if (path) toast('PDF created from images!', 'success');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    } finally { setProcessing(false); }
  };

  return (
    <div>
      <div className="tool-header">
        <h1>Image → <span>PDF</span></h1>
        <p>Combine JPG/PNG images into a single PDF document · drag to reorder</p>
      </div>

      <DropZone onFiles={addFiles} accept="image/*" multiple label="Drop images (JPG / PNG)" sublabel="Each image becomes one page" />

      {files.length > 0 && (
        <div style={{marginTop:16}}>
          <span className="label">{files.length} image{files.length>1?'s':''} queued</span>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginTop:10}}>
            {files.map((f, i) => (
              <div key={i} style={{
                borderRadius:'var(--radius-sm)', overflow:'hidden',
                border:'1px solid var(--glass-border)', position:'relative',
              }}>
                {f.data && (
                  <img src={`data:image/jpeg;base64,${f.data}`} style={{width:'100%',height:100,objectFit:'cover',display:'block'}} alt={f.name} />
                )}
                <div style={{padding:'6px 8px', background:'rgba(5,15,40,0.9)', display:'flex', alignItems:'center', gap:6}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text-muted)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</span>
                  <button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(0,240,255,0.8)',fontSize:11,padding:'0 2px'}} onClick={(e) => { e.stopPropagation(); preview(f); }}>👁</button>
                  <button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(0,240,255,0.5)',fontSize:11,padding:'0 2px'}} onClick={() => moveUp(i)}>↑</button>
                  <button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(0,240,255,0.5)',fontSize:11,padding:'0 2px'}} onClick={() => moveDown(i)}>↓</button>
                  <button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,0,100,0.6)',fontSize:12,padding:'0 2px'}} onClick={() => remove(i)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="action-bar">
        <button className="btn btn-primary" onClick={run} disabled={processing || !files.length}>
          {processing ? '◩ Creating PDF...' : `◩ Create PDF from ${files.length} image${files.length!==1?'s':''}`}
        </button>
        {files.length > 0 && <button className="btn btn-ghost" onClick={() => setFiles([])}>Clear</button>}
      </div>
      {processing && <div className="progress-bar"><div className="progress-fill" style={{width:'65%'}} /></div>}
    </div>
  );
}
