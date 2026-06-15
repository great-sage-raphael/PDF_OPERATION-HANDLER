import { PDFDocument, degrees } from 'pdf-lib';

// pdfjs-dist is loaded via CDN <script> tag in index.html — no Vite import needed
// window.pdfjsLib is set up by the inline script in index.html
function getPdfJs() {
  const lib = window.pdfjsLib;
  if (!lib || typeof lib.getDocument !== 'function') {
    throw new Error('pdfjs-dist not loaded. Check your internet connection.');
  }
  return lib;
}

// ── Base64 helpers (Optimized with chunking for large files) ──────────────────
export const b64ToUint8 = (b64) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  const chunkSize = 65536;
  for (let i = 0; i < bin.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bin.length);
    for (let j = i; j < end; j++) {
      bytes[j] = bin.charCodeAt(j);
    }
  }
  return bytes;
};

export const uint8ToB64 = async (bytes) => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes]);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const formatBytes = (bytes) => {
  if (!bytes) return '?';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

// ── Merge PDFs ───────────────────────────────────────────────────────────────
export async function mergePDFs(files) {
  const merged = await PDFDocument.create();
  for (const f of files) {
    const doc = await PDFDocument.load(b64ToUint8(f.data));
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  const bytes = await merged.save();
  return await uint8ToB64(bytes);
}

// ── Split PDF ────────────────────────────────────────────────────────────────
export async function splitPDF(file, ranges) {
  // ranges: [{start, end, name}] (1-indexed)
  const results = [];
  const src = await PDFDocument.load(b64ToUint8(file.data));
  for (const range of ranges) {
    const doc = await PDFDocument.create();
    const indices = [];
    for (let i = range.start - 1; i < range.end; i++) indices.push(i);
    const pages = await doc.copyPages(src, indices);
    pages.forEach(p => doc.addPage(p));
    const bytes = await doc.save();
    results.push({ name: range.name || `pages_${range.start}-${range.end}.pdf`, data: await uint8ToB64(bytes) });
  }
  return results;
}

// ── Extract pages ────────────────────────────────────────────────────────────
export async function extractPages(file, pageNumbers) {
  // pageNumbers: [1,2,3,...] (1-indexed)
  const src = await PDFDocument.load(b64ToUint8(file.data));
  const doc = await PDFDocument.create();
  const indices = pageNumbers.map(n => n - 1).filter(i => i >= 0 && i < src.getPageCount());
  const pages = await doc.copyPages(src, indices);
  pages.forEach(p => doc.addPage(p));
  const bytes = await doc.save();
  return await uint8ToB64(bytes);
}

// ── Rotate pages ─────────────────────────────────────────────────────────────
export async function rotatePages(file, pageNumbers, angleDeg) {
  const doc = await PDFDocument.load(b64ToUint8(file.data));
  const all = pageNumbers === 'all';
  const indices = all
    ? [...Array(doc.getPageCount()).keys()]
    : pageNumbers.map(n => n - 1);
  indices.forEach(i => {
    const page = doc.getPage(i);
    const cur = page.getRotation().angle;
    page.setRotation(degrees((cur + angleDeg) % 360));
  });
  const bytes = await doc.save();
  return await uint8ToB64(bytes);
}

// ── Compress PDF (dual-strategy: metadata strip + canvas rasterize) ───────────
// opts: { quality: 0.0–1.0, maxWidth: px|null, maxHeight: px|null, format: 'jpeg'|'png' }
export async function compressPDF(file, opts = {}) {
  const { quality = 0.72, maxWidth = null, maxHeight = null, format = 'jpeg' } = opts;
  const rawBytes = b64ToUint8(file.data);
  const jpegQuality = Math.max(0.01, Math.min(1, quality));
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

  // ── Strategy 1: strip metadata + use object streams (wins on text PDFs) ──────
  let stripped = null;
  try {
    const src = await PDFDocument.load(rawBytes, { updateMetadata: false });
    src.setTitle(''); src.setAuthor(''); src.setSubject('');
    src.setKeywords([]); src.setProducer(''); src.setCreator('');
    stripped = await src.save({ useObjectStreams: true, addDefaultPage: false });
  } catch (e) {
    console.warn('[compress] metadata strip failed:', e.message);
  }

  // ── Strategy 2: rasterize pages via pdfjs + re-embed (wins on image PDFs) ────
  let rasterized = null;
  try {
    const pdfJsLib = getPdfJs();
    const pdfJsDoc = await pdfJsLib.getDocument({ data: rawBytes.slice() }).promise;
    const newDoc = await PDFDocument.create();

    for (let i = 1; i <= pdfJsDoc.numPages; i++) {
      const page = await pdfJsDoc.getPage(i);
      const origVp = page.getViewport({ scale: 1 });

      // Derive render scale from quality: lower quality → smaller canvas → smaller file
      // range: quality=1.0 → scale=1.0; quality=0.1 → scale=0.5
      let renderScale = 0.5 + jpegQuality * 0.5;
      if (maxWidth  && origVp.width  > maxWidth)  renderScale = Math.min(renderScale, maxWidth  / origVp.width);
      if (maxHeight && origVp.height > maxHeight) renderScale = Math.min(renderScale, maxHeight / origVp.height);
      renderScale = Math.max(0.1, renderScale);

      const viewport = page.getViewport({ scale: renderScale });
      const canvas = document.createElement('canvas');
      canvas.width  = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

      // PNG ignores quality (always lossless); JPEG uses jpegQuality (0–1)
      const dataUrl = canvas.toDataURL(mimeType, format === 'jpeg' ? jpegQuality : undefined);
      const imgB64 = dataUrl.split(',')[1];
      if (!imgB64) throw new Error(`Page ${i}: canvas encoding returned empty string`);
      const imgBytes = b64ToUint8(imgB64);

      const img = format === 'png'
        ? await newDoc.embedPng(imgBytes)
        : await newDoc.embedJpg(imgBytes);

      // Keep original PDF point dimensions so reader shows correct page size
      const pg = newDoc.addPage([origVp.width, origVp.height]);
      pg.drawImage(img, { x: 0, y: 0, width: origVp.width, height: origVp.height });
    }
    rasterized = await newDoc.save({ useObjectStreams: true });
  } catch (e) {
    console.warn('[compress] rasterize strategy failed:', e.message);
  }

  // Pick smallest non-null result; always keep rawBytes as ultimate fallback
  const candidates = [rawBytes, stripped, rasterized].filter(b => b && b.length > 0);
  if (candidates.length === 0) throw new Error('Compression failed: all output buffers empty.');
  const best = candidates.reduce((a, b) => (a.length <= b.length ? a : b));
  return await uint8ToB64(best);
}

// ── Preview a single page at given compression settings ──────────────────────
// Returns { dataUrl, renderWidth, renderHeight, estimatedBytes, totalPages }
export async function previewCompressedPage(file, pageNum = 1, opts = {}) {
  const { quality = 0.72, maxWidth = null, maxHeight = null, format = 'jpeg' } = opts;
  const rawBytes = b64ToUint8(file.data);
  const jpegQuality = Math.max(0.01, Math.min(1, quality));

  const pdfJsDoc = await getPdfJs().getDocument({ data: rawBytes.slice() }).promise;
  const clampedPage = Math.max(1, Math.min(pageNum, pdfJsDoc.numPages));
  const page = await pdfJsDoc.getPage(clampedPage);
  const origVp = page.getViewport({ scale: 1 });

  let renderScale = 0.5 + jpegQuality * 0.5;
  if (maxWidth  && origVp.width  > maxWidth)  renderScale = Math.min(renderScale, maxWidth  / origVp.width);
  if (maxHeight && origVp.height > maxHeight) renderScale = Math.min(renderScale, maxHeight / origVp.height);
  renderScale = Math.max(0.1, renderScale);

  const viewport = page.getViewport({ scale: renderScale });
  const canvas = document.createElement('canvas');
  canvas.width  = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mimeType, format === 'jpeg' ? jpegQuality : undefined);
  const b64Part = dataUrl.split(',')[1] || '';
  const estimatedBytes = Math.round(b64Part.length * 0.75);

  return {
    dataUrl,
    renderWidth: canvas.width,
    renderHeight: canvas.height,
    origWidth: Math.round(origVp.width),
    origHeight: Math.round(origVp.height),
    estimatedBytes,
    totalPages: pdfJsDoc.numPages,
  };
}

// ── Add text watermark ───────────────────────────────────────────────────────
export async function addWatermark(file, text, options = {}) {
  const { opacity = 0.15, fontSize = 60, rotation = -45, color = [0, 200, 255] } = options;
  const { rgb } = await import('pdf-lib');
  const doc = await PDFDocument.load(b64ToUint8(file.data));
  const font = await doc.embedFont((await import('pdf-lib')).StandardFonts.HelveticaBold);
  doc.getPages().forEach(page => {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 2 - (text.length * fontSize * 0.3),
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(color[0] / 255, color[1] / 255, color[2] / 255),
      opacity,
      rotate: degrees(rotation),
    });
  });
  const bytes = await doc.save();
  return await uint8ToB64(bytes);
}

