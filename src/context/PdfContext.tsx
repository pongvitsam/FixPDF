import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { PasswordDialog } from '../components/PasswordDialog'
import { Toast, showToast } from '../components/Toast'
import type {
  Annotation,
  AnnotationKind,
  OpenDocument,
  PdfMetadata,
  SearchMatch,
  SidebarPanel,
  ThemeMode,
  ViewerTool,
} from '../types'
import { loadPdfDocument } from '../lib/pdf/viewer'
import { applyAnnotations } from '../lib/pdf/operations'
import { openPdfFile, savePdfBytes } from '../lib/files'

type DocumentSession = {
  id: string
  fileName: string
  bytes: Uint8Array
  pdfPassword: string | null
  metadata: PdfMetadata | null
  pageCount: number
  currentPage: number
  pageOrder: number[]
  annotations: Annotation[]
  draftAnnotation: Partial<Annotation> | null
  ocrText: string | null
  searchQuery: string
  searchMatches: SearchMatch[]
  activeSearchIndex: number
  annotationHistory: Annotation[][]
  annotationHistoryIndex: number
  selectedAnnotationId: string | null
}

type State = {
  documents: DocumentSession[]
  activeDocumentId: string | null
  zoom: number
  rotation: number
  panel: SidebarPanel
  viewerTool: ViewerTool
  annotateKind: AnnotationKind
  busy: boolean
  message: string | null
  matchCase: boolean
  theme: ThemeMode
  fitWidthNonce: number
}

type Action =
  | {
      type: 'LOAD_DOCUMENT'
      bytes: Uint8Array
      fileName: string
      pdfPassword?: string | null
      newTab?: boolean
    }
  | { type: 'REPLACE_ACTIVE_BYTES'; bytes: Uint8Array; fileName?: string; pdfPassword?: string | null }
  | { type: 'SWITCH_DOCUMENT'; id: string }
  | { type: 'CLOSE_DOCUMENT'; id: string }
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
  | { type: 'SET_ACTIVE_SEARCH_INDEX'; index: number }
  | { type: 'REQUEST_FIT_WIDTH' }
  | { type: 'UNDO_ANNOTATION' }
  | { type: 'REDO_ANNOTATION' }
  | { type: 'SET_SELECTED_ANNOTATION'; id: string | null }

