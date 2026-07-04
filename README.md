# FixPDF

[![Deploy GitHub Pages](https://github.com/pongvitsam/FixPDF/actions/workflows/deploy.yml/badge.svg)](https://github.com/pongvitsam/FixPDF/actions/workflows/deploy.yml)

Fast, lightweight web PDF editor. View, annotate, merge, split, rotate, encrypt, decrypt, search, and export PDFs entirely in the browser.

**Live demo:** https://pongvitsam.github.io/FixPDF/

## Features

### Viewer
- Open PDF (file picker or drag & drop)
- Zoom, pan, page navigation, thumbnail strip
- Print current document
- Light / dark / system theme

### Page tools
- Rotate, delete, duplicate, reverse order
- Add blank pages
- Drag thumbnails to reorder pages

### Toolkit
- Merge multiple PDFs
- Split into single pages or extract page ranges
- Rotate all pages
- Watermark, crop margins
- Export page as PNG / JPG / WebP / BMP / TIFF
- View metadata
- OCR current page (Tesseract.js, lazy-loaded)
- Encrypt PDF with password (RC4 128-bit)
- Decrypt / remove password protection (QPDF WASM — preserves vectors)
- Compress, linearize, and optimize PDF (QPDF WASM)
- Form field filler
- Apply redaction marks

### Annotate
- Highlight, underline, strikeout, note, text, rectangle, redaction boxes

### Search
- Find text in document with optional case matching

### Document structure
- Bookmarks panel (outline navigation)
- Attachments panel (download embedded files)
- Forms panel (scan and fill all fields)
- Preflight check (document health validation)
- Annotation inspector with undo/redo history

### Engines
- PDFium WASM (clawpdf) for text extraction and page rendering
- QPDF WASM for decrypt, compress, linearize, optimize

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages setup (one-time)

The workflow builds `dist/` and publishes it two ways: **GitHub Actions** (`deploy-pages`) and the **`gh-pages` branch**. Pick **one** source in repository settings — if Pages still serves `main`, you will see 404 errors for `main.tsx` and `favicon.svg`.

1. Open [FixPDF Settings → Pages](https://github.com/pongvitsam/FixPDF/settings/pages)
2. Under **Build and deployment**, choose **either**:
   - **GitHub Actions** (recommended) — uses `upload-pages-artifact` + `deploy-pages`
   - **Deploy from a branch** → branch **`gh-pages`** → folder **`/ (root)`**
3. Push to `main` (or run **Deploy GitHub Pages** manually from the Actions tab)
4. If using GitHub Actions, approve the **`github-pages`** environment when prompted
5. Live site: https://pongvitsam.github.io/FixPDF/ (allow 1–2 minutes after deploy)

**Verify:** View page source — you should see `/FixPDF/assets/index-*.js`, not `/src/main.tsx`.

## Tech stack

- Vite + React + TypeScript
- PDF.js (rendering & search)
- pdf-lib (merge, split, rotate, forms, annotations)
- @pdfsmaller/pdf-encrypt-lite (password protection)
- @neslinesli93/qpdf-wasm (native decrypt, compress, linearize, optimize)
- clawpdf / PDFium WASM (text extraction, high-quality render)
- Tesseract.js (optional OCR)
- mammoth + html2canvas (Word/HTML → PDF)
- i18next (EN/TH)
- Tailwind CSS v4

## Privacy

All PDF processing happens locally in your browser. Files are never uploaded to any server.
