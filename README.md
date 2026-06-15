# ⬡ PDF Toolkit — Cyber Edition
> Electron + React PDF utility app for macOS Sequoia

## Features
| Tool | What it does |
|------|-------------|
| Merge PDF | Combine multiple PDFs, drag to reorder |
| Split PDF | By page range or every page |
| Compress | Reduce file size (3 levels) |
| PDF → Image | Export each page as JPG/PNG (up to 216 DPI) |
| Image → PDF | Combine images into a PDF |
| Rotate Pages | All or selected pages, 90/180/270° |
| Watermark | Text stamp with opacity/size/angle controls |
| Encrypt | AES password protection |
| Extract Text | Pull text from selectable PDFs |
| OCR Scan | Tesseract.js — reads scanned/image PDFs |

## Setup

### Prerequisites
- **Node.js** v18+ — install via [https://nodejs.org](https://nodejs.org) or `brew install node`

### Install & Run

```bash
cd pdf-toolkit
npm install
npm run dev
```

This opens the Electron app in dev mode (hot-reload enabled).

### Build a .app for macOS

```bash
npm run build
```

Output goes to `dist/` — you'll get a `.dmg` you can install.

## Project Structure

```
pdf-toolkit/
├── main.js           ← Electron main process (file system, dialogs)
├── preload.js        ← Secure IPC bridge
├── vite.config.js    ← Vite bundler config
└── src/
    ├── App.jsx       ← Root + toast context
    ├── index.css     ← Global cyber theme
    ├── components/
    │   ├── Sidebar.jsx / .css
    │   ├── DropZone.jsx / .css
    │   └── tools/    ← One file per tool
    └── utils/
        └── pdfOperations.js  ← All PDF logic
```

## Notes
- All processing is 100% local — no data leaves your Mac
- pdf-lib handles manipulation; pdfjs-dist handles rendering/text
- Tesseract.js OCR downloads language data on first use (~10MB)
- Compression uses pdf-lib's object stream optimization; for heavier compression install Ghostscript (`brew install ghostscript`)
# PDF_OPERATION-HANDLER
