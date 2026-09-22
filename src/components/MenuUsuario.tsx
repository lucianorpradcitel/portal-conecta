import { IconeSair } from './ui/Icones'

interface Props {
  /** Subject do token: o e-mail do Workspace (ou o usuário, no login de desenvolvimento). */
  usuario: string | null
  aoSair: () => void
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

export function MenuUsuario({ usuario, aoSair }: Props) {
  const { nome, iniciais } = apresentar(usuario ?? '')
  const email = usuario?.includes('@') ? usuario : null

  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1 shadow-sm">
      <div className="flex items-center gap-2.5 pr-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
          {iniciais}
        </span>
        <div className="hidden sm:block leading-tight">
          <p className="text-sm font-medium text-slate-800">{nome}</p>
          {email && <p className="text-xs text-slate-400">{email}</p>}
        </div>
      </div>

      <span className="h-6 w-px bg-slate-200" aria-hidden="true" />

      <button
        type="button"
        onClick={aoSair}
        title="Sair"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
      >
        <span className="h-4 w-4">
          <IconeSair />
        </span>
        Sair
      </button>
    </div>
  )
}
