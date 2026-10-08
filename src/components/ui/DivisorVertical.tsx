import { useEffect, useState, type KeyboardEvent, type PointerEvent } from 'react'

interface Props {
  /** Nome lido por leitores de tela, p. ex. "Largura do painel de pastas". */
  rotulo: string
  /** Chamado a cada movimento do ponteiro com a posição horizontal (clientX) dele. */
  aoArrastar: (clientX: number) => void
  /** Setas do teclado: -1 estreita o painel da esquerda, +1 alarga. */
  aoTeclar: (sentido: -1 | 1) => void
  /** Duplo clique: volta à largura de fábrica. */
  aoRestaurar: () => void
  className?: string
}

/** Lê um número guardado no navegador; sem o dado (ou sem acesso ao armazenamento), devolve o padrão. */
export function lerPreferencia(chave: string, padrao: number, min: number, max: number) {
  try {
    const bruto = window.localStorage.getItem(chave)
    const n = bruto === null ? NaN : Number(bruto)
    return Number.isFinite(n) && n >= min && n <= max ? n : padrao
  } catch {
    return padrao
  }
}

export function gravarPreferencia(chave: string, valor: number) {
  try {
    window.localStorage.setItem(chave, String(valor))
  } catch {
    // sem armazenamento (janela privada, dados bloqueados): a largura só vale nesta visita
  }
}

/**
 * Barra vertical que o usuário arrasta (mouse ou toque) para mudar a largura de um painel. Também
 * funciona pelo teclado (setas) e volta ao padrão com duplo clique.
 */
export function DivisorVertical({ rotulo, aoArrastar, aoTeclar, aoRestaurar, className = '' }: Props) {
  const [arrastando, setArrastando] = useState(false)

  // Enquanto arrasta, não deixa o texto da página ser selecionado e mantém o cursor de redimensionar.
  useEffect(() => {
    if (!arrastando) {
      return
    }
    const { userSelect, cursor } = document.body.style
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    return () => {
      document.body.style.userSelect = userSelect
      document.body.style.cursor = cursor
    }
  }, [arrastando])

  function iniciar(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setArrastando(true)
  }

  function mover(e: PointerEvent<HTMLDivElement>) {
    if (arrastando) {
      aoArrastar(e.clientX)
    }
  }

  function soltar(e: PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setArrastando(false)
  }

  function teclar(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      aoTeclar(e.key === 'ArrowLeft' ? -1 : 1)
    }
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={rotulo}
      title="Arraste para ajustar a largura (duplo clique restaura)"
      tabIndex={0}
      onPointerDown={iniciar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onLostPointerCapture={() => setArrastando(false)}
      onDoubleClick={aoRestaurar}
      onKeyDown={teclar}
      className={`group relative shrink-0 cursor-col-resize touch-none items-stretch justify-center focus-visible:outline-none ${className}`}
    >
      <span
        aria-hidden="true"
        className={`my-0.5 w-px rounded-full transition-all group-hover:w-0.5 group-hover:bg-brand-400 group-focus-visible:w-0.5 group-focus-visible:bg-brand-500 ${
          arrastando ? 'w-0.5 bg-brand-500' : 'bg-slate-200'
        }`}
      />
    </div>
  )
}
