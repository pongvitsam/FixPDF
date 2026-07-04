# FixPDF

Fast, lightweight web PDF editor inspired by modern browser-first PDF tools. View, annotate, merge, split, rotate, search, and export PDFs entirely in the browser.

**Live demo:** https://pongvitsam.github.io/FixPDF/

## Features

### Viewer
- Open PDF from file picker (with drag-and-drop friendly workflow)
- Zoom, pan, page navigation, thumbnail strip
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
- Export current page as PNG/JPG
- View metadata
- OCR current page (Tesseract.js, lazy-loaded)
- Form field filler
- Apply redaction marks

### Annotate
- Highlight, underline, strikeout, note, text, rectangle, redaction boxes

### Search
- Find text in document with optional case matching

### Settings
- English and Thai UI
- Theme preferences

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

## GitHub Pages

A workflow in `.github/workflows/deploy.yml` builds and deploys on every push to `main`.

1. Open **Settings → Pages** in the GitHub repository
2. Set **Source** to **GitHub Actions**
3. Push to `main`

The app is served from `/FixPDF/` on GitHub Pages.

## Tech stack

- Vite + React + TypeScript
- PDF.js (rendering & search)
- pdf-lib (merge, split, rotate, forms, annotations)
- Tesseract.js (optional OCR)
- i18next (EN/TH)
- Tailwind CSS v4

## Privacy

All PDF processing happens locally in your browser. Files are never uploaded to a server.
