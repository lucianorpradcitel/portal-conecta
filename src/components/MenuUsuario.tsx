import { IconeSair } from './ui/Icones'

interface Props {
  /** Subject do token: o e-mail do Workspace (ou o usuário, no login de desenvolvimento). */
  usuario: string | null
  aoSair: () => void
  /** Só o avatar e o botão de sair, para a barra do celular. */
  compacto?: boolean
}

/** "luciano.junior@citel..." vira "Luciano Junior" e "LJ". */
function apresentar(usuario: string): { nome: string; iniciais: string } {
  const partes = usuario
    .split('@')[0]
    .split(/[._\s-]+/)
    .filter(Boolean)
  const nome = partes.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
  const iniciais = (partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : partes[0]?.slice(0, 2) ?? '?')
  return { nome: nome || usuario, iniciais: iniciais.toUpperCase() }
}

export function MenuUsuario({ usuario, aoSair, compacto = false }: Props) {
  const { nome, iniciais } = apresentar(usuario ?? '')
  const email = usuario?.includes('@') ? usuario : null

  return (
    <div className="group flex items-center gap-3 rounded-lg p-2 transition-colors duration-150 hover:bg-white/[0.04]">
      <span
        title={compacto ? nome : undefined}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-300 ring-1 ring-inset ring-brand-400/30 transition-transform duration-200 group-hover:scale-105"
      >
        {iniciais}
      </span>

      {!compacto && (
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium text-white">{nome}</p>
          {email && <p className="mt-0.5 truncate text-xs text-slate-500">{email}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={aoSair}
        title="Sair"
        aria-label="Sair"
        className="shrink-0 rounded-md p-2 text-slate-400 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <span className="block h-4 w-4">
          <IconeSair />
        </span>
      </button>
    </div>
  )
}
