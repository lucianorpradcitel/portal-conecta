import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  erro?: string
  ajuda?: string
}

/** Visual compartilhado por Campo, Select e Textarea. */
export const CLASSE_ROTULO = 'block text-[13px] font-medium text-slate-700'

export function classeControle(erro?: string): string {
  return `mt-1.5 block w-full rounded-lg bg-surface text-slate-900 shadow-soft placeholder:text-slate-400 transition duration-150 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
    erro
      ? 'border-red-300 hover:border-red-400 focus:border-red-500 focus:ring-red-500/15'
      : 'border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-brand-500/15 disabled:hover:border-slate-200'
  }`
}

export function MensagemCampo({ id, erro, ajuda }: { id: string; erro?: string; ajuda?: string }) {
  if (erro) {
    return (
      <p id={`${id}-erro`} className="mt-1.5 text-[13px] font-medium text-red-600">
        {erro}
      </p>
    )
  }
  if (ajuda) {
    return (
      <p id={`${id}-ajuda`} className="mt-1.5 text-[13px] text-slate-500">
        {ajuda}
      </p>
    )
  }
  return null
}

export function Campo({ id, label, erro, ajuda, ...props }: Props) {
  return (
    <div>
      <label htmlFor={id} className={CLASSE_ROTULO}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined}
        className={`h-10 text-sm ${classeControle(erro)}`}
        {...props}
      />
      <MensagemCampo id={id} erro={erro} ajuda={ajuda} />
    </div>
  )
}
