import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primario' | 'secundario'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

const ESTILOS: Record<Variante, string> = {
  primario:
    'bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:bg-indigo-300 disabled:cursor-not-allowed',
  secundario:
    'bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300 disabled:cursor-not-allowed',
}

export function Botao({ variante = 'primario', className = '', ...props }: Props) {
  return (
    <button
      className={`py-2 px-4 rounded-lg shadow-sm text-sm transition-colors duration-150 ${ESTILOS[variante]} ${className}`}
      {...props}
    />
  )
}
