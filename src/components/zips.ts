import type { ItemWorkflow } from '../services/workflows'

interface NoZip {
  filhos: Map<string, NoZip>
  /** Workflows que estão direto nesta pasta (ou soltos, no nó raiz). */
  itens: ItemWorkflow[]
}

const comparar = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true })

/**
 * Divide a lista de exportação em ZIPs que respeitam as pastas do n8n.
 *
 * - Uma pasta (com tudo o que há dentro dela) nunca é dividida entre dois ZIPs enquanto couber em um. Se a pasta
 *   atual do ZIP não cabe mais, ela inteira vai para o próximo.
 * - Pasta grande demais para um ZIP é aberta nas subpastas, e cada subpasta segue a mesma regra.
 * - Só um conjunto de workflows de uma mesma pasta que, sozinho, não cabe em um ZIP é separado, em ordem de nome.
 * - A ordem é a do explorador: subpastas por nome e, depois, os workflows que estão direto na pasta.
 *
 * `caminhoDe` devolve as pastas da raiz até a do workflow (vazio se está solto) e `cabe` diz se um conjunto cabe
 * em um ZIP (limite de workflows e de tamanho do pedido).
 */
export function dividirEmZips(
  itens: ItemWorkflow[],
  caminhoDe: (id: string) => string[],
  cabe: (itens: ItemWorkflow[]) => boolean,
): ItemWorkflow[][] {
  const raiz: NoZip = { filhos: new Map(), itens: [] }
  for (const item of itens) {
    let no = raiz
    for (const pasta of caminhoDe(item.id)) {
      let filho = no.filhos.get(pasta)
      if (!filho) {
        filho = { filhos: new Map(), itens: [] }
        no.filhos.set(pasta, filho)
      }
      no = filho
    }
    no.itens.push(item)
  }

  const subpastas = (no: NoZip) => [...no.filhos.entries()].sort(([a], [b]) => comparar(a, b)).map(([, filho]) => filho)
  const ordenar = (lista: ItemWorkflow[]) => [...lista].sort((a, b) => comparar(a.nome, b.nome))

  /** Tudo o que há no nó, na ordem do explorador. */
  const tudoDe = (no: NoZip): ItemWorkflow[] => [...subpastas(no).flatMap(tudoDe), ...ordenar(no.itens)]

  /** Quebra uma lista em pedaços que cabem, só quando não há outro jeito (uma pasta sozinha grande demais). */
  const separar = (lista: ItemWorkflow[]): ItemWorkflow[][] => {
    const pedacos: ItemWorkflow[][] = []
    let atual: ItemWorkflow[] = []
    for (const item of ordenar(lista)) {
      if (atual.length > 0 && !cabe([...atual, item])) {
        pedacos.push(atual)
        atual = []
      }
      atual.push(item)
    }
    if (atual.length > 0) {
      pedacos.push(atual)
    }
    return pedacos
  }

  /** Blocos indivisíveis: o maior pedaço da árvore que cabe num ZIP, descendo só quando não cabe. */
  const blocosDe = (no: NoZip): ItemWorkflow[][] => {
    const tudo = tudoDe(no)
    if (tudo.length === 0) {
      return []
    }
    if (cabe(tudo)) {
      return [tudo]
    }
    return [...subpastas(no).flatMap(blocosDe), ...(no.itens.length > 0 ? separar(no.itens) : [])]
  }

  const zips: ItemWorkflow[][] = []
  let atual: ItemWorkflow[] = []
  for (const bloco of blocosDe(raiz)) {
    if (atual.length > 0 && !cabe([...atual, ...bloco])) {
      zips.push(atual)
      atual = []
    }
    atual = [...atual, ...bloco]
  }
  if (atual.length > 0) {
    zips.push(atual)
  }
  return zips
}
