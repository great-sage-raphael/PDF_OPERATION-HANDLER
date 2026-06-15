import { useState } from 'react';
import DropZone from '../DropZone.jsx';
import { protectPDF, saveFile } from '../../utils/pdfOperations.js';
import { useToast, usePreview } from '../../App.jsx';

export default function Password() {
  const [file, setFile] = useState(null);
  const [userPass, setUserPass] = useState('');
  const [ownerPass, setOwnerPass] = useState('');
  const [show, setShow] = useState(false);
  const [processing, setProcessing] = useState(false);
  const toast = useToast();
  const preview = usePreview();

  const run = async () => {
    if (!file) { toast('Load a PDF first', 'error'); return; }
    if (!userPass) { toast('Enter a password', 'error'); return; }
    setProcessing(true);
    try {
      const result = await protectPDF(file, userPass, ownerPass || userPass);
      const name = file.name.replace('.pdf', '_protected.pdf');
      const path = await saveFile(result, name);
      if (path) toast('PDF password protected!', 'success');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    } finally { setProcessing(false); }
  };

  return (
    <div>
      <div className="tool-header">
        <h1>Encrypt / <span>Password</span></h1>
        <p>Password-protect your PDF with AES-256 encryption</p>
      </div>

      {!file ? (
        <DropZone onFiles={f => setFile(f[0])} multiple={false} />
      ) : (
        <div className="file-item" style={{marginBottom:20}}>
          <span className="file-item-icon">◐</span>
          <span className="file-item-name">{file.name}</span>
              <button className="btn btn-ghost" style={{padding:'4px 8px', fontSize:12}} onClick={(e) => { e.stopPropagation(); preview(file); }}>👁 Preview</button>
          <button className="file-item-remove" onClick={() => setFile(null)}>✕</button>
        </div>
      )}

      {file && (
        <>
          <div className="card glass" style={{marginBottom:16}}>
            <div style={{display:'grid', gap:16}}>
              <div>
                <span className="label">User Password (required to open)</span>
                <div style={{position:'relative'}}>
                  <input
                    className="input" type={show?'text':'password'}
                    value={userPass} onChange={e => setUserPass(e.target.value)}
                    placeholder="Enter user password"
                    style={{paddingRight:50}}
                  />
                  <button onClick={() => setShow(s => !s)} style={{
                    position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer',
                    color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:11,
                  }}>{show ? 'HIDE' : 'SHOW'}</button>
                </div>
              </div>
              <div>
                <span className="label">Owner Password (optional — controls permissions)</span>
                <input className="input" type={show?'text':'password'} value={ownerPass}
                  onChange={e => setOwnerPass(e.target.value)} placeholder="Defaults to user password if empty" />
              </div>
            </div>
            <div style={{marginTop:16, padding:'12px 16px', borderRadius:'var(--radius-sm)',
              background:'rgba(255,170,0,0.06)', border:'1px solid rgba(255,170,0,0.2)'}}>
              <p style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--amber)'}}>
                ◈ Permissions set: printing allowed · editing blocked · copying blocked
              </p>
            </div>
          </div>

          <div className="action-bar">
            <button className="btn btn-primary" onClick={run} disabled={processing || !userPass}>
              {processing ? '◐ Encrypting...' : '◐ Protect PDF'}
            </button>
          </div>
          {processing && <div className="progress-bar"><div className="progress-fill" style={{width:'50%'}} /></div>}
        </>
      )}
    </div>
  );
}
