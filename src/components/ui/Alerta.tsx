import type { ReactNode } from 'react'
import { IconeAlerta, IconeAviso, IconeCheckCirculo } from './Icones'

type Tom = 'erro' | 'aviso' | 'sucesso'

const ESTILOS: Record<Tom, { caixa: string; icone: string; titulo: string; texto: string }> = {
  erro: {
    caixa: 'bg-red-50/70 ring-red-600/15',
    icone: 'text-red-500',
    titulo: 'text-red-900',
    texto: 'text-red-700',
  },
  aviso: {
    caixa: 'bg-amber-50/80 ring-amber-600/20',
    icone: 'text-amber-500',
    titulo: 'text-amber-900',
    texto: 'text-amber-800',
  },
  sucesso: {
    caixa: 'bg-emerald-50/70 ring-emerald-600/15',
    icone: 'text-emerald-500',
    titulo: 'text-emerald-900',
    texto: 'text-emerald-700',
  },
}

const ICONES: Record<Tom, () => JSX.Element> = {
  erro: IconeAlerta,
  aviso: IconeAviso,
  sucesso: IconeCheckCirculo,
}

export function Alerta({ tom, titulo, children }: { tom: Tom; titulo?: string; children?: ReactNode }) {
  const e = ESTILOS[tom]
  const Icone = ICONES[tom]
  return (
    <div role={tom === 'erro' ? 'alert' : 'status'} className={`flex gap-3 rounded-lg p-3.5 ring-1 ring-inset animate-fade-in ${e.caixa}`}>
      <span className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${e.icone}`}>
        <Icone />
      </span>
      <div className="min-w-0 text-sm leading-relaxed">
        {titulo && <p className={`font-semibold ${e.titulo}`}>{titulo}</p>}
        {children && <div className={`${titulo ? 'mt-0.5' : ''} ${e.texto}`}>{children}</div>}
      </div>
    </div>
  )
}
