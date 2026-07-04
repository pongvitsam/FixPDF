import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { Button, Field, Input } from './ui'
import {
  cancelPasswordRequest,
  submitPassword,
  subscribePasswordPrompt,
} from '../lib/pdf/passwordPrompt'

export function PasswordDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(1)
  const [password, setPassword] = useState('')

  useEffect(() => {
    return subscribePasswordPrompt((request) => {
      if (!request) {
        setOpen(false)
        setPassword('')
        return
      }
      setReason(request.reason)
      setPassword('')
      setOpen(true)
    })
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-[var(--primary)]">
            <Lock className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">{t('security.passwordRequired')}</h2>
            <p className="text-xs text-[var(--muted)]">
              {reason === 2 ? t('security.incorrectPassword') : t('security.enterPassword')}
            </p>
          </div>
        </div>
        <Field label={t('toolkit.password')}>
          <Input
            autoFocus
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && password) submitPassword(password)
            }}
          />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              cancelPasswordRequest()
              setOpen(false)
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button variant="primary" disabled={!password} onClick={() => submitPassword(password)}>
            {t('security.unlock')}
          </Button>
        </div>
      </div>
    </div>
  )
}
