import type { PdfEngine } from 'clawpdf/browser'

let engine: PdfEngine | null = null
let enginePromise: Promise<PdfEngine> | null = null

function pdfiumWasmUrl() {
  return `${import.meta.env.BASE_URL}pdfium.esm.wasm`
}

export async function getPdfiumEngine(): Promise<PdfEngine> {
  if (engine) return engine
  if (!enginePromise) {
    enginePromise = (async () => {
      const { createEngine } = await import('clawpdf/browser')
      const instance = await createEngine({ wasmUrl: pdfiumWasmUrl() })
      engine = instance
      return instance
    })()
  }
  return enginePromise
}

export async function pdfiumExtractText(bytes: Uint8Array, password?: string) {
  const eng = await getPdfiumEngine()
  const doc = await eng.open(bytes.slice(), { password })
  try {
    return doc.text({ maxChars: 500_000 })
  } finally {
    doc.destroy()
  }
}

export async function pdfiumRenderPagePng(
  bytes: Uint8Array,
  pageIndex: number,
  password?: string,
  dpi = 144,
) {
  const eng = await getPdfiumEngine()
  const doc = await eng.open(bytes.slice(), { password })
  try {
    return doc.page(pageIndex + 1).png({ dpi, forms: true, compress: true })
  } finally {
    doc.destroy()
  }
}

export async function pdfiumReadMetadata(bytes: Uint8Array, password?: string) {
  const eng = await getPdfiumEngine()
  const doc = await eng.open(bytes.slice(), { password })
  try {
    return {
      pageCount: doc.pageCount,
      ...doc.metadata,
    }
  } finally {
    doc.destroy()
  }
}
