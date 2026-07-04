import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { SearchMatch } from '../../types'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export async function loadPdfDocument(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() })
  return loadingTask.promise
}

export async function renderPageToCanvas(
  pdf: PDFDocumentProxy,
  pageIndex: number,
  scale: number,
  canvas: HTMLCanvasElement,
  rotation = 0,
) {
  const page = await pdf.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale, rotation })
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas context unavailable')

  canvas.width = viewport.width
  canvas.height = viewport.height

  await page.render({ canvasContext: context, viewport, canvas }).promise
  return viewport
}

export async function renderPageToImage(
  pdf: PDFDocumentProxy,
  pageIndex: number,
  scale: number,
  mime: 'image/png' | 'image/jpeg',
) {
  const canvas = document.createElement('canvas')
  await renderPageToCanvas(pdf, pageIndex, scale, canvas)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Image export failed'))),
      mime,
      mime === 'image/jpeg' ? 0.92 : undefined,
    )
  })
  return blob
}

export async function searchPdfText(
  pdf: PDFDocumentProxy,
  query: string,
  matchCase = false,
): Promise<SearchMatch[]> {
  const needle = matchCase ? query : query.toLowerCase()
  const matches: SearchMatch[] = []

  for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex + 1)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    const haystack = matchCase ? pageText : pageText.toLowerCase()
    if (haystack.includes(needle)) {
      matches.push({ pageIndex, text: pageText.slice(0, 180) })
    }
  }

  return matches
}

export { pdfjsLib }
