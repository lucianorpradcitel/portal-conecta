import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { IconeAtualizar, IconeLupa, IconeX } from './Icones'

/*
 * Peças visuais das telas de consulta (monitoramento, integrações, plataformas), para as três
 * terem a mesma cara: faixa de filtros cinza, cabeçalho fixo, linhas com hover e rodapé de contagem.
 */

/** Cor estável por plataforma: a mesma plataforma sempre cai na mesma cor, maiúscula ou não. */
const CORES_PLATAFORMA = [
  'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  'bg-sky-50 text-sky-700 ring-sky-600/20',
  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'bg-amber-50 text-amber-700 ring-amber-600/20',
  'bg-violet-50 text-violet-700 ring-violet-600/20',
  'bg-rose-50 text-rose-700 ring-rose-600/20',
]

function corDaPlataforma(nome: string): string {
  let hash = 0
  for (const letra of nome.toLowerCase()) {
    hash = (hash * 31 + letra.charCodeAt(0)) >>> 0
  }
  return CORES_PLATAFORMA[hash % CORES_PLATAFORMA.length]
}

export function EtiquetaPlataforma({ nome }: { nome?: string | null }) {
  if (!nome) {
    return <span className="text-slate-400">N/A</span>
  }
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${corDaPlataforma(nome)}`}
    >
      {nome}
    </span>
  )
}

export function EtiquetaSituacao({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        ativo
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
          : 'bg-slate-100 text-slate-600 ring-slate-500/20'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ativo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {ativo ? 'Ativa' : 'Inativa'}
    </span>
  )
}

/** Card da consulta: cabeçalho (título ou abas), faixa de filtros opcional e conteúdo. */
export function CartaoConsulta({
  cabecalho,
  filtros,
  rodape,
  children,
}: {
  cabecalho: ReactNode
  filtros?: ReactNode
  rodape?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        {cabecalho}
      </div>
      {filtros && <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">{filtros}</div>}
      {children}
      {rodape && (
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">{rodape}</div>
      )}
    </div>
  )
}

export function TituloConsulta({
  titulo,
  subtitulo,
  icone,
}: {
  titulo: string
  subtitulo?: string
  icone?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      {icone && (
        <div className="h-9 w-9 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <span className="h-[18px] w-[18px]">{icone}</span>
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold text-slate-800">{titulo}</h3>
        {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
      </div>
    </div>
  )
}

export function RodapeContagem({ visiveis, total }: { visiveis: number; total: number }) {
  return (
    <>
      Exibindo <strong className="font-semibold text-slate-700 tabular-nums">{visiveis}</strong> de{' '}
      <strong className="font-semibold text-slate-700 tabular-nums">{total}</strong> registros
    </>
  )
}

const CLASSE_CAMPO_FILTRO =
  'block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm placeholder:text-slate-400'

export function CampoBusca({
  onChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & { onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <span className="h-4 w-4">
          <IconeLupa />
        </span>
      </span>
      <input
        type="text"
        className={`${CLASSE_CAMPO_FILTRO} pl-9`}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </div>
  )
}

export function SelectFiltro({
  onChange,
  children,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & { onChange: (v: string) => void }) {
  return (
    <select
      className={`${CLASSE_CAMPO_FILTRO} ${props.value ? 'text-slate-800 font-medium' : 'text-slate-500'}`}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    >
      {children}
    </select>
  )
}

export function BotaoLimpar({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-red-600 hover:shadow-sm disabled:text-slate-300 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:cursor-not-allowed transition-colors duration-150"
    >
      <span className="h-4 w-4">
        <IconeX />
      </span>
      Limpar
    </button>
  )
}

export function BotaoAtualizar({ onClick, carregando }: { onClick: () => void; carregando: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={carregando}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors duration-150"
    >
      <span className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`}>
        <IconeAtualizar />
      </span>
      {carregando ? 'Atualizando…' : 'Atualizar'}
    </button>
  )
}

/** Tabela com cabeçalho fixo e rolagem interna. */
export function Tabela({
  colunas,
  children,
  alturaMaxima = 'max-h-[75vh]',
}: {
  colunas: { rotulo: string; className?: string }[]
  children: ReactNode
  alturaMaxima?: string
}) {
  return (
    <div className={`overflow-auto ${alturaMaxima}`}>
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_theme(colors.slate.200)]">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            {colunas.map((c, i) => (
              <th
                key={c.rotulo}
                className={`py-3 whitespace-nowrap ${i === 0 ? 'pl-5 pr-3' : i === colunas.length - 1 ? 'pl-3 pr-5' : 'px-3'} ${c.className ?? ''}`}
              >
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}

export function Linha({ children }: { children: ReactNode }) {
  return <tr className="align-top hover:bg-slate-50/80 transition-colors duration-100">{children}</tr>
}

/** Célula com o espaçamento da tabela. primeira/ultima alinham com o respiro lateral do card. */
export function Celula({
  children,
  primeira,
  ultima,
  className = '',
}: {
  children: ReactNode
  primeira?: boolean
  ultima?: boolean
  className?: string
}) {
  return (
    <td className={`py-3 ${primeira ? 'pl-5 pr-3' : ultima ? 'pl-3 pr-5' : 'px-3'} ${className}`}>
      {children}
    </td>
  )
}

export function Codigo({ children }: { children: ReactNode }) {
  return <span className="font-mono text-xs font-medium text-indigo-700">{children}</span>
}

export function EstadoVazio({
  icone,
  titulo,
  texto,
  tom = 'neutro',
  acao,
}: {
  icone: ReactNode
  titulo?: string
  texto: string
  tom?: 'neutro' | 'sucesso' | 'erro'
  acao?: ReactNode
}) {
  const cores = {
    neutro: 'bg-slate-100 text-slate-400',
    sucesso: 'bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50',
    erro: 'bg-red-50 text-red-600 ring-8 ring-red-50/50',
  }[tom]
  return (
    <div className="px-5 py-14 flex flex-col items-center text-center">
      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${cores}`}>
        <span className="h-6 w-6">{icone}</span>
      </div>
      {titulo && <h4 className="mt-4 text-base font-semibold text-slate-800">{titulo}</h4>}
      <p className={`${titulo ? 'mt-1' : 'mt-4'} text-sm text-slate-500 max-w-md`}>{texto}</p>
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}

export function Carregando({ texto = 'Carregando dados…' }: { texto?: string }) {
  return (
    <div className="p-14 flex flex-col items-center gap-3 text-slate-500">
      <div className="h-9 w-9 rounded-full border-[3px] border-slate-200 border-t-indigo-600 animate-spin" />
      <p className="text-sm font-medium">{texto}</p>
    </div>
  )
}
