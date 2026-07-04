export type OpenDocument = {
  id: string
  fileName: string
  bytes: Uint8Array
  pdfPassword: string | null
  metadata: PdfMetadata | null
  pageCount: number
  currentPage: number
}

export type SidebarPanel =
  | 'home'
  | 'view'
  | 'pages'
  | 'toolkit'
  | 'annotate'
  | 'search'
  | 'bookmarks'
  | 'forms'
  | 'attachments'
  | 'preflight'
  | 'inspector'
  | 'settings'

export type ViewerTool = 'pan' | 'select'

export type AnnotationKind =
  | 'highlight'
  | 'underline'
  | 'strikeout'
  | 'note'
  | 'text'
  | 'rectangle'
  | 'redaction'

export type Annotation = {
  id: string
  pageIndex: number
  kind: AnnotationKind
  x: number
  y: number
  width: number
  height: number
  color: string
  text?: string
}

export type ThemeMode = 'light' | 'dark' | 'system'

export type PdfMetadata = {
  pageCount: number
  fileSize: number
  title?: string
  author?: string
  subject?: string
  encrypted: boolean
}

export type SearchMatch = {
  pageIndex: number
  text: string
  index: number
}

export type FormFieldInfo = {
  name: string
  type: string
  value?: string
}
