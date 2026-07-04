import { useTranslation } from 'react-i18next'
import { Field, Panel } from '../../components/ui'
import { usePdfDispatch } from '../../context/PdfContext'
import type { ThemeMode } from '../../types'
import i18n from '../../i18n'

export function SettingsPanel() {
  const { t } = useTranslation()
  const dispatch = usePdfDispatch()

  return (
    <Panel title={t('settings.title')}>
      <div className="space-y-4">
        <Field label={t('settings.language')}>
          <select
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            value={i18n.language}
            onChange={(event) => {
              void i18n.changeLanguage(event.target.value)
              localStorage.setItem('fixpdf-language', event.target.value)
            }}
          >
            <option value="en">English</option>
            <option value="th">ไทย</option>
          </select>
        </Field>
        <Field label={t('settings.theme')}>
          <select
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            defaultValue={(localStorage.getItem('fixpdf-theme') as ThemeMode | null) ?? 'system'}
            onChange={(event) =>
              dispatch({ type: 'SET_THEME', theme: event.target.value as ThemeMode })
            }
          >
            <option value="light">{t('settings.light')}</option>
            <option value="dark">{t('settings.dark')}</option>
            <option value="system">{t('settings.system')}</option>
          </select>
        </Field>
      </div>
    </Panel>
  )
}
