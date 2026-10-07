import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  /** id do título dentro do popup, para o aria-labelledby. */
  idTitulo: string
  aoFechar: () => void
  /** Falso enquanto algo está sendo enviado: Esc e clique no fundo não fecham. */
  podeFechar?: boolean
  /** Classe de largura máxima do Tailwind. */
  larguraMax?: string
  children: ReactNode
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Popup centralizado sobre a página: fundo escurecido, Esc e clique fora fecham, o Tab não sai de
 * dentro, a rolagem da página fica travada e o foco volta a quem abriu.
 *
 * Fica no <body> por um portal: as páginas animam a entrada com transform, e um `fixed` dentro delas
 * ficaria preso ao container em vez de cobrir a tela.
 */
export function Modal({ idTitulo, aoFechar, podeFechar = true, larguraMax = 'max-w-md', children }: Props) {
  const dialogo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogo.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      anterior?.focus()
    }
  }, [])

  function aoTeclar(evento: KeyboardEvent) {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      if (podeFechar) {
        aoFechar()
      }
      return
    }

    if (evento.key === 'Tab' && dialogo.current) {
      const itens = Array.from(dialogo.current.querySelectorAll<HTMLElement>(FOCAVEIS))
      if (itens.length === 0) {
        return
      }
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && podeFechar) {
          aoFechar()
        }
      }}
    >
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onKeyDown={aoTeclar}
        className={`flex max-h-[90vh] w-full ${larguraMax} flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-surface shadow-card-hover outline-none animate-fade-in`}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
