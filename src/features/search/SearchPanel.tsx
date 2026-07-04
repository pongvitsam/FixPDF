import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { Button, Field, Input, Panel } from '../../components/ui'
import { usePdf, usePdfDispatch } from '../../context/PdfContext'
import { loadPdfDocument, searchPdfText } from '../../lib/pdf/viewer'

export function SearchPanel() {
  const { t } = useTranslation()
  const { bytes, searchQuery, searchMatches, matchCase, pdfPassword, activeSearchIndex } = usePdf()
  const dispatch = usePdfDispatch()

  const runSearch = async () => {
    if (!bytes || !searchQuery.trim()) {
      dispatch({ type: 'SET_SEARCH', query: searchQuery, matches: [] })
      return
    }
    dispatch({ type: 'SET_BUSY', busy: true })
    try {
      const { pdf } = await loadPdfDocument(bytes, pdfPassword ?? undefined)
      const matches = await searchPdfText(pdf, searchQuery.trim(), matchCase)
      dispatch({ type: 'SET_SEARCH', query: searchQuery, matches })
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false })
    }
  }

  const goToMatch = (direction: 1 | -1) => {
    if (!searchMatches.length) return
    const next = (activeSearchIndex + direction + searchMatches.length) % searchMatches.length
    dispatch({ type: 'SET_ACTIVE_SEARCH_INDEX', index: next })
  }

  return (
    <Panel title={t('search.title')}>
      <div className="space-y-3">
        <Field label={t('search.placeholder')}>
          <Input
            value={searchQuery}
            onChange={(event) =>
              dispatch({ type: 'SET_SEARCH', query: event.target.value, matches: searchMatches })
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') void runSearch()
            }}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={matchCase}
            onChange={(event) => dispatch({ type: 'SET_MATCH_CASE', matchCase: event.target.checked })}
          />
          {t('search.matchCase')}
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={!bytes} onClick={() => void runSearch()}>
            <Search className="size-4" /> {t('search.title')}
          </Button>
          <Button variant="outline" disabled={!searchMatches.length} onClick={() => goToMatch(-1)}>
            <ChevronUp className="size-4" /> {t('search.prev')}
          </Button>
          <Button variant="outline" disabled={!searchMatches.length} onClick={() => goToMatch(1)}>
            <ChevronDown className="size-4" /> {t('search.next')}
          </Button>
        </div>
        {searchMatches.length === 0 && searchQuery ? (
          <p className="text-sm text-[var(--muted)]">{t('search.noMatches')}</p>
        ) : null}
        {searchMatches.length > 0 ? (
          <p className="text-sm">
            {t('search.results', { count: searchMatches.length })} — {t('search.current', { index: activeSearchIndex + 1 })}
          </p>
        ) : null}
        <div className="space-y-2">
          {searchMatches.map((match, index) => (
            <button
              key={`${match.pageIndex}-${match.text.slice(0, 20)}`}
              type="button"
              className={`block w-full rounded-xl border px-3 py-2 text-left text-xs hover:bg-[var(--accent)] ${activeSearchIndex === index ? 'border-[var(--primary)] bg-[var(--accent)]' : 'border-[var(--border)]'}`}
              onClick={() => dispatch({ type: 'SET_ACTIVE_SEARCH_INDEX', index })}
            >
              <strong>{t('viewer.page')} {match.pageIndex + 1}</strong>
              <div className="mt-1 text-[var(--muted)]">{match.text}</div>
            </button>
          ))}
        </div>
      </div>
    </Panel>
  )
}
