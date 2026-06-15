import { useState, createContext, useContext, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import MergePDF from './components/tools/MergePDF.jsx';
import SplitPDF from './components/tools/SplitPDF.jsx';
import CompressPDF from './components/tools/CompressPDF.jsx';
import PDFToImage from './components/tools/PDFToImage.jsx';
import ImageToPDF from './components/tools/ImageToPDF.jsx';
import RotatePages from './components/tools/RotatePages.jsx';
import Watermark from './components/tools/Watermark.jsx';

import ExtractText from './components/tools/ExtractText.jsx';
import OCR from './components/tools/OCR.jsx';
import './App.css';
import PreviewModal from './components/PreviewModal.jsx';

// ── Contexts ───────────────────────────────────────────────────────────────
export const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export const PreviewContext = createContext(null);
export const usePreview = () => useContext(PreviewContext);

const TOOLS = {
  merge: MergePDF,
  split: SplitPDF,
  compress: CompressPDF,
  pdfToImage: PDFToImage,
  imageToPDF: ImageToPDF,
  rotate: RotatePages,
  watermark: Watermark,

  extractText: ExtractText,
  ocr: OCR,
};

export default function App() {
  const [activeTool, setActiveTool] = useState('merge');
  const [toasts, setToasts] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const ActiveTool = TOOLS[activeTool];

  return (
    <ToastContext.Provider value={addToast}>
      <PreviewContext.Provider value={setPreviewFile}>
      <div className="app-shell">
        {/* Cyber background layers */}
        <div className="bg-grid" />
        <div className="bg-gradient" />
        <div className="scan-line" />

        {/* Titlebar drag region */}
        <div className="titlebar" />

        {/* Layout */}
        <div className="app-layout">
          <Sidebar activeTool={activeTool} onSelect={setActiveTool} />
          <main className="main-content">
            <div className="tool-container animate-in" key={activeTool}>
              <ActiveTool />
            </div>
          </main>
        </div>

        {/* Toasts */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.type === 'success' && '✓ '}{t.type === 'error' && '✕ '}{t.type === 'info' && '◈ '}
              {t.message}
            </div>
          ))}
        </div>

        {/* Preview Modal */}
        <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      </div>
      </PreviewContext.Provider>
    </ToastContext.Provider>
  );
}
