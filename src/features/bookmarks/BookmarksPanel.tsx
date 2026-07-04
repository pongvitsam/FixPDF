import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bookmark } from 'lucide-react'
import { Panel } from '../../components/ui'
import { usePdf, usePdfDispatch } from '../../context/PdfContext'
import { loadBookmarks, type BookmarkNode } from '../../lib/pdf/catalog'

function BookmarkTree({ nodes, depth = 0 }: { nodes: BookmarkNode[]; depth?: number }) {
  const dispatch = usePdfDispatch()

  return (
    <ul className={depth ? 'ml-3 border-l border-[var(--border)] pl-2' : 'space-y-1'}>
      {nodes.map((node) => (
        <li key={`${node.title}-${node.pageIndex}-${depth}`}>
          <button
            type="button"
            className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[var(--accent)]"
            onClick={() => dispatch({ type: 'SET_PAGE', page: node.pageIndex })}
          >
            {node.title}
            <span className="ml-1 text-xs text-[var(--muted)]">p{node.pageIndex + 1}</span>
          </button>
          {node.children.length > 0 ? <BookmarkTree nodes={node.children} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  )
}

export function BookmarksPanel() {
  const { t } = useTranslation()
  const { bytes, pdfPassword } = usePdf()
  const [bookmarks, setBookmarks] = useState<BookmarkNode[]>([])

  useEffect(() => {
    if (!bytes) {
      setBookmarks([])
      return
    }
    void (async () => {
      const items = await loadBookmarks(bytes, pdfPassword ?? undefined)
      setBookmarks(items)
    })()
  }, [bytes, pdfPassword])

  return (
    <Panel title={t('bookmarks.title')}>
      {!bytes ? (
        <p className="text-sm text-[var(--muted)]">{t('app.noDocument')}</p>
      ) : bookmarks.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t('bookmarks.empty')}</p>
      ) : (
        <BookmarkTree nodes={bookmarks} />
      )}
      <p className="mt-3 flex items-center gap-1 text-xs text-[var(--muted)]">
        <Bookmark className="size-3" /> {t('bookmarks.hint')}
      </p>
    </Panel>
  )
}
