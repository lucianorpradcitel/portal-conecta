import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primario' | 'secundario'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

const ESTILOS: Record<Variante, string> = {
  primario:
    'bg-ink-900 text-white shadow-[0_1px_2px_rgb(16_24_40/0.2),inset_0_1px_0_rgb(255_255_255/0.08)] hover:bg-ink-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none',
  secundario:
    'bg-white text-slate-700 shadow-soft border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:text-slate-400 disabled:hover:bg-white',
}

export function Botao({ variante = 'primario', className = '', ...props }: Props) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 disabled:cursor-not-allowed disabled:active:scale-100 ${ESTILOS[variante]} ${className}`}
      {...props}
    />
  )
}
