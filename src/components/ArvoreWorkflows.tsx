import { useEffect, useMemo, useState } from 'react'
import type { ItemWorkflow } from '../services/workflows'
import { IconeCheck, IconeMais, IconeSetaDireita } from './ui/Icones'

interface Props {
  itens: ItemWorkflow[]
  /** IDs que já estão na lista de exportação. */
  jaAdicionados: Set<string>
  desabilitado: boolean
  aoAdicionar: (itens: ItemWorkflow[]) => void
}

interface Linha {
  chave: string
  item: ItemWorkflow
  nivel: number
  filhos: ItemWorkflow[]
  aberto: boolean
}

/** Até quantas linhas a árvore já abre inteira; acima disso começa recolhida para não virar uma parede. */
const ABRIR_TUDO_ATE = 60

const ESPACO_NIVEL = 18
const RECUO_BASE = 12

/**
 * Árvore de workflows do filtro: cada workflow mostra por baixo os sub-workflows que ele chama, como o
 * explorador de arquivos do VS Code. Um sub-workflow chamado por vários aparece embaixo de cada um deles.
 *
 * Só entram na árvore os workflows que estão no resultado: um sub-workflow fora do filtro não aparece
 * (a caixa "Incluir os workflows comuns" é o que traz os sub-workflows para dentro do resultado).
 */
export function ArvoreWorkflows({ itens, jaAdicionados, desabilitado, aoAdicionar }: Props) {
  const { raizes, porId } = useMemo(() => {
    const porId = new Map(itens.map((i) => [i.id, i]))
    const filhosDe = (i: ItemWorkflow) => (i.filhos ?? []).filter((id) => id !== i.id && porId.has(id))

    // Raiz é quem nenhum outro do resultado chama. Num ciclo (A chama B, B chama A) ninguém seria raiz:
    // o que não for alcançado a partir das raízes entra como raiz também.
    const chamados = new Set(itens.flatMap(filhosDe))
    const raizes = itens.filter((i) => !chamados.has(i.id))
    const alcancados = new Set<string>()
    const visitar = (i: ItemWorkflow) => {
      if (alcancados.has(i.id)) {
        return
      }
      alcancados.add(i.id)
      filhosDe(i).forEach((id) => visitar(porId.get(id)!))
    }
    raizes.forEach(visitar)
    itens.forEach((i) => {
      if (!alcancados.has(i.id)) {
        raizes.push(i)
        visitar(i)
      }
    })
    return { raizes, porId }
  }, [itens])

  const comFilhos = useMemo(
    () => itens.filter((i) => (i.filhos ?? []).some((id) => id !== i.id && porId.has(id))).map((i) => i.id),
    [itens, porId],
  )

  const [abertos, setAbertos] = useState<Set<string>>(new Set())

  // A cada resultado novo, abre tudo se for pequeno e recolhe se for grande.
  useEffect(() => {
    setAbertos(new Set(itens.length <= ABRIR_TUDO_ATE ? comFilhos : []))
  }, [itens, comFilhos])

  const linhas = useMemo(() => {
    const saida: Linha[] = []
    const percorrer = (item: ItemWorkflow, nivel: number, caminho: string[]) => {
      const filhos = (item.filhos ?? [])
        .filter((id) => id !== item.id && porId.has(id) && !caminho.includes(id))
        .map((id) => porId.get(id)!)
      const aberto = abertos.has(item.id)
      saida.push({ chave: [...caminho, item.id].join('>'), item, nivel, filhos, aberto })
      if (aberto) {
        filhos.forEach((f) => percorrer(f, nivel + 1, [...caminho, item.id]))
      }
    }
    raizes.forEach((r) => percorrer(r, 0, []))
    return saida
  }, [raizes, porId, abertos])

  function alternar(id: string) {
    setAbertos((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) {
        novo.delete(id)
      } else {
        novo.add(id)
      }
      return novo
    })
  }

  /** O workflow e tudo que ele chama, em cadeia. */
  function comDescendentes(item: ItemWorkflow): ItemWorkflow[] {
    const vistos = new Map<string, ItemWorkflow>()
    const descer = (i: ItemWorkflow) => {
      if (vistos.has(i.id)) {
        return
      }
      vistos.set(i.id, i)
      ;(i.filhos ?? []).forEach((id) => {
        const f = porId.get(id)
        if (f) {
          descer(f)
        }
      })
    }
    descer(item)
    return [...vistos.values()]
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {comFilhos.length > 0 && (
        <div className="flex shrink-0 items-center justify-end gap-3 border-b border-slate-100 px-4 py-1.5 text-[13px]">
          <button
            type="button"
            className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            onClick={() => setAbertos(new Set(comFilhos))}
          >
            Expandir tudo
          </button>
          <button
            type="button"
            className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            onClick={() => setAbertos(new Set())}
          >
            Recolher tudo
          </button>
        </div>
      )}

      <ul role="tree" className="min-h-0 flex-1 overflow-y-auto text-sm text-slate-600">
        {linhas.map(({ chave, item, nivel, filhos, aberto }) => {
          const jaAdicionado = jaAdicionados.has(item.id)
          const arvore = filhos.length > 0 ? comDescendentes(item) : []
          const faltamNaArvore = arvore.filter((i) => !jaAdicionados.has(i.id))
          return (
            <li
              key={chave}
              role="treeitem"
              aria-level={nivel + 1}
              aria-expanded={filhos.length > 0 ? aberto : undefined}
              className="group relative flex items-center gap-1 py-1 pr-3 hover:bg-slate-50/80"
              style={{ paddingLeft: RECUO_BASE + nivel * ESPACO_NIVEL }}
            >
              {/* Guias verticais, uma por nível, como no explorador do VS Code. */}
              {Array.from({ length: nivel }, (_, k) => (
                <span
                  key={k}
                  aria-hidden="true"
                  className="absolute bottom-0 top-0 w-px bg-slate-200"
                  style={{ left: RECUO_BASE + k * ESPACO_NIVEL + 7 }}
                />
              ))}

              {filhos.length > 0 ? (
                <button
                  type="button"
                  aria-label={aberto ? `Recolher ${item.nome}` : `Expandir ${item.nome}`}
                  onClick={() => alternar(item.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                >
                  <span className={`h-3.5 w-3.5 transition-transform duration-150 ${aberto ? 'rotate-90' : ''}`}>
                    <IconeSetaDireita />
                  </span>
                </button>
              ) : (
                <span className="h-5 w-5 shrink-0" aria-hidden="true" />
              )}

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
                {filhos.length > 0 && !aberto && (
                  <span className="ml-2 text-[11px] text-slate-400">{filhos.length} sub</span>
                )}
              </span>

              {filhos.length > 0 && (
                <button
                  type="button"
                  disabled={desabilitado || faltamNaArvore.length === 0}
                  onClick={() => aoAdicionar(arvore)}
                  title={`Adicionar ${item.nome} com os sub-workflows (${arvore.length})`}
                  aria-label={`Adicionar ${item.nome} com os sub-workflows`}
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
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
    </div>
  )
}
