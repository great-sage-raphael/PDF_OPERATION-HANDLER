import { useState, useCallback } from 'react';
import './DropZone.css';

export default function DropZone({ onFiles, accept = '.pdf', multiple = true, label, sublabel }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const filtered = files.filter(f => {
      if (accept === '.pdf') return f.type === 'application/pdf';
      if (accept === 'image/*') return f.type.startsWith('image/');
      return true;
    });
    if (filtered.length) processFiles(filtered);
  }, [accept, onFiles]);

  const handleClick = async () => {
    if (!window.electronAPI) {
      // Fallback for browser testing
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = multiple;
      input.onchange = (e) => processFiles(Array.from(e.target.files));
      input.click();
      return;
    }
    const filters = accept === '.pdf'
      ? [{ name: 'PDF Files', extensions: ['pdf'] }]
      : [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }];
    const files = await window.electronAPI.openFiles({ filters });
    if (files.length) onFiles(files.map(f => ({ ...f, size: atob(f.data).length })));
  };

  const processFiles = (rawFiles) => {
    rawFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1];
        onFiles([{ name: file.name, data: base64, size: file.size, path: file.path || null }]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className="dropzone-corner tl" /><div className="dropzone-corner tr" />
      <div className="dropzone-corner bl" /><div className="dropzone-corner br" />

      <div className="dropzone-icon">{accept === 'image/*' ? '◫' : '◈'}</div>
      <div className="dropzone-label">{label || `Drop ${accept === 'image/*' ? 'images' : 'PDF files'} here`}</div>
      <div className="dropzone-sub">{sublabel || 'or click to browse'}</div>
      {dragging && <div className="dropzone-overlay">Release to load</div>}
    </div>
  );
}