// ── Extract text ─────────────────────────────────────────────────────────────
export async function extractTextFromPDF(file) {
  const loadingTask = getPdfJs().getDocument({ data: b64ToUint8(file.data) });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += `\n--- Page ${i} ---\n${pageText}\n`;
  }
  return fullText;
}

// ── PDF page count ────────────────────────────────────────────────────────────
export async function getPageCount(file) {
  const doc = await PDFDocument.load(b64ToUint8(file.data));
  return doc.getPageCount();
}

// ── PDF to images (canvas rendering) ─────────────────────────────────────────
export async function pdfToImages(file, format = 'jpeg', scale = 2) {
  const pdf = await getPdfJs().getDocument({ data: b64ToUint8(file.data) }).promise;
  const images = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width; canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mimeType, 0.92);
    images.push({ name: `page_${i}.${format}`, data: dataUrl.split(',')[1], dataUrl });
  }
  return images;
}

// ── Images to PDF ─────────────────────────────────────────────────────────────
export async function imagesToPDF(files) {
  const doc = await PDFDocument.create();
  for (const f of files) {
    const ext = f.name.split('.').pop().toLowerCase();
    let img;
    const bytes = b64ToUint8(f.data);
    if (ext === 'png') img = await doc.embedPng(bytes);
    else img = await doc.embedJpg(bytes);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  const bytes = await doc.save();
  return await uint8ToB64(bytes);
}

// ── Save via Electron or browser download ────────────────────────────────────
export async function saveFile(b64Data, suggestedName, mimeType = 'application/pdf') {
  if (window.electronAPI) {
    const ext = suggestedName.split('.').pop();
    const filePath = await window.electronAPI.saveFile({
      defaultPath: suggestedName,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (!filePath) return null;
    await window.electronAPI.writeFile(filePath, b64Data);
    return filePath;
  } else {
    // Browser fallback
    const blob = new Blob([b64ToUint8(b64Data)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = suggestedName; a.click();
    URL.revokeObjectURL(url);
    return suggestedName;
  }
}
