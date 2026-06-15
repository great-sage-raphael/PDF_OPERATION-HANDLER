import { useState } from 'react';
import DropZone from '../DropZone.jsx';
import { splitPDF, getPageCount, saveFile, formatBytes } from '../../utils/pdfOperations.js';
import { useToast, usePreview } from '../../App.jsx';

export default function SplitPDF() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState('range'); // 'range' | 'every'
  const [rangeInput, setRangeInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const toast = useToast();
  const preview = usePreview();

  const addFile = async (files) => {
    const f = files[0];
    setFile(f);
    try {
      const count = await getPageCount(f);
      setPageCount(count);
    } catch { setPageCount('?'); }
  };

  const parseRanges = (input) => {
    // "1-3, 5, 7-9" → [{start:1,end:3},{start:5,end:5},{start:7,end:9}]
    return input.split(',').map(s => s.trim()).filter(Boolean).map(s => {
      const parts = s.split('-').map(Number);
      return { start: parts[0], end: parts[1] || parts[0], name: `pages_${parts[0]}-${parts[1] || parts[0]}.pdf` };
    });
  };

  const run = async () => {
    if (!file) { toast('Load a PDF first', 'error'); return; }
    setProcessing(true);
    try {
      let ranges;
      if (mode === 'every') {
        ranges = Array.from({ length: pageCount }, (_, i) => ({ start: i+1, end: i+1, name: `page_${i+1}.pdf` }));
      } else {
        ranges = parseRanges(rangeInput);
        if (!ranges.length) { toast('Enter valid page ranges', 'error'); setProcessing(false); return; }
      }

      const results = await splitPDF(file, ranges);

      if (window.electronAPI) {
        // Save each file
        for (const r of results) {
          const path = await saveFile(r.data, r.name);
          if (!path) break;
        }
        toast(`Saved ${results.length} file(s)`, 'success');
      } else {
        for (const r of results) await saveFile(r.data, r.name);
        toast(`Downloaded ${results.length} file(s)`, 'success');
      }
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    } finally { setProcessing(false); }
  };

  return (
    <div>
      <div className="tool-header">
        <h1>Split <span>PDF</span></h1>
        <p>Extract page ranges or split every page into separate files</p>
      </div>

      {!file ? (
        <DropZone onFiles={addFile} multiple={false} label="Drop a PDF to split" />
      ) : (
        <div className="file-item" style={{marginBottom:20}}>
          <span className="file-item-icon">◈</span>
          <span className="file-item-name">{file.name}</span>
              <button className="btn btn-ghost" style={{padding:'4px 8px', fontSize:12}} onClick={(e) => { e.stopPropagation(); preview(file); }}>👁 Preview</button>
          <span className="badge badge-cyan">{pageCount} pages</span>
          <button className="file-item-remove" onClick={() => { setFile(null); setPageCount(0); }}>✕</button>
        </div>
      )}

      {file && (
        <>
          <div className="card glass" style={{marginBottom:16}}>
            <span className="label">Split Mode</span>
            <div style={{display:'flex', gap:10}}>
              <button className={`btn ${mode==='range'?'btn-primary':'btn-ghost'}`} onClick={() => setMode('range')}>By Range</button>
              <button className={`btn ${mode==='every'?'btn-primary':'btn-ghost'}`} onClick={() => setMode('every')}>Every Page</button>
            </div>

            {mode === 'range' && (
              <div style={{marginTop:16}}>
                <span className="label">Page ranges (e.g. 1-3, 5, 7-9)</span>
                <input
                  className="input"
                  placeholder="1-3, 5, 7-9"
                  value={rangeInput}
                  onChange={e => setRangeInput(e.target.value)}
                />
                <p style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-muted)',marginTop:8}}>
                  Each range saves as a separate PDF file. Total pages: {pageCount}
                </p>
              </div>
            )}
            {mode === 'every' && (
              <p style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-secondary)',marginTop:12}}>
                Will create {pageCount} individual page files.
              </p>
            )}
          </div>

          <div className="action-bar">
            <button className="btn btn-primary" onClick={run} disabled={processing}>
              {processing ? '◈ Processing...' : '⊘ Split PDF'}
            </button>
          </div>
          {processing && <div className="progress-bar"><div className="progress-fill" style={{width:'50%'}} /></div>}
        </>
      )}
    </div>
  );
}
