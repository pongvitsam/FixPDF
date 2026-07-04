import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline'
  children: ReactNode
}

export function Button({ variant = 'ghost', className = '', children, ...props }: Props) {
  const styles =
    variant === 'primary'
      ? 'bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90'
      : variant === 'outline'
        ? 'border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--accent)]'
        : 'hover:bg-[var(--accent)]'

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${styles} disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Panel({
  title,
  children,
  className = '',
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm ${className}`}
    >
      {title ? <h2 className="mb-3 text-sm font-semibold">{title}</h2> : null}
      {children}
    </section>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      {children}
    </label>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
      {...props}
    />
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="min-h-24 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
      {...props}
    />
  )
}
