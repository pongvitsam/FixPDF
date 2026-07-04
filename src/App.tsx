import {
  Bookmark,
  ClipboardCheck,
  FileInput,
  FileText,
  Hand,
  Home,
  Info,
  Layers3,
  Minus,
  MousePointer2,
  Moon,
  Paperclip,
  Plus,
  Printer,
  RotateCw,
  Save,
  Search,
  Settings,
  StickyNote,
  Sun,
  Wrench,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './components/ui'
import { DocumentTabs } from './components/DocumentTabs'
import { usePdf, usePdfDispatch } from './context/PdfContext'
import { savePdfBytes } from './lib/files'
import { AnnotatePanel } from './features/annotate/AnnotatePanel'
import { PagesPanel } from './features/pages/PagesPanel'
import { SearchPanel } from './features/search/SearchPanel'
import { SettingsPanel } from './features/settings/SettingsPanel'
import { ToolkitPanel } from './features/toolkit/ToolkitPanel'
import { AdvancedToolkit } from './features/toolkit/AdvancedToolkit'
import { BookmarksPanel } from './features/bookmarks/BookmarksPanel'
import { AttachmentsPanel } from './features/attachments/AttachmentsPanel'
import { FormsPanel } from './features/forms/FormsPanel'
import { PreflightPanel } from './features/preflight/PreflightPanel'
import { InspectorPanel } from './features/inspector/InspectorPanel'
import { PdfViewer, ThumbnailStrip } from './features/viewer/PdfViewer'
import type { SidebarPanel } from './types'

const navItems: { id: SidebarPanel; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'nav.home' },
  { id: 'view', icon: FileText, label: 'nav.view' },
  { id: 'pages', icon: Layers3, label: 'nav.pages' },
  { id: 'toolkit', icon: Wrench, label: 'nav.toolkit' },
  { id: 'annotate', icon: StickyNote, label: 'nav.annotate' },
  { id: 'search', icon: Search, label: 'nav.search' },
  { id: 'bookmarks', icon: Bookmark, label: 'nav.bookmarks' },
  { id: 'forms', icon: FileInput, label: 'nav.forms' },
  { id: 'attachments', icon: Paperclip, label: 'nav.attachments' },
  { id: 'preflight', icon: ClipboardCheck, label: 'nav.preflight' },
  { id: 'inspector', icon: Info, label: 'nav.inspector' },
  { id: 'settings', icon: Settings, label: 'nav.settings' },
]

function SidebarContent() {
  const { t } = useTranslation()
  const { panel, bytes, metadata } = usePdf()

  if (panel === 'home') {
    return (
      <div className="space-y-4 p-4">
        <div>
          <h2 className="text-lg font-semibold">{t('app.title')}</h2>
          <p className="text-sm text-[var(--muted)]">{t('app.subtitle')}</p>
        </div>
        {metadata ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm space-y-1">
            <div>{t('metadata.pages')}: {metadata.pageCount}</div>
            <div>{t('metadata.size')}: {(metadata.fileSize / 1024).toFixed(1)} KB</div>
            {metadata.encrypted ? <div>{t('metadata.encrypted')}: ✓</div> : null}
          </div>
        ) : null}
        {!bytes ? <p className="text-sm text-[var(--muted)]">{t('app.noDocument')}</p> : null}
      </div>
    )
  }

  if (panel === 'pages') return <div className="p-4"><PagesPanel /></div>
  if (panel === 'toolkit') return <div className="space-y-4 p-4"><ToolkitPanel /><AdvancedToolkit /></div>
  if (panel === 'annotate') return <div className="p-4"><AnnotatePanel /></div>
  if (panel === 'search') return <div className="p-4"><SearchPanel /></div>
  if (panel === 'bookmarks') return <div className="p-4"><BookmarksPanel /></div>
  if (panel === 'forms') return <div className="p-4"><FormsPanel /></div>
  if (panel === 'attachments') return <div className="p-4"><AttachmentsPanel /></div>
  if (panel === 'preflight') return <div className="p-4"><PreflightPanel /></div>
  if (panel === 'inspector') return <div className="p-4"><InspectorPanel /></div>
  if (panel === 'settings') return <div className="p-4"><SettingsPanel /></div>

  return (
    <div className="space-y-3 p-4 text-sm text-[var(--muted)]">
      <p>{t('viewer.pan')} / {t('viewer.select')}</p>
      <p>{t('pages.reorderHint')}</p>
    </div>
  )
}

