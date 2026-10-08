import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ItemWorkflow, PastaN8n } from '../services/workflows'
import { RAIZ, itensDoNo, montarArvore, type NoPasta } from './pastas'
import {
  IconeArquivo,
  IconeCasa,
  IconeCheck,
  IconeMais,
  IconePasta,
  IconeSetaCima,
  IconeSetaDireita,
} from './ui/Icones'

interface Props {
  /** Nome da instância, que faz o papel de "Este computador" no início do caminho. */
  nomeRaiz: string
  itens: ItemWorkflow[]
  pastas: PastaN8n[]
  /** ID do workflow -> ID da pasta em que ele está. Workflow fora do mapa fica solto na raiz. */
  mapa: Record<string, string>
  /** IDs que já estão na lista de exportação. */
  jaAdicionados: Set<string>
  desabilitado: boolean
  aoAdicionar: (itens: ItemWorkflow[]) => void
}

type Linha =
  | { tipo: 'pasta'; chave: string; no: NoPasta }
  | { tipo: 'item'; chave: string; item: ItemWorkflow; nivel: number; filhos: ItemWorkflow[]; aberto: boolean }

/** Até quantas pastas o painel de navegação já abre inteiro; acima disso começa recolhido. */
const NAVEGACAO_ABRE_ATE = 60

/** Profundidade máxima dos sub-workflows abertos dentro de uma linha (evita descer em ciclos). */
const PROFUNDIDADE_SUBS = 4

const CLASSE_ACAO =
  'shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent'

/**
 * Resultado do filtro como o explorador de arquivos: o caminho em cima (instância / pasta / pasta / workflow),
 * o painel de pastas à esquerda e, à direita, o que há dentro da pasta aberta. Clicar numa pasta entra nela;
 * o botão de subir, o painel e o caminho levam de volta. Ocupa a altura que o painel dá (o conteúdo rola).
 *
 * Só aparece o que está no resultado do filtro: pasta sem nenhum workflow do filtro não é listada, e quem
 * está fora de pasta fica solto na raiz. Cada workflow mostra os sub-workflows que chama (setinha), que
 * podem ser adicionados junto ("com subs").
 */
