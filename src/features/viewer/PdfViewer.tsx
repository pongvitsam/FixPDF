import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { usePdf, usePdfDispatch } from '../../context/PdfContext'
import { loadPdfDocument, renderPageToCanvas } from '../../lib/pdf/viewer'
import type { AnnotationKind } from '../../types'

const kindColors: Record<AnnotationKind, string> = {
  highlight: '#fde047',
  underline: '#60a5fa',
  strikeout: '#f87171',
  note: '#c084fc',
  text: '#34d399',
  rectangle: '#fb923c',
  redaction: '#111111',
}

export function PdfViewer() {
  const { t } = useTranslation()
  const {
    bytes,
    currentPage,
    zoom,
    rotation,
    panel,
    annotateKind,
    annotations,
    draftAnnotation,
    viewerTool,
  } = usePdf()
  const dispatch = usePdfDispatch()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; active: boolean } | null>(null)
  const drawRef = useRef<{ x: number; y: number } | null>(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!bytes || !canvasRef.current) return
    let cancelled = false

    void (async () => {
      const pdf = await loadPdfDocument(bytes)
      if (cancelled) return
      const vp = await renderPageToCanvas(
        pdf,
        currentPage,
        zoom,
        canvasRef.current!,
        rotation,
      )
      setViewport({ width: vp.width, height: vp.height })
    })()

    return () => {
      cancelled = true
    }
  }, [bytes, currentPage, zoom, rotation])

  const onMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!bytes) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    if (panel === 'annotate') {
      drawRef.current = { x, y }
      dispatch({
        type: 'SET_DRAFT',
        draft: {
          pageIndex: currentPage,
          kind: annotateKind,
          x,
          y,
          width: 0,
          height: 0,
          color: kindColors[annotateKind],
        },
      })
      return
    }

    if (viewerTool === 'pan') {
      dragRef.current = { x: event.clientX, y: event.clientY, active: true }
    }
  }

  const onMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (drawRef.current && draftAnnotation) {
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      dispatch({
        type: 'SET_DRAFT',
        draft: {
          ...draftAnnotation,
          width: Math.max(8, x - drawRef.current.x),
          height: Math.max(8, y - drawRef.current.y),
        },
      })
      return
    }

    if (dragRef.current?.active && containerRef.current) {
      const dx = event.clientX - dragRef.current.x
      const dy = event.clientY - dragRef.current.y
      containerRef.current.scrollLeft -= dx
      containerRef.current.scrollTop -= dy
      dragRef.current = { x: event.clientX, y: event.clientY, active: true }
    }
  }

  const finishDraw = useCallback(() => {
    if (draftAnnotation && draftAnnotation.width && draftAnnotation.height) {
      dispatch({
        type: 'ADD_ANNOTATION',
        annotation: {
          id: crypto.randomUUID(),
          pageIndex: draftAnnotation.pageIndex ?? currentPage,
          kind: draftAnnotation.kind ?? 'highlight',
          x: draftAnnotation.x ?? 0,
          y: draftAnnotation.y ?? 0,
          width: draftAnnotation.width,
          height: draftAnnotation.height,
          color: draftAnnotation.color ?? '#fde047',
          text: draftAnnotation.kind === 'note' ? 'Note' : undefined,
        },
      })
    }
    drawRef.current = null
    dispatch({ type: 'SET_DRAFT', draft: null })
  }, [currentPage, dispatch, draftAnnotation])

  const onMouseUp = () => {
    dragRef.current = null
    finishDraw()
  }

  if (!bytes) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--muted)]">
        <p>{t('app.noDocument')}</p>
      </div>
    )
  }

  const pageAnnotations = annotations.filter((item) => item.pageIndex === currentPage)

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto bg-[color-mix(in_oklch,var(--bg)_88%,black)] p-6"
      onMouseLeave={onMouseUp}
    >
      <div
        className="relative mx-auto w-max shadow-xl"
        style={{ width: viewport.width || undefined, height: viewport.height || undefined }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        <canvas ref={canvasRef} className="block max-w-none bg-white" />
        {pageAnnotations.map((annotation) => (
          <div
            key={annotation.id}
            className="pointer-events-none absolute border"
            style={{
              left: annotation.x,
              top: annotation.y,
              width: annotation.width,
              height: annotation.height,
              background:
                annotation.kind === 'redaction'
                  ? '#111'
                  : `${annotation.color}66`,
              borderColor: annotation.color,
            }}
          />
        ))}
        {draftAnnotation ? (
          <div
            className="pointer-events-none absolute border border-dashed border-[var(--primary)]"
            style={{
              left: draftAnnotation.x,
              top: draftAnnotation.y,
              width: draftAnnotation.width,
              height: draftAnnotation.height,
              background: `${draftAnnotation.color ?? '#fde047'}44`,
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

export function ThumbnailStrip() {
  const { bytes, currentPage, pageCount } = usePdf()
  const dispatch = usePdfDispatch()
  const [thumbs, setThumbs] = useState<string[]>([])

  useEffect(() => {
    if (!bytes) {
      setThumbs([])
      return
    }

    let cancelled = false
    void (async () => {
      const pdf = await loadPdfDocument(bytes)
      const images: string[] = []
      for (let index = 0; index < pdf.numPages; index += 1) {
        const canvas = document.createElement('canvas')
        await renderPageToCanvas(pdf, index, 0.18, canvas)
        images.push(canvas.toDataURL('image/jpeg', 0.7))
      }
      if (!cancelled) setThumbs(images)
    })()

    return () => {
      cancelled = true
    }
  }, [bytes])

  if (!bytes) return null

  return (
    <div className="flex gap-2 overflow-x-auto border-t border-[var(--border)] p-3 print:hidden">
      {Array.from({ length: pageCount }).map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => dispatch({ type: 'SET_PAGE', page: index })}
          className={`shrink-0 overflow-hidden rounded-lg border ${currentPage === index ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}
        >
          {thumbs[index] ? (
            <img src={thumbs[index]} alt="" className="block h-24 w-auto" />
          ) : (
            <div className="flex h-24 w-16 items-center justify-center bg-[var(--accent)] text-xs">
              {index + 1}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