function createId() {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptySession(
  id: string,
  bytes: Uint8Array,
  fileName: string,
  pdfPassword: string | null = null,
): DocumentSession {
  return {
    id,
    fileName,
    bytes,
    pdfPassword,
    metadata: null,
    pageCount: 0,
    currentPage: 0,
    pageOrder: [],
    annotations: [],
    draftAnnotation: null,
    ocrText: null,
    searchQuery: '',
    searchMatches: [],
    activeSearchIndex: 0,
    annotationHistory: [[]],
    annotationHistoryIndex: 0,
    selectedAnnotationId: null,
  }
}

function getActive(state: State): DocumentSession | null {
  if (!state.activeDocumentId) return null
  return state.documents.find((doc) => doc.id === state.activeDocumentId) ?? null
}

function patchActive(state: State, patch: Partial<DocumentSession>): State {
  const activeId = state.activeDocumentId
  if (!activeId) return state
  return {
    ...state,
    documents: state.documents.map((doc) =>
      doc.id === activeId ? { ...doc, ...patch } : doc,
    ),
  }
}

function withAnnotationHistory(doc: DocumentSession, annotations: Annotation[]) {
  const head = doc.annotationHistory.slice(0, doc.annotationHistoryIndex + 1)
  const next = [...head, annotations]
  return {
    annotations,
    annotationHistory: next,
    annotationHistoryIndex: next.length - 1,
  }
}

const initialState: State = {
  documents: [],
  activeDocumentId: null,
  zoom: 1.1,
  rotation: 0,
  panel: 'home',
  viewerTool: 'pan',
  annotateKind: 'highlight',
  busy: false,
  message: null,
  matchCase: false,
  theme: (localStorage.getItem('fixpdf-theme') as ThemeMode | null) ?? 'system',
  fitWidthNonce: 0,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_DOCUMENT': {
      const id = createId()
      const session = emptySession(id, action.bytes, action.fileName, action.pdfPassword ?? null)
      const newTab = action.newTab ?? state.documents.length > 0
      if (!newTab) {
        return {
          ...state,
          documents: [session],
          activeDocumentId: id,
        }
      }
      return {
        ...state,
        documents: [...state.documents, session],
        activeDocumentId: id,
      }
    }
    case 'REPLACE_ACTIVE_BYTES': {
      const active = getActive(state)
      if (!active) return state
      return patchActive(state, {
        bytes: action.bytes,
        fileName: action.fileName ?? active.fileName,
        pdfPassword:
          action.pdfPassword === undefined ? active.pdfPassword : action.pdfPassword,
        annotations: [],
        draftAnnotation: null,
        searchQuery: '',
        searchMatches: [],
        ocrText: null,
        activeSearchIndex: 0,
        annotationHistory: [[]],
        annotationHistoryIndex: 0,
        selectedAnnotationId: null,
      })
    }
    case 'SWITCH_DOCUMENT':
      return state.activeDocumentId === action.id
        ? state
        : { ...state, activeDocumentId: action.id }
    case 'CLOSE_DOCUMENT': {
      const index = state.documents.findIndex((doc) => doc.id === action.id)
      if (index < 0) return state
      const documents = state.documents.filter((doc) => doc.id !== action.id)
      let activeDocumentId = state.activeDocumentId
      if (activeDocumentId === action.id) {
        const next = documents[Math.min(index, documents.length - 1)]
        activeDocumentId = next?.id ?? null
      }
      return { ...state, documents, activeDocumentId }
    }
    case 'SET_PAGE':
      return patchActive(state, { currentPage: action.page })
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
      return patchActive(state, {
        metadata: action.metadata,
        pageCount: action.metadata?.pageCount ?? 0,
      })
    case 'SET_ANNOTATIONS':
      return patchActive(state, { annotations: action.annotations })
    case 'ADD_ANNOTATION': {
      const active = getActive(state)
      if (!active) return state
      return patchActive(state, withAnnotationHistory(active, [...active.annotations, action.annotation]))
    }
    case 'CLEAR_ANNOTATIONS': {
      const active = getActive(state)
      if (!active) return state
      return patchActive(state, withAnnotationHistory(active, []))
    }
    case 'UNDO_ANNOTATION': {
      const active = getActive(state)
      if (!active || active.annotationHistoryIndex <= 0) return state
      const index = active.annotationHistoryIndex - 1
      return patchActive(state, {
        annotationHistoryIndex: index,
        annotations: active.annotationHistory[index] ?? [],
      })
    }
    case 'REDO_ANNOTATION': {
      const active = getActive(state)
      if (!active || active.annotationHistoryIndex >= active.annotationHistory.length - 1) return state
      const index = active.annotationHistoryIndex + 1
      return patchActive(state, {
        annotationHistoryIndex: index,
        annotations: active.annotationHistory[index] ?? [],
      })
    }
    case 'SET_SELECTED_ANNOTATION':
      return patchActive(state, { selectedAnnotationId: action.id })
    case 'SET_DRAFT':
      return patchActive(state, { draftAnnotation: action.draft })
    case 'SET_ANNOTATE_KIND':
      return { ...state, annotateKind: action.kind }
    case 'SET_SEARCH':
      return patchActive(state, {
        searchQuery: action.query,
        searchMatches: action.matches,
        activeSearchIndex: 0,
      })
    case 'SET_MATCH_CASE':
      return { ...state, matchCase: action.matchCase }
    case 'SET_THEME':
      return { ...state, theme: action.theme }
    case 'SET_PAGE_ORDER':
      return patchActive(state, { pageOrder: action.order, pageCount: action.pageCount })
    case 'SET_OCR':
      return patchActive(state, { ocrText: action.text })
    case 'SET_ACTIVE_SEARCH_INDEX': {
      const active = getActive(state)
      return patchActive(state, {
        activeSearchIndex: action.index,
        currentPage: active?.searchMatches[action.index]?.pageIndex ?? active?.currentPage ?? 0,
      })
    }
    case 'REQUEST_FIT_WIDTH':
      return { ...state, fitWidthNonce: state.fitWidthNonce + 1 }
    default:
      return state
  }
}

type PdfContextValue = {
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
  pdfPassword: string | null
  activeSearchIndex: number
  fitWidthNonce: number
  annotationHistory: Annotation[][]
  annotationHistoryIndex: number
  selectedAnnotationId: string | null
  canUndoAnnotation: boolean
  canRedoAnnotation: boolean
  documents: OpenDocument[]
  activeDocumentId: string | null
  openDocument: () => Promise<void>
  openFromFile: (file: File, newTab?: boolean) => Promise<void>
  saveDocument: () => Promise<void>
  replaceBytes: (bytes: Uint8Array, fileName?: string, pdfPassword?: string | null) => Promise<void>
  commitAnnotations: () => Promise<void>
  switchDocument: (id: string) => void
  closeDocument: (id: string) => void
  dispatch: (action: Action) => void
}

const PdfContext = createContext<PdfContextValue | null>(null)

