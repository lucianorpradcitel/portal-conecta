import type { ItemWorkflow, PastaN8n } from '../services/workflows'

/** ID da raiz virtual: onde ficam as pastas de topo e os workflows que não estão em nenhuma pasta. */
export const RAIZ = '__raiz__'

export interface NoPasta {
  id: string
  nome: string
  /** ID da pasta-mãe; nulo nas pastas de topo e na raiz. */
  pai: string | null
  pastas: NoPasta[]
  itens: ItemWorkflow[]
}

export interface ArvoreDePastas {
  raiz: NoPasta
  /** Todas as pastas da árvore (e a raiz, em RAIZ), para achar uma pelo ID. */
  porId: Map<string, NoPasta>
}

export function porNome<T extends { nome: string }>(a: T, b: T) {
  return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base', numeric: true })
}

/** Todos os workflows de uma pasta e das que estão dentro dela. */
export function itensDoNo(no: NoPasta): ItemWorkflow[] {
  return [...no.itens, ...no.pastas.flatMap(itensDoNo)]
}

/**
 * Organiza o resultado do filtro nas pastas do n8n. Só entram as pastas que têm algum workflow do filtro,
 * em qualquer nível abaixo delas; quem está fora de pasta fica direto na raiz, como arquivos soltos.
 */
export function montarArvore(
  itens: ItemWorkflow[],
  pastas: PastaN8n[],
  mapa: Record<string, string>,
): ArvoreDePastas {
  const nos = new Map<string, NoPasta>(
    pastas.map((p) => [p.id, { id: p.id, nome: p.nome, pai: p.pai, pastas: [], itens: [] }]),
  )
  const raiz: NoPasta = { id: RAIZ, nome: '', pai: null, pastas: [], itens: [] }

  for (const item of itens) {
    const pasta = nos.get(mapa[item.id])
    ;(pasta ?? raiz).itens.push(item)
  }
  for (const p of pastas) {
    const no = nos.get(p.id)!
    const pai = p.pai ? nos.get(p.pai) : undefined
    ;(pai ?? raiz).pastas.push(no)
  }

  // Pasta sem nenhum workflow do filtro, em qualquer nível abaixo dela, sai da árvore.
  const podar = (no: NoPasta): boolean => {
    no.pastas = no.pastas.filter(podar).sort(porNome)
    no.itens.sort(porNome)
    return no.itens.length > 0 || no.pastas.length > 0
  }
  podar(raiz)

  const porId = new Map<string, NoPasta>([[RAIZ, raiz]])
  const colher = (no: NoPasta) => {
    no.pastas.forEach((p) => {
      porId.set(p.id, p)
      colher(p)
    })
  }
  colher(raiz)
  return { raiz, porId }
}
