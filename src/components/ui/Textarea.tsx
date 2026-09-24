import type { TextareaHTMLAttributes } from 'react'
import { CLASSE_ROTULO, MensagemCampo, classeControle } from './Campo'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string
  label: string
  erro?: string
  ajuda?: string
}

export function Textarea({ id, label, erro, ajuda, ...props }: Props) {
  return (
    <div>
      <label htmlFor={id} className={CLASSE_ROTULO}>
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined}
        className={`${classeControle(erro)} font-mono text-xs leading-relaxed`}
        {...props}
      />
      <MensagemCampo id={id} erro={erro} ajuda={ajuda} />
    </div>
  )
}
