import type { SelectHTMLAttributes } from 'react'
import { CLASSE_ROTULO, MensagemCampo, classeControle } from './Campo'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string
  label: string
  erro?: string
}

export function Select({ id, label, erro, children, ...props }: Props) {
  return (
    <div>
      <label htmlFor={id} className={CLASSE_ROTULO}>
        {label}
      </label>
      <select
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={`h-10 text-sm ${classeControle(erro)}`}
        {...props}
      >
        {children}
      </select>
      <MensagemCampo id={id} erro={erro} />
    </div>
  )
}
