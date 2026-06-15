import { useState } from 'react';
import DropZone from '../DropZone.jsx';
import { pdfToImages } from '../../utils/pdfOperations.js';
import { useToast, usePreview } from '../../App.jsx';

export default function OCR() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [result, setResult] = useState('');
  const toast = useToast();
  const preview = usePreview();

  const run = async () => {
    if (!file) { toast('Load a PDF first', 'error'); return; }
    setProcessing(true); setProgress(0); setResult(''); setStatusMsg('Rendering pages...');
    try {
      // Step 1: render PDF pages to images
      const images = await pdfToImages(file, 'jpeg', 2);
      setStatusMsg(`Loading OCR engine...`);

      // Dynamic import — handle both CJS default export and ESM named exports
      const tessModule = await import('tesseract.js');
      const createWorker = tessModule.default?.createWorker ?? tessModule.createWorker;
      if (typeof createWorker !== 'function') throw new Error('Tesseract failed to load. Try restarting the app.');

      // Use Tesseract defaults (blob worker + jsDelivr CDN for eng.traineddata)
      // OCR requires an internet connection to download language data on first run
      const worker = await createWorker('eng');

      let fullText = '';
      setStatusMsg(`OCR scanning ${images.length} page(s)...`);
      for (let i = 0; i < images.length; i++) {
        setStatusMsg(`Scanning page ${i+1} of ${images.length}...`);
        setProgress(Math.round((i / images.length) * 100));
        const { data: { text } } = await worker.recognize(`data:image/jpeg;base64,${images[i].data}`);
        fullText += `\n--- Page ${i+1} ---\n${text}\n`;
      }
      await worker.terminate();
      setResult(fullText);
      setProgress(100);
      setStatusMsg('');
      toast(`OCR complete — ${images.length} page(s) scanned`, 'success');
    } catch (e) {
      toast(`OCR Error: ${e.message}`, 'error');
      console.error('[OCR]', e);
      setStatusMsg('');
    } finally { setProcessing(false); }
  };

  const copy = () => { navigator.clipboard.writeText(result); toast('Copied!', 'info'); };

  const saveTxt = async () => {
    const b64 = btoa(unescape(encodeURIComponent(result)));
    const name = file.name.replace('.pdf', '_ocr.txt');
    if (window.electronAPI) {
      const path = await window.electronAPI.saveFile({ defaultPath: name, filters: [{ name: 'Text', extensions: ['txt'] }] });
      if (path) { await window.electronAPI.writeFile(path, b64); toast('Saved!', 'success'); }
    } else {
      const blob = new Blob([result], {type:'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=name; a.click();
    }
  };

  return (
    <div>
      <div className="tool-header">
        <h1>OCR <span>Scan</span></h1>
        <p>Extract text from scanned / image-based PDFs using AI OCR engine</p>
        <span className="badge badge-magenta" style={{marginTop:8,display:'inline-flex'}}>Powered by Tesseract.js</span>
      </div>

      {!file ? (
        <DropZone onFiles={f => setFile(f[0])} multiple={false} label="Drop a scanned PDF" sublabel="Works on image-based PDFs that have no selectable text" />
      ) : (
        <div className="file-item" style={{marginBottom:20}}>
          <span className="file-item-icon">⊡</span>
          <span className="file-item-name">{file.name}</span>
              <button className="btn btn-ghost" style={{padding:'4px 8px', fontSize:12}} onClick={(e) => { e.stopPropagation(); preview(file); }}>👁 Preview</button>
          <button className="file-item-remove" onClick={() => { setFile(null); setResult(''); }}>✕</button>
        </div>
      )}

      {file && !processing && !result && (
        <div className="card glass" style={{marginBottom:16}}>
          <p style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
            ◈ OCR works best on clearly scanned documents<br/>
            ◈ Processing time depends on number of pages<br/>
            ◈ Supports English text (multilingual coming soon)<br/>
            ◈ <span style={{color:'var(--amber)'}}>Requires internet on first run</span> to download language data (~10 MB)
          </p>
        </div>
      )}

      {file && (
        <>
          <div className="action-bar">
            <button className="btn btn-primary" onClick={run} disabled={processing}>
              {processing ? `⊡ ${statusMsg}` : '⊡ Start OCR Scan'}
            </button>
            {result && <button className="btn btn-ghost" onClick={copy}>⧉ Copy</button>}
            {result && <button className="btn btn-success" onClick={saveTxt}>⬇ Save .txt</button>}
          </div>

          {processing && (
            <>
              <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.max(progress, 10)}%`}} /></div>
              <p style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-muted)',marginTop:8}}>{statusMsg}</p>
            </>
          )}

          {result && (
            <div style={{marginTop:20}}>
              <span className="label">{result.length.toLocaleString()} characters recognized</span>
              <textarea
                readOnly value={result}
                style={{
                  width:'100%', minHeight:320, marginTop:8,
                  background:'rgba(5,10,25,0.8)', border:'1px solid var(--glass-border)',
                  borderRadius:'var(--radius-sm)', color:'var(--text-primary)',
                  fontFamily:'var(--font-mono)', fontSize:12, lineHeight:1.7,
                  padding:'16px', resize:'vertical', outline:'none',
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
