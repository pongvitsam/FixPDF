import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import type { SearchMatch } from '../../types'
import { requestPassword } from './passwordPrompt'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

type CanvasRenderState = {
  generation: number
  task: RenderTask | null
}

const canvasRenderState = new WeakMap<HTMLCanvasElement, CanvasRenderState>()

async function beginCanvasRender(canvas: HTMLCanvasElement): Promise<number> {
  const prev = canvasRenderState.get(canvas)
  const generation = (prev?.generation ?? 0) + 1
  if (prev?.task) {
    prev.task.cancel()
    try {
      await prev.task.promise
    } catch {
      // Previous render was cancelled; safe to reuse the canvas.
    }
  }
  canvasRenderState.set(canvas, { generation, task: null })
  return generation
}

function isCanvasRenderStale(canvas: HTMLCanvasElement, generation: number): boolean {
  return canvasRenderState.get(canvas)?.generation !== generation
}

export type LoadedPdf = {
  pdf: PDFDocumentProxy
  password?: string
  encrypted: boolean
}

export async function loadPdfDocument(
  bytes: Uint8Array,
  knownPassword?: string,
): Promise<LoadedPdf> {
  let usedPassword = knownPassword
  let encrypted = false

  const pdf = await new Promise<PDFDocumentProxy>((resolve, reject) => {
    const loadingTask = pdfjsLib.getDocument({
      data: bytes.slice(),
      password: knownPassword,
      verbosity: pdfjsLib.VerbosityLevel.ERRORS,
      enableXfa: false,
    })

    loadingTask.onPassword = (
      updatePassword: (password: string) => void,
      reason: number,
    ) => {
      encrypted = true
      if (knownPassword) {
        updatePassword(knownPassword)
        return
      }
      void requestPassword(reason).then((password) => {
        if (!password) {
          loadingTask.destroy()
          reject(new Error('Password required'))
          return
        }
        usedPassword = password
        updatePassword(password)
      })
    }

    loadingTask.promise.then(resolve).catch(reject)
  })

  return { pdf, password: usedPassword, encrypted }
}

export async function renderPageToCanvas(
  pdf: PDFDocumentProxy,
  pageIndex: number,
  scale: number,
  canvas: HTMLCanvasElement,
  rotation = 0,
  options?: { signal?: AbortSignal },
) {
  const generation = await beginCanvasRender(canvas)

  const page = await pdf.getPage(pageIndex + 1)
  if (options?.signal?.aborted || isCanvasRenderStale(canvas, generation)) {
    throw new DOMException('Render aborted', 'AbortError')
  }

  const viewport = page.getViewport({ scale, rotation })
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas context unavailable')

  if (isCanvasRenderStale(canvas, generation)) {
    throw new DOMException('Render aborted', 'AbortError')
  }

  canvas.width = viewport.width
  canvas.height = viewport.height

  const task = page.render({
    canvasContext: context,
    viewport,
    canvas,
    annotationMode: pdfjsLib.AnnotationMode.DISABLE,
    intent: 'display',
  })

  const state = canvasRenderState.get(canvas)
  if (state?.generation === generation) {
    state.task = task
  }

  if (options?.signal) {
    options.signal.addEventListener('abort', () => task.cancel(), { once: true })
  }

  try {
    await task.promise
  } catch (error) {
    if (error instanceof pdfjsLib.RenderingCancelledException) {
      throw error
    }
    throw error
  }

  if (isCanvasRenderStale(canvas, generation)) {
    throw new DOMException('Render aborted', 'AbortError')
  }

  return viewport
}

export async function renderPageToImage(
  pdf: PDFDocumentProxy,
  pageIndex: number,
  scale: number,
  mime: 'image/png' | 'image/jpeg' | 'image/webp',
) {
  const canvas = document.createElement('canvas')
  await renderPageToCanvas(pdf, pageIndex, scale, canvas)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Image export failed'))),
      mime,
      mime === 'image/jpeg' || mime === 'image/webp' ? 0.92 : undefined,
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
      matches.push({ pageIndex, text: pageText.slice(0, 180), index: matches.length })
    }
  }

  return matches
}

export { pdfjsLib }
