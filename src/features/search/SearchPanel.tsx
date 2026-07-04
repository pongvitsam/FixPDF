import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Button, Field, Input, Panel } from '../../components/ui'
import { usePdf, usePdfDispatch } from '../../context/PdfContext'
import { loadPdfDocument, searchPdfText } from '../../lib/pdf/viewer'

export function SearchPanel() {
  const { t } = useTranslation()
  const { bytes, searchQuery, searchMatches, matchCase } = usePdf()
  const dispatch = usePdfDispatch()

  const runSearch = async () => {
    if (!bytes || !searchQuery.trim()) {
      dispatch({ type: 'SET_SEARCH', query: searchQuery, matches: [] })
      return
    }
    dispatch({ type: 'SET_BUSY', busy: true })
    try {
      const pdf = await loadPdfDocument(bytes)
      const matches = await searchPdfText(pdf, searchQuery.trim(), matchCase)
      dispatch({ type: 'SET_SEARCH', query: searchQuery, matches })
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false })
    }
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
        <Button variant="primary" disabled={!bytes} onClick={() => void runSearch()}>
          <Search className="size-4" /> {t('search.title')}
        </Button>
        {searchMatches.length === 0 && searchQuery ? (
          <p className="text-sm text-[var(--muted)]">{t('search.noMatches')}</p>
        ) : null}
        {searchMatches.length > 0 ? (
          <p className="text-sm">{t('search.results', { count: searchMatches.length })}</p>
        ) : null}
        <div className="space-y-2">
          {searchMatches.map((match) => (
            <button
              key={`${match.pageIndex}-${match.text.slice(0, 20)}`}
              type="button"
              className="block w-full rounded-xl border border-[var(--border)] px-3 py-2 text-left text-xs hover:bg-[var(--accent)]"
              onClick={() => dispatch({ type: 'SET_PAGE', page: match.pageIndex })}
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
