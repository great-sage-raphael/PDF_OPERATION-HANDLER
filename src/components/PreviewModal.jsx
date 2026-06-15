import { useEffect, useState } from 'react';
import './PreviewModal.css';

export default function PreviewModal({ file, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    if (!file) return;
    try {
      const isImage = file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);
      const mimeType = isImage ? 'image/png' : 'application/pdf';
      const byteCharacters = atob(file.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      return () => URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error creating preview blob:', e);
    }
  }, [file]);

  if (!file) return null;

  const isImage = file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-content" onClick={e => e.stopPropagation()}>
        <div className="preview-modal-header">
          <h3>{file.name}</h3>
          <button className="preview-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="preview-modal-body">
          {!blobUrl ? (
            <div className="preview-loading">Loading preview...</div>
          ) : isImage ? (
            <img src={blobUrl} alt={file.name} />
          ) : (
            <iframe src={`${blobUrl}#toolbar=0`} title={file.name} />
          )}
        </div>
      </div>
    </div>
  );
}