export default function App() {
  const { t } = useTranslation()
  const {
    panel,
    bytes,
    fileName,
    currentPage,
    pageCount,
    zoom,
    rotation,
    viewerTool,
    busy,
    message,
    theme,
    openDocument,
    saveDocument,
  } = usePdf()
  const dispatch = usePdfDispatch()

  return (
    <div className="flex min-h-screen flex-col print:block">
      <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 print:hidden">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--primary)] font-bold text-[var(--primary-fg)]">
          FP
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{t('app.title')}</div>
          <div className="truncate text-xs text-[var(--muted)]">{bytes ? fileName : t('app.subtitle')}</div>
        </div>
        <Button variant="outline" onClick={() => void openDocument()}>{t('app.openPdf')}</Button>
        <Button variant="primary" disabled={!bytes} onClick={() => void saveDocument()}>
          <Save className="size-4" /> {t('app.save')}
        </Button>
        <Button
          variant="outline"
          disabled={!bytes}
          onClick={() => bytes && void savePdfBytes(bytes, fileName.replace(/\.pdf$/i, '') + '-copy.pdf')}
        >
          {t('app.saveAs')}
        </Button>
        <Button variant="outline" disabled={!bytes} onClick={() => window.print()}>
          <Printer className="size-4" /> {t('toolkit.print')}
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            dispatch({
              type: 'SET_THEME',
              theme: theme === 'dark' ? 'light' : 'dark',
            })
          }
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </header>

      <DocumentTabs />

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-16 shrink-0 flex-col gap-1 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-2 print:hidden">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              title={t(label)}
              onClick={() => dispatch({ type: 'SET_PANEL', panel: id })}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-[10px] ${panel === id ? 'bg-[var(--accent)] text-[var(--primary)]' : 'text-[var(--muted)] hover:bg-[var(--accent)]'}`}
            >
              <Icon className="size-5" />
              <span>{t(label)}</span>
            </button>
          ))}
        </nav>

        <aside className="hidden w-80 shrink-0 overflow-auto border-r border-[var(--border)] bg-[var(--bg)] lg:block print:hidden">
          <SidebarContent />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 print:hidden">
            <Button
              variant={panel === 'annotate' ? 'primary' : 'outline'}
              onClick={() => dispatch({ type: 'SET_PANEL', panel: 'annotate' })}
            >
              <StickyNote className="size-4" />
            </Button>
            <Button
              variant={viewerTool === 'pan' ? 'primary' : 'outline'}
              onClick={() => dispatch({ type: 'SET_VIEWER_TOOL', tool: 'pan' })}
            >
              <Hand className="size-4" /> {t('viewer.pan')}
            </Button>
            <Button
              variant={viewerTool === 'select' ? 'primary' : 'outline'}
              onClick={() => dispatch({ type: 'SET_VIEWER_TOOL', tool: 'select' })}
            >
              <MousePointer2 className="size-4" /> {t('viewer.select')}
            </Button>
            <div className="mx-2 h-6 w-px bg-[var(--border)]" />
            <Button variant="outline" title={t('viewer.zoomOut')} onClick={() => dispatch({ type: 'SET_ZOOM', zoom: Math.max(0.4, zoom - 0.1) })}>
              <Minus className="size-4" />
            </Button>
            <span className="min-w-16 text-center text-sm">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" title={t('viewer.zoomIn')} onClick={() => dispatch({ type: 'SET_ZOOM', zoom: Math.min(3, zoom + 0.1) })}>
              <Plus className="size-4" />
            </Button>
            <Button variant="outline" onClick={() => dispatch({ type: 'REQUEST_FIT_WIDTH' })}>
              {t('viewer.fitWidth')}
            </Button>
            <Button
              variant="outline"
              disabled={!bytes}
              onClick={() => dispatch({ type: 'SET_ROTATION', rotation: (rotation + 90) % 360 })}
            >
              <RotateCw className="size-4" />
            </Button>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <Button
                variant="outline"
                disabled={currentPage <= 0}
                onClick={() => dispatch({ type: 'SET_PAGE', page: currentPage - 1 })}
              >
                ‹
              </Button>
              <span>
                {t('viewer.page')} {bytes ? currentPage + 1 : 0} {t('viewer.of')} {pageCount}
              </span>
              <Button
                variant="outline"
                disabled={!bytes || currentPage >= pageCount - 1}
                onClick={() => dispatch({ type: 'SET_PAGE', page: currentPage + 1 })}
              >
                ›
              </Button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1">
            <PdfViewer />
            {busy ? (
              <div className="absolute inset-0 grid place-items-center bg-black/20 backdrop-blur-[1px]">
                <div className="rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm shadow-lg">
                  {message ?? t('app.processing')}
                </div>
              </div>
            ) : null}
          </div>
          <ThumbnailStrip />
        </main>
      </div>
    </div>
  )
}
