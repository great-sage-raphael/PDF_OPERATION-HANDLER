import { useState } from 'react';
import DropZone from '../DropZone.jsx';
import { mergePDFs, saveFile, formatBytes } from '../../utils/pdfOperations.js';
import { useToast, usePreview } from '../../App.jsx';

export default function MergePDF() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();
  const preview = usePreview();

  const addFiles = (newFiles) => {
    setFiles(prev => [...prev, ...newFiles]);
    setDone(false);
  };
  const remove = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));
  const moveUp = (i) => {
    if (i === 0) return;
    setFiles(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; });
  };
  const moveDown = (i) => {
    setFiles(prev => { if (i >= prev.length - 1) return prev; const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; });
  };

  const run = async () => {
    if (files.length < 2) { toast('Add at least 2 PDFs to merge', 'error'); return; }
    setProcessing(true);
    try {
      const result = await mergePDFs(files);
      const path = await saveFile(result, 'merged.pdf');
      if (path) { setDone(true); toast('PDFs merged successfully', 'success'); }
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    } finally { setProcessing(false); }
  };

  return (
    <div>
      <div className="tool-header">
        <h1>Merge <span>PDF</span></h1>
        <p>Combine multiple PDFs into one file · drag to reorder</p>
      </div>

      <DropZone onFiles={addFiles} multiple label="Drop PDF files to merge" />

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => (
            <div key={i} className="file-item">
              <span className="file-item-icon">◈</span>
              <span className="file-item-name">{f.name}</span>
              <button className="btn btn-ghost" style={{padding:'4px 8px', fontSize:12}} onClick={(e) => { e.stopPropagation(); preview(f); }}>👁 Preview</button>
              <span className="file-item-size">{formatBytes(f.size)}</span>
              <button className="btn btn-ghost" style={{padding:'4px 8px', fontSize:12}} onClick={() => moveUp(i)}>↑</button>
              <button className="btn btn-ghost" style={{padding:'4px 8px', fontSize:12}} onClick={() => moveDown(i)}>↓</button>
              <button className="file-item-remove" onClick={() => remove(i)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="action-bar">
        <button className="btn btn-primary" onClick={run} disabled={processing || files.length < 2}>
          {processing ? '◈ Processing...' : `⊕ Merge ${files.length} Files`}
        </button>
        {files.length > 0 && (
          <button className="btn btn-ghost" onClick={() => { setFiles([]); setDone(false); }}>Clear All</button>
        )}
      </div>

      {processing && <div className="progress-bar"><div className="progress-fill" style={{width:'60%'}} /></div>}
      {done && <div className="result-box"><h3>✓ Merge Complete</h3><p style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-secondary)'}}>File saved successfully. Check your chosen directory.</p></div>}
    </div>
  );
}
