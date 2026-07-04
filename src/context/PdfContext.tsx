import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type {
  Annotation,
  AnnotationKind,
  PdfMetadata,
  SearchMatch,
  SidebarPanel,
  ThemeMode,
  ViewerTool,
} from '../types'
import { loadPdfDocument } from '../lib/pdf/viewer'
import { applyAnnotations } from '../lib/pdf/operations'
import { openPdfFile, savePdfBytes } from '../lib/files'

type State = {
  bytes: Uint8Array | null
  fileName: string
  pageCount: number
  currentPage: number
  zoom: number
  rotation: number
  panel: SidebarPanel
  viewerTool: ViewerTool
  annotations: Annotation[]
  draftAnnotation: Partial<Annotation> | null
  annotateKind: AnnotationKind
  busy: boolean
  message: string | null
  metadata: PdfMetadata | null
  searchQuery: string
  searchMatches: SearchMatch[]
  matchCase: boolean
  theme: ThemeMode
  pageOrder: number[]
  ocrText: string | null
}

type Action =
  | { type: 'SET_BYTES'; bytes: Uint8Array; fileName: string }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_ROTATION'; rotation: number }
  | { type: 'SET_PANEL'; panel: SidebarPanel }
  | { type: 'SET_VIEWER_TOOL'; tool: ViewerTool }
  | { type: 'SET_BUSY'; busy: boolean; message?: string | null }
  | { type: 'SET_METADATA'; metadata: PdfMetadata | null }
  | { type: 'SET_ANNOTATIONS'; annotations: Annotation[] }
  | { type: 'ADD_ANNOTATION'; annotation: Annotation }
  | { type: 'CLEAR_ANNOTATIONS' }
  | { type: 'SET_DRAFT'; draft: Partial<Annotation> | null }
  | { type: 'SET_ANNOTATE_KIND'; kind: AnnotationKind }
  | { type: 'SET_SEARCH'; query: string; matches: SearchMatch[] }
  | { type: 'SET_MATCH_CASE'; matchCase: boolean }
  | { type: 'SET_THEME'; theme: ThemeMode }
  | { type: 'SET_PAGE_ORDER'; order: number[]; pageCount: number }
  | { type: 'SET_OCR'; text: string | null }

const initialState: State = {
  bytes: null,
  fileName: 'document.pdf',
  pageCount: 0,
  currentPage: 0,
  zoom: 1.1,
  rotation: 0,
  panel: 'home',
  viewerTool: 'pan',
  annotations: [],
  draftAnnotation: null,
  annotateKind: 'highlight',
  busy: false,
  message: null,
  metadata: null,
  searchQuery: '',
  searchMatches: [],
  matchCase: false,
  theme: (localStorage.getItem('fixpdf-theme') as ThemeMode | null) ?? 'system',
  pageOrder: [],
  ocrText: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_BYTES':
      return {
        ...state,
        bytes: action.bytes,
        fileName: action.fileName,
        currentPage: 0,
        annotations: [],
        draftAnnotation: null,
        searchQuery: '',
        searchMatches: [],
        ocrText: null,
      }
    case 'SET_PAGE':
      return { ...state, currentPage: action.page }
    case 'SET_ZOOM':
      return { ...state, zoom: action.zoom }
    case 'SET_ROTATION':
      return { ...state, rotation: action.rotation }
    case 'SET_PANEL':
      return { ...state, panel: action.panel }
    case 'SET_VIEWER_TOOL':
      return { ...state, viewerTool: action.tool }
    case 'SET_BUSY':
      return { ...state, busy: action.busy, message: action.message ?? null }
    case 'SET_METADATA':
      return { ...state, metadata: action.metadata, pageCount: action.metadata?.pageCount ?? 0 }
    case 'SET_ANNOTATIONS':
      return { ...state, annotations: action.annotations }
    case 'ADD_ANNOTATION':
      return { ...state, annotations: [...state.annotations, action.annotation] }
    case 'CLEAR_ANNOTATIONS':
      return { ...state, annotations: [] }
    case 'SET_DRAFT':
      return { ...state, draftAnnotation: action.draft }
    case 'SET_ANNOTATE_KIND':
      return { ...state, annotateKind: action.kind }
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query, searchMatches: action.matches }
    case 'SET_MATCH_CASE':
      return { ...state, matchCase: action.matchCase }
    case 'SET_THEME':
      return { ...state, theme: action.theme }
    case 'SET_PAGE_ORDER':
      return { ...state, pageOrder: action.order, pageCount: action.pageCount }
    case 'SET_OCR':
      return { ...state, ocrText: action.text }
    default:
      return state
  }
}

type PdfContextValue = State & {
  openDocument: () => Promise<void>
  openFromFile: (file: File) => Promise<void>
  saveDocument: () => Promise<void>
  replaceBytes: (bytes: Uint8Array, fileName?: string) => Promise<void>
  commitAnnotations: () => Promise<void>
  dispatch: (action: Action) => void
}

const PdfContext = createContext<PdfContextValue | null>(null)

export function PdfProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const replaceBytes = useCallback(async (bytes: Uint8Array, fileName?: string) => {
    dispatch({ type: 'SET_BYTES', bytes, fileName: fileName ?? state.fileName })
    const pdf = await loadPdfDocument(bytes)
    dispatch({
      type: 'SET_METADATA',
      metadata: {
        pageCount: pdf.numPages,
        fileSize: bytes.byteLength,
        encrypted: false,
      },
    })
    dispatch({
      type: 'SET_PAGE_ORDER',
      order: Array.from({ length: pdf.numPages }, (_, index) => index),
      pageCount: pdf.numPages,
    })
  }, [state.fileName])

  const openFromFile = useCallback(
    async (file: File) => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      await replaceBytes(bytes, file.name)
      dispatch({ type: 'SET_PANEL', panel: 'view' })
    },
    [replaceBytes],
  )

  const openDocument = useCallback(async () => {
    const files = await openPdfFile(false)
    const file = files[0]
    if (!file) return
    await openFromFile(file)
  }, [openFromFile])

  const saveDocument = useCallback(async () => {
    if (!state.bytes) return
    let output = state.bytes
    if (state.annotations.length > 0) {
      output = await applyAnnotations(state.bytes, state.annotations)
    }
    await savePdfBytes(output, state.fileName)
  }, [state.annotations, state.bytes, state.fileName])

  const commitAnnotations = useCallback(async () => {
    if (!state.bytes || state.annotations.length === 0) return
    dispatch({ type: 'SET_BUSY', busy: true })
    try {
      const output = await applyAnnotations(state.bytes, state.annotations)
      await replaceBytes(output)
      dispatch({ type: 'CLEAR_ANNOTATIONS' })
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false })
    }
  }, [replaceBytes, state.annotations, state.bytes])

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark =
      state.theme === 'dark' || (state.theme === 'system' && prefersDark)
    root.classList.toggle('dark', isDark)
    localStorage.setItem('fixpdf-theme', state.theme)
  }, [state.theme])

  const value = useMemo(
    () => ({
      ...state,
      openDocument,
      openFromFile,
      saveDocument,
      replaceBytes,
      commitAnnotations,
      dispatch,
    }),
    [state, openDocument, openFromFile, saveDocument, replaceBytes, commitAnnotations],
  )

  return <PdfContext.Provider value={value}>{children}</PdfContext.Provider>
}

export function usePdf() {
  const context = useContext(PdfContext)
  if (!context) throw new Error('usePdf must be used within PdfProvider')
  return context
}

export function usePdfDispatch() {
  return usePdf().dispatch
}