export function PdfProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const active = getActive(state)

  const loadDocumentMeta = useCallback(async (bytes: Uint8Array, password?: string) => {
    const loaded = await loadPdfDocument(bytes, password)
    dispatch({
      type: 'SET_METADATA',
      metadata: {
        pageCount: loaded.pdf.numPages,
        fileSize: bytes.byteLength,
        encrypted: loaded.encrypted,
      },
    })
    dispatch({
      type: 'SET_PAGE_ORDER',
      order: Array.from({ length: loaded.pdf.numPages }, (_, index) => index),
      pageCount: loaded.pdf.numPages,
    })
    return loaded
  }, [])

  const replaceBytes = useCallback(async (
    bytes: Uint8Array,
    fileName?: string,
    passwordOverride?: string | null,
  ) => {
    const password =
      passwordOverride === undefined
        ? active?.pdfPassword ?? undefined
        : passwordOverride ?? undefined
    const loaded = await loadPdfDocument(bytes, password)
    dispatch({
      type: 'REPLACE_ACTIVE_BYTES',
      bytes,
      fileName: fileName ?? active?.fileName,
      pdfPassword:
        passwordOverride === undefined
          ? loaded.password ?? active?.pdfPassword ?? null
          : passwordOverride,
    })
    await loadDocumentMeta(bytes, password)
  }, [active?.fileName, active?.pdfPassword, loadDocumentMeta])

  const openFromFile = useCallback(
    async (file: File, newTab?: boolean) => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const loaded = await loadPdfDocument(bytes)
      dispatch({
        type: 'LOAD_DOCUMENT',
        bytes,
        fileName: file.name,
        pdfPassword: loaded.password ?? null,
        newTab,
      })
      await loadDocumentMeta(bytes, loaded.password ?? undefined)
      dispatch({ type: 'SET_PANEL', panel: 'view' })
    },
    [loadDocumentMeta],
  )

  const openDocument = useCallback(async () => {
    const files = await openPdfFile(false)
    const file = files[0]
    if (!file) return
    await openFromFile(file, true)
  }, [openFromFile])

  const saveDocument = useCallback(async () => {
    if (!active?.bytes) return
    let output = active.bytes
    if (active.annotations.length > 0) {
      output = await applyAnnotations(active.bytes, active.annotations)
    }
    await savePdfBytes(output, active.fileName)
    showToast('toast.saved')
  }, [active])

  const commitAnnotations = useCallback(async () => {
    if (!active?.bytes || active.annotations.length === 0) return
    dispatch({ type: 'SET_BUSY', busy: true })
    try {
      const output = await applyAnnotations(active.bytes, active.annotations)
      await replaceBytes(output)
      dispatch({ type: 'CLEAR_ANNOTATIONS' })
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false })
    }
  }, [active, replaceBytes])

  const switchDocument = useCallback((id: string) => {
    dispatch({ type: 'SWITCH_DOCUMENT', id })
  }, [])

  const closeDocument = useCallback((id: string) => {
    dispatch({ type: 'CLOSE_DOCUMENT', id })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark =
      state.theme === 'dark' || (state.theme === 'system' && prefersDark)
    root.classList.toggle('dark', isDark)
    localStorage.setItem('fixpdf-theme', state.theme)
  }, [state.theme])

  const documents: OpenDocument[] = useMemo(
    () =>
      state.documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        bytes: doc.bytes,
        pdfPassword: doc.pdfPassword,
        metadata: doc.metadata,
        pageCount: doc.pageCount,
        currentPage: doc.currentPage,
      })),
    [state.documents],
  )

  const value = useMemo<PdfContextValue>(
    () => ({
      bytes: active?.bytes ?? null,
      fileName: active?.fileName ?? 'document.pdf',
      pageCount: active?.pageCount ?? 0,
      currentPage: active?.currentPage ?? 0,
      annotations: active?.annotations ?? [],
      draftAnnotation: active?.draftAnnotation ?? null,
      metadata: active?.metadata ?? null,
      searchQuery: active?.searchQuery ?? '',
      searchMatches: active?.searchMatches ?? [],
      activeSearchIndex: active?.activeSearchIndex ?? 0,
      pageOrder: active?.pageOrder ?? [],
      ocrText: active?.ocrText ?? null,
      pdfPassword: active?.pdfPassword ?? null,
      annotationHistory: active?.annotationHistory ?? [[]],
      annotationHistoryIndex: active?.annotationHistoryIndex ?? 0,
      selectedAnnotationId: active?.selectedAnnotationId ?? null,
      canUndoAnnotation: (active?.annotationHistoryIndex ?? 0) > 0,
      canRedoAnnotation:
        (active?.annotationHistoryIndex ?? 0) < (active?.annotationHistory.length ?? 1) - 1,
      zoom: state.zoom,
      rotation: state.rotation,
      panel: state.panel,
      viewerTool: state.viewerTool,
      annotateKind: state.annotateKind,
      busy: state.busy,
      message: state.message,
      matchCase: state.matchCase,
      theme: state.theme,
      fitWidthNonce: state.fitWidthNonce,
      documents,
      activeDocumentId: state.activeDocumentId,
      openDocument,
      openFromFile,
      saveDocument,
      replaceBytes,
      commitAnnotations,
      switchDocument,
      closeDocument,
      dispatch,
    }),
    [
      active,
      state,
      documents,
      openDocument,
      openFromFile,
      saveDocument,
      replaceBytes,
      commitAnnotations,
      switchDocument,
      closeDocument,
    ],
  )

  return (
    <PdfContext.Provider value={value}>
      {children}
      <PasswordDialog />
      <Toast />
    </PdfContext.Provider>
  )
}

export function usePdf() {
  const context = useContext(PdfContext)
  if (!context) throw new Error('usePdf must be used within PdfProvider')
  return context
}

export function usePdfDispatch() {
  return usePdf().dispatch
}