export function ExploradorWorkflows({ nomeRaiz, itens, pastas, mapa, jaAdicionados, desabilitado, aoAdicionar }: Props) {
  const { porId } = useMemo(() => montarArvore(itens, pastas, mapa), [itens, pastas, mapa])
  const itemPorId = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens])
  const pastaPorId = useMemo(() => new Map(pastas.map((p) => [p.id, p])), [pastas])

  const [atual, setAtual] = useState(RAIZ)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [subsAbertos, setSubsAbertos] = useState<Set<string>>(new Set())
  const [navAbertas, setNavAbertas] = useState<Set<string>>(new Set())

  // Se a pasta aberta some do resultado (o filtro mudou), volta para a raiz.
  const idAtual = porId.has(atual) ? atual : RAIZ
  const noAtual = porId.get(idAtual)!

  /** IDs das pastas da raiz até a aberta, na ordem. */
  const caminho = useMemo(() => {
    const ids: string[] = []
    let id = idAtual
    for (let i = 0; id !== RAIZ && i < 30; i++) {
      ids.unshift(id)
      const pai = porId.get(id)?.pai
      id = pai && porId.has(pai) ? pai : RAIZ
    }
    return ids
  }, [idAtual, porId])

  // Painel de navegação: abre tudo quando é pequeno e sempre mantém aberto o caminho da pasta atual.
  useEffect(() => {
    const ids = [...porId.keys()].filter((id) => id !== RAIZ)
    setNavAbertas(new Set(ids.length <= NAVEGACAO_ABRE_ATE ? ids : []))
  }, [porId])
  useEffect(() => {
    setNavAbertas((atuais) => new Set([...atuais, ...caminho]))
  }, [caminho])

  /** Nomes das pastas da raiz até a pasta (pelo mapa completo, mesmo as que o filtro escondeu). */
  function nomesDaPasta(id: string | undefined): string[] {
    const nomes: string[] = []
    let p = id ? pastaPorId.get(id) : undefined
    for (let i = 0; p && i < 30; i++) {
      nomes.unshift(p.nome)
      p = p.pai ? pastaPorId.get(p.pai) : undefined
    }
    return nomes
  }

  function entrar(id: string) {
    setAtual(id)
    setSelecionado(null)
  }

  function subir() {
    const pai = noAtual.pai
    entrar(pai && porId.has(pai) ? pai : RAIZ)
  }

  function alternar(conjunto: Set<string>, id: string): Set<string> {
    const novo = new Set(conjunto)
    if (novo.has(id)) {
      novo.delete(id)
    } else {
      novo.add(id)
    }
    return novo
  }

  const linhas = useMemo(() => {
    const saida: Linha[] = []
    noAtual.pastas.forEach((no) => saida.push({ tipo: 'pasta', chave: 'p:' + no.id, no }))

    const linhaDe = (item: ItemWorkflow, nivel: number, descida: string[]) => {
      const filhos = (item.filhos ?? [])
        .filter((id) => id !== item.id && itemPorId.has(id) && !descida.includes(id))
        .map((id) => itemPorId.get(id)!)
      const aberto = subsAbertos.has(item.id) && filhos.length > 0 && nivel < PROFUNDIDADE_SUBS
      saida.push({ tipo: 'item', chave: 'i:' + [...descida, item.id].join('>'), item, nivel, filhos, aberto })
      if (aberto) {
        filhos.forEach((f) => linhaDe(f, nivel + 1, [...descida, item.id]))
      }
    }
    noAtual.itens.forEach((item) => linhaDe(item, 0, []))
    return saida
  }, [noAtual, subsAbertos, itemPorId])

  /** O workflow e tudo que ele chama, em cadeia (só o que está no resultado). */
  function comDescendentes(item: ItemWorkflow): ItemWorkflow[] {
    const vistos = new Map<string, ItemWorkflow>()
    const descer = (i: ItemWorkflow) => {
      if (vistos.has(i.id)) {
        return
      }
      vistos.set(i.id, i)
      ;(i.filhos ?? []).forEach((id) => {
        const f = itemPorId.get(id)
        if (f) {
          descer(f)
        }
      })
    }
    descer(item)
    return [...vistos.values()]
  }

  const selecionadoItem = selecionado ? itemPorId.get(selecionado) : undefined
  const aqui = itensDoNo(noAtual)
  const faltamAqui = aqui.filter((i) => !jaAdicionados.has(i.id))

  function renderNavegacao(no: NoPasta, nivel: number): ReactNode {
    const aberta = navAbertas.has(no.id)
    const ativa = no.id === idAtual
    return (
      <li key={no.id} role="treeitem" aria-selected={ativa} aria-expanded={no.pastas.length > 0 ? aberta : undefined}>
        <div
          className={`flex items-center gap-0.5 rounded-md pr-1 text-[13px] ${
            ativa ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
          }`}
          style={{ paddingLeft: 2 + nivel * 12 }}
        >
          {no.pastas.length > 0 ? (
            <button
              type="button"
              aria-label={aberta ? `Recolher ${no.nome}` : `Expandir ${no.nome}`}
              onClick={() => setNavAbertas((a) => alternar(a, no.id))}
              className="flex h-5 w-4 shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-800"
            >
              <span className={`h-3 w-3 transition-transform duration-150 ${aberta ? 'rotate-90' : ''}`}>
                <IconeSetaDireita />
              </span>
            </button>
          ) : (
            <span className="h-5 w-4 shrink-0" aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={() => entrar(no.id)}
            title={no.nome}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
          >
            <span className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true">
              <IconePasta />
            </span>
            <span className="truncate">{no.nome}</span>
            <span className="ml-auto pl-1 text-[11px] text-slate-400">{itensDoNo(no).length}</span>
          </button>
        </div>
        {aberta && no.pastas.length > 0 && (
          <ul role="group">{no.pastas.map((p) => renderNavegacao(p, nivel + 1))}</ul>
        )}
      </li>
    )
  }

  const raiz = porId.get(RAIZ)!

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Barra de caminho */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2">
        <button
          type="button"
          onClick={subir}
          disabled={idAtual === RAIZ}
          title="Subir um nível"
          aria-label="Subir um nível"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          <span className="h-4 w-4">
            <IconeSetaCima />
          </span>
        </button>

        <nav
          aria-label="Caminho"
          className="flex min-h-8 min-w-0 flex-1 flex-wrap items-center gap-x-1 rounded-md border border-slate-200/80 bg-slate-50/60 px-2 text-[13px]"
        >
          <button
            type="button"
            onClick={() => entrar(RAIZ)}
            className="flex items-center gap-1 rounded px-1 py-0.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <span className="h-3.5 w-3.5" aria-hidden="true">
              <IconeCasa />
            </span>
            {nomeRaiz || 'Instância'}
          </button>
          {caminho.map((id, i) => (
            <Fragment key={id}>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <button
                type="button"
                onClick={() => entrar(id)}
                aria-current={i === caminho.length - 1 && !selecionadoItem ? 'page' : undefined}
                className="max-w-[14rem] truncate rounded px-1 py-0.5 font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                {porId.get(id)?.nome}
              </button>
            </Fragment>
          ))}
          {selecionadoItem && (
            <>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="max-w-[18rem] truncate px-1 py-0.5 font-semibold text-brand-700" title={selecionadoItem.nome}>
                {selecionadoItem.nome}
              </span>
            </>
          )}
        </nav>

        <button
          type="button"
          disabled={desabilitado || faltamAqui.length === 0}
          onClick={() => aoAdicionar(aqui)}
          title={idAtual === RAIZ ? 'Adicionar todos os workflows do resultado' : 'Adicionar tudo o que está nesta pasta e nas de dentro'}
          className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          Adicionar tudo aqui{faltamAqui.length > 0 ? ` (${faltamAqui.length})` : ''}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Painel de navegação */}
        <aside
          aria-label="Pastas"
          className="hidden w-44 shrink-0 overflow-y-auto border-r border-slate-100 py-1.5 pr-1 lg:block"
        >
          <ul role="tree">
            <li role="treeitem" aria-selected={idAtual === RAIZ}>
              <button
                type="button"
                onClick={() => entrar(RAIZ)}
                className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] ${
                  idAtual === RAIZ ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-4 w-4 shrink-0" aria-hidden="true">
                  <IconeCasa />
                </span>
                <span className="truncate font-medium">Todas as pastas</span>
                <span className="ml-auto pl-1 text-[11px] text-slate-400">{itens.length}</span>
              </button>
              {raiz.pastas.length > 0 && <ul role="group">{raiz.pastas.map((p) => renderNavegacao(p, 1))}</ul>}
            </li>
          </ul>
        </aside>

        {/* Conteúdo da pasta aberta */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            <span>Nome</span>
            <span>Ações</span>
          </div>

          {linhas.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">Nada nesta pasta para o filtro atual.</p>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-slate-50 overflow-y-auto text-sm text-slate-600">
              {linhas.map((linha) => {
                if (linha.tipo === 'pasta') {
                  const { no } = linha
                  const todos = itensDoNo(no)
                  const faltam = todos.filter((i) => !jaAdicionados.has(i.id))
                  return (
                    <li
                      key={linha.chave}
                      onDoubleClick={() => entrar(no.id)}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50/80"
                    >
                      <button
                        type="button"
                        onClick={() => entrar(no.id)}
                        title={`Abrir ${no.nome}`}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true">
                          <IconePasta />
                        </span>
                        <span className="truncate font-medium text-slate-700">{no.nome}</span>
                        <span className="shrink-0 text-[11px] text-slate-400">
                          {todos.length} workflow{todos.length === 1 ? '' : 's'}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={desabilitado || faltam.length === 0}
                        onClick={() => aoAdicionar(todos)}
                        title={`Adicionar todos os workflows de ${no.nome} (${todos.length})`}
                        aria-label={`Adicionar todos os workflows da pasta ${no.nome}`}
                        className={CLASSE_ACAO}
                      >
                        pasta toda
                      </button>
                    </li>
                  )
                }

                const { item, nivel, filhos, aberto } = linha
                const jaAdicionado = jaAdicionados.has(item.id)
                const arvore = filhos.length > 0 ? comDescendentes(item) : []
                const faltamNaArvore = arvore.filter((i) => !jaAdicionados.has(i.id))
                const marcado = selecionado === item.id
                const dicaPasta = nivel > 0 ? nomesDaPasta(mapa[item.id]).join(' / ') : ''
                return (
                  <li
                    key={linha.chave}
                    aria-selected={marcado}
                    className={`flex items-center gap-2 px-3 py-1.5 ${marcado ? 'bg-brand-50/70' : 'hover:bg-slate-50/80'}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-1" style={{ paddingLeft: nivel * 20 }}>
                      {filhos.length > 0 ? (
                        <button
                          type="button"
                          aria-label={aberto ? `Recolher os sub-workflows de ${item.nome}` : `Mostrar os sub-workflows de ${item.nome}`}
                          onClick={() => setSubsAbertos((a) => alternar(a, item.id))}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                        >
                          <span className={`h-3.5 w-3.5 transition-transform duration-150 ${aberto ? 'rotate-90' : ''}`}>
                            <IconeSetaDireita />
                          </span>
                        </button>
                      ) : (
                        <span className="h-5 w-5 shrink-0" aria-hidden="true" />
                      )}
                      <button
                        type="button"
                        onClick={() => setSelecionado(marcado ? null : item.id)}
                        title={dicaPasta ? `${dicaPasta} / ${item.nome}` : item.nome}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true">
                          <IconeArquivo />
                        </span>
                        <span className="truncate">{item.nome}</span>
                        {item.comum && (
                          <span
                            className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500"
                            title="Chamado por um dos workflows do filtro (sub-workflow)"
                          >
                            comum
                          </span>
                        )}
                        {filhos.length > 0 && <span className="shrink-0 text-[11px] text-slate-400">chama {filhos.length}</span>}
                        {dicaPasta && <span className="hidden shrink-0 truncate text-[11px] text-slate-400 xl:inline">em {dicaPasta}</span>}
                      </button>
                    </div>
                    {filhos.length > 0 && (
                      <button
                        type="button"
                        disabled={desabilitado || faltamNaArvore.length === 0}
                        onClick={() => aoAdicionar(arvore)}
                        title={`Adicionar ${item.nome} com os sub-workflows (${arvore.length})`}
                        aria-label={`Adicionar ${item.nome} com os sub-workflows`}
                        className={CLASSE_ACAO}
                      >
                        com subs
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={jaAdicionado ? `${item.nome} já está na lista` : `Adicionar ${item.nome}`}
                      title={jaAdicionado ? `${item.nome} já está na lista` : `Adicionar ${item.nome}`}
                      onClick={() => aoAdicionar([item])}
                      disabled={jaAdicionado || desabilitado}
                      className="h-6 w-6 shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:text-emerald-500 disabled:hover:bg-transparent"
                    >
                      {jaAdicionado ? <IconeCheck /> : <IconeMais />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Barra de status, como a do explorador */}
          <p className="shrink-0 border-t border-slate-100 px-3 py-1.5 text-[12px] text-slate-400">
            {noAtual.pastas.length} pasta{noAtual.pastas.length === 1 ? '' : 's'} · {noAtual.itens.length} workflow
            {noAtual.itens.length === 1 ? '' : 's'} aqui · {aqui.length} no total
          </p>
        </div>
      </div>
    </div>
  )
}
