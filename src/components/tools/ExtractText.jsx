import { useState } from 'react';
import DropZone from '../DropZone.jsx';
import { extractTextFromPDF, saveFile } from '../../utils/pdfOperations.js';
import { useToast, usePreview } from '../../App.jsx';

export default function ExtractText() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const toast = useToast();
  const preview = usePreview();

  const run = async () => {
    if (!file) { toast('Load a PDF first', 'error'); return; }
    setProcessing(true); setText('');
    try {
      const result = await extractTextFromPDF(file);
      setText(result);
      toast('Text extracted!', 'success');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    } finally { setProcessing(false); }
  };

  const saveTxt = async () => {
    const b64 = btoa(unescape(encodeURIComponent(text)));
    const name = file.name.replace('.pdf', '_text.txt');
    if (window.electronAPI) {
      const path = await window.electronAPI.saveFile({ defaultPath: name, filters: [{ name: 'Text Files', extensions: ['txt'] }] });
      if (path) { await window.electronAPI.writeFile(path, b64); toast('Saved as .txt', 'success'); }
    } else {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(text);
    toast('Copied to clipboard', 'info');
  };

  return (
    <div>
      <div className="tool-header">
        <h1>Extract <span>Text</span></h1>
        <p>Pull all text content from a PDF into plain text</p>
      </div>

      {!file ? (
        <DropZone onFiles={f => setFile(f[0])} multiple={false} />
      ) : (
        <div className="file-item" style={{marginBottom:20}}>
          <span className="file-item-icon">≡</span>
          <span className="file-item-name">{file.name}</span>
              <button className="btn btn-ghost" style={{padding:'4px 8px', fontSize:12}} onClick={(e) => { e.stopPropagation(); preview(file); }}>👁 Preview</button>
          <button className="file-item-remove" onClick={() => { setFile(null); setText(''); }}>✕</button>
        </div>
      )}

      {file && (
        <>
          <div className="action-bar">
            <button className="btn btn-primary" onClick={run} disabled={processing}>
              {processing ? '≡ Extracting...' : '≡ Extract Text'}
            </button>
            {text && <button className="btn btn-ghost" onClick={copy}>⧉ Copy</button>}
            {text && <button className="btn btn-success" onClick={saveTxt}>⬇ Save .txt</button>}
          </div>
          {processing && <div className="progress-bar"><div className="progress-fill" style={{width:'60%'}} /></div>}

          {text && (
            <div style={{marginTop:20}}>
              <span className="label">{text.length.toLocaleString()} characters extracted</span>
              <textarea
                readOnly value={text}
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
