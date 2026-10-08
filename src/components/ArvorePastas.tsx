import { useEffect, useMemo, useState } from 'react'
import type { ItemWorkflow, PastaN8n } from '../services/workflows'
import { IconeCheck, IconeMais, IconePasta, IconeSetaDireita } from './ui/Icones'

interface Props {
  itens: ItemWorkflow[]
  pastas: PastaN8n[]
  /** ID do workflow -> ID da pasta em que ele está. Workflow fora do mapa está na raiz do projeto. */
  mapa: Record<string, string>
  /** IDs que já estão na lista de exportação. */
  jaAdicionados: Set<string>
  desabilitado: boolean
  aoAdicionar: (itens: ItemWorkflow[]) => void
}

interface NoPasta {
  id: string
  nome: string
  pastas: NoPasta[]
  itens: ItemWorkflow[]
}

type Linha =
  | { tipo: 'pasta'; chave: string; no: NoPasta; nivel: number; aberta: boolean; total: number }
  | { tipo: 'item'; chave: string; item: ItemWorkflow; nivel: number }

/** Até quantos workflows a árvore já abre inteira; acima disso começa só com as pastas de topo. */
const ABRIR_TUDO_ATE = 60

const ESPACO_NIVEL = 18
const RECUO_BASE = 12
const ID_SEM_PASTA = '__sem_pasta__'

function porNome<T extends { nome: string }>(a: T, b: T) {
  return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base', numeric: true })
}

/** Todos os workflows de uma pasta e das que estão dentro dela. */
function itensDe(no: NoPasta): ItemWorkflow[] {
  return [...no.itens, ...no.pastas.flatMap(itensDe)]
}

/**
 * Resultado do filtro organizado nas pastas do n8n, como o explorador de arquivos do VS Code. A árvore
 * é montada com o resultado: pasta sem nenhum workflow do filtro não aparece, e quem está fora de
 * qualquer pasta fica em "(sem pasta)".
 */
