import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shield } from 'lucide-react'
import { Button, Field, Input, Panel } from '../../components/ui'
import { usePdf, usePdfDispatch } from '../../context/PdfContext'
import { fillFormField, listFormFields } from '../../lib/pdf/operations'

export function FormsPanel() {
  const { t } = useTranslation()
  const { bytes, replaceBytes } = usePdf()
  const dispatch = usePdfDispatch()
  const [fields, setFields] = useState<{ name: string; type: string }[]>([])
  const [values, setValues] = useState<Record<string, string>>({})

  const loadFields = async () => {
    if (!bytes) return
    dispatch({ type: 'SET_BUSY', busy: true })
    try {
      const result = await listFormFields(bytes)
      setFields(result)
      setValues(Object.fromEntries(result.map((field) => [field.name, ''])))
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false })
    }
  }

  const fillAll = async () => {
    if (!bytes) return
    dispatch({ type: 'SET_BUSY', busy: true })
    try {
      let output = bytes
      for (const field of fields) {
        const value = values[field.name]
        if (!value) continue
        output = await fillFormField(output, field.name, value)
      }
      await replaceBytes(output)
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false })
    }
  }

  return (
    <Panel title={t('form.title')}>
      <Button variant="outline" disabled={!bytes} onClick={() => void loadFields()}>
        <Shield className="size-4" /> {t('form.scan')}
      </Button>
      {fields.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">{t('form.empty')}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {fields.map((field) => (
            <Field key={field.name} label={`${field.name} (${field.type})`}>
              <Input
                value={values[field.name] ?? ''}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
                }
              />
            </Field>
          ))}
          <Button variant="primary" onClick={() => void fillAll()}>
            {t('form.fillAll')}
          </Button>
        </div>
      )}
    </Panel>
  )
}
