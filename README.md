# FixPDF

[![Deploy GitHub Pages](https://github.com/pongvitsam/FixPDF/actions/workflows/deploy.yml/badge.svg)](https://github.com/pongvitsam/FixPDF/actions/workflows/deploy.yml)

Fast, lightweight web PDF editor. View, annotate, merge, split, rotate, encrypt, search, and export PDFs entirely in the browser.

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
- Export page as PNG / JPG / WebP
- View metadata
- OCR current page (Tesseract.js, lazy-loaded)
- Encrypt / decrypt PDF (re-export to remove password; pdf-lib cannot add encryption in-browser)
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

## GitHub Pages setup (one-time)

The workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds `dist/` and publishes via **GitHub Actions** (not the `gh-pages` branch).

1. Open [FixPDF Settings → Pages](https://github.com/pongvitsam/FixPDF/settings/pages)
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. Push to `main` (or run the workflow manually from the **Actions** tab)
4. On first deploy, approve the **`github-pages`** environment if GitHub prompts you
5. The site will be live at https://pongvitsam.github.io/FixPDF/ within 1–2 minutes

If the site still shows 404, Pages is almost always not set to **GitHub Actions** yet. Check the latest **Deploy GitHub Pages** run in the Actions tab for errors.

## Tech stack

- Vite + React + TypeScript
- PDF.js (rendering & search)
- pdf-lib (merge, split, rotate, forms, annotations, encryption)
- Tesseract.js (optional OCR)
- i18next (EN/TH)
- Tailwind CSS v4

## Privacy

All PDF processing happens locally in your browser. Files are never uploaded to any server.