export function ArvorePastas({ itens, pastas, mapa, jaAdicionados, desabilitado, aoAdicionar }: Props) {
  const raizes = useMemo(() => {
    const nos = new Map<string, NoPasta>(pastas.map((p) => [p.id, { id: p.id, nome: p.nome, pastas: [], itens: [] }]))
    const soltos: ItemWorkflow[] = []
    for (const item of itens) {
      const pasta = nos.get(mapa[item.id])
      if (pasta) {
        pasta.itens.push(item)
      } else {
        soltos.push(item)
      }
    }

    const topo: NoPasta[] = []
    for (const p of pastas) {
      const no = nos.get(p.id)!
      const pai = p.pai ? nos.get(p.pai) : undefined
      if (pai) {
        pai.pastas.push(no)
      } else {
        topo.push(no)
      }
    }

    // Pasta sem workflow do filtro, em qualquer nível abaixo dela, sai da árvore.
    const podar = (no: NoPasta): NoPasta | null => {
      no.pastas = no.pastas.map(podar).filter((x): x is NoPasta => x !== null).sort(porNome)
      no.itens.sort((a, b) => porNome({ nome: a.nome }, { nome: b.nome }))
      return no.itens.length > 0 || no.pastas.length > 0 ? no : null
    }
    const arvore = topo.map(podar).filter((x): x is NoPasta => x !== null).sort(porNome)

    if (soltos.length > 0) {
      arvore.push({ id: ID_SEM_PASTA, nome: '(sem pasta)', pastas: [], itens: soltos.sort((a, b) => porNome({ nome: a.nome }, { nome: b.nome })) })
    }
    return arvore
  }, [itens, pastas, mapa])

  const idsDePastas = useMemo(() => {
    const ids: string[] = []
    const colher = (no: NoPasta) => {
      ids.push(no.id)
      no.pastas.forEach(colher)
    }
    raizes.forEach(colher)
    return ids
  }, [raizes])

  const [abertas, setAbertas] = useState<Set<string>>(new Set())

  // A cada resultado novo, abre tudo se for pequeno e deixa só as pastas de topo se for grande.
  useEffect(() => {
    setAbertas(new Set(itens.length <= ABRIR_TUDO_ATE ? idsDePastas : []))
  }, [itens, idsDePastas])

  const linhas = useMemo(() => {
    const saida: Linha[] = []
    const percorrer = (no: NoPasta, nivel: number) => {
      const aberta = abertas.has(no.id)
      saida.push({ tipo: 'pasta', chave: 'p:' + no.id, no, nivel, aberta, total: itensDe(no).length })
      if (aberta) {
        no.pastas.forEach((p) => percorrer(p, nivel + 1))
        no.itens.forEach((item) => saida.push({ tipo: 'item', chave: 'i:' + no.id + ':' + item.id, item, nivel: nivel + 1 }))
      }
    }
    raizes.forEach((r) => percorrer(r, 0))
    return saida
  }, [raizes, abertas])

  function alternar(id: string) {
    setAbertas((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) {
        novo.delete(id)
      } else {
        novo.add(id)
      }
      return novo
    })
  }

  const guias = (nivel: number) =>
    Array.from({ length: nivel }, (_, k) => (
      <span
        key={k}
        aria-hidden="true"
        className="absolute bottom-0 top-0 w-px bg-slate-200"
        style={{ left: RECUO_BASE + k * ESPACO_NIVEL + 7 }}
      />
    ))

  return (
    <div>
      <div className="flex items-center justify-end gap-3 border-b border-slate-100 px-4 py-1.5 text-[13px]">
        <button
          type="button"
          className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
          onClick={() => setAbertas(new Set(idsDePastas))}
        >
          Expandir tudo
        </button>
        <button
          type="button"
          className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
          onClick={() => setAbertas(new Set())}
        >
          Recolher tudo
        </button>
      </div>

      <ul role="tree" className="max-h-72 overflow-y-auto text-sm text-slate-600">
        {linhas.map((linha) => {
          if (linha.tipo === 'pasta') {
            const { no, nivel, aberta, total } = linha
            const todos = itensDe(no)
            const faltam = todos.filter((i) => !jaAdicionados.has(i.id))
            return (
              <li
                key={linha.chave}
                role="treeitem"
                aria-level={nivel + 1}
                aria-expanded={aberta}
                className="relative flex items-center gap-1 py-1 pr-3 hover:bg-slate-50/80"
                style={{ paddingLeft: RECUO_BASE + nivel * ESPACO_NIVEL }}
              >
                {guias(nivel)}
                <button
                  type="button"
                  aria-label={aberta ? `Recolher a pasta ${no.nome}` : `Expandir a pasta ${no.nome}`}
                  onClick={() => alternar(no.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                >
                  <span className={`h-3.5 w-3.5 transition-transform duration-150 ${aberta ? 'rotate-90' : ''}`}>
                    <IconeSetaDireita />
                  </span>
                </button>
                <span className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true">
                  <IconePasta />
                </span>
                <button
                  type="button"
                  onClick={() => alternar(no.id)}
                  className="min-w-0 flex-1 truncate text-left font-medium text-slate-700"
                  title={no.nome}
                >
                  {no.nome}
                  <span className="ml-2 text-[11px] font-normal text-slate-400">{total}</span>
                </button>
                <button
                  type="button"
                  disabled={desabilitado || faltam.length === 0}
                  onClick={() => aoAdicionar(todos)}
                  title={`Adicionar todos os workflows de ${no.nome} (${todos.length})`}
                  aria-label={`Adicionar todos os workflows da pasta ${no.nome}`}
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                >
                  pasta toda
                </button>
              </li>
            )
          }

          const { item, nivel } = linha
          const jaAdicionado = jaAdicionados.has(item.id)
          return (
            <li
              key={linha.chave}
              role="treeitem"
              aria-level={nivel + 1}
              className="relative flex items-center gap-1 py-1 pr-3 hover:bg-slate-50/80"
              style={{ paddingLeft: RECUO_BASE + nivel * ESPACO_NIVEL }}
            >
              {guias(nivel)}
              <span className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate" title={item.nome}>
                {item.nome}
                {item.comum && (
                  <span
                    className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500"
                    title="Chamado por um dos workflows do filtro (sub-workflow)"
                  >
                    comum
                  </span>
                )}
              </span>
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
    </div>
  )
}
