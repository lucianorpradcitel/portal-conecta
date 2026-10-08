import { apiBaixar, apiGet } from './api'

/**
 * Exportação de workflows do n8n. Quem fala com as instâncias é o webhook `portal-wf` do n8n
 * (workflow Portal_WF_Exportar): ele repete a checagem de acesso e usa a credencial de cada
 * instância, que nunca chega ao navegador. A tela só escolhe a instância por apelido.
 *
 * Os nomes seguem o padrão Cliente_Base_Etapa (ex.: LAB_Mercos_Pedido_Captura): o cliente é a
 * parte antes do primeiro "_" e a base é a segunda parte.
 */

const BASE_WF = '/wf'

/**
 * Como cada instância nomeia os workflows. A produção segue Categoria_Plataforma_Etapa e as demais
 * (automaker_1, dev) seguem Cliente_Base_Etapa; o n8n informa isto junto com a lista de instâncias e a
 * tela usa nos dois filtros. Por dentro, o primeiro filtro é sempre `cliente` e o segundo `base`.
 */
export interface RotulosFiltro {
  padrao: string
  primeiro: string
  todosPrimeiro: string
  ajudaPrimeiro: string
  segundo: string
  todosSegundo: string
  ajudaSegundo: string
}

/** Vale quando o n8n não informa os rótulos (workflow antigo): o padrão da produção. */
export const ROTULOS_PADRAO: RotulosFiltro = {
  padrao: 'Categoria_Plataforma_Etapa',
  primeiro: 'Categoria do workflow',
  todosPrimeiro: 'Todas as categorias',
  ajudaPrimeiro: 'Primeira parte do nome (ex.: MASTER, LAB).',
  segundo: 'Plataforma',
  todosSegundo: 'Todas as plataformas',
  ajudaSegundo: 'Segunda parte do nome (ex.: Tray, Mercos).',
}

export interface InstanciaN8n {
  id: string
  nome: string
  rotulos?: RotulosFiltro
}

export interface OpcaoFiltro {
  nome: string
  total: number
}

export interface Filtros {
  cliente: string
  base: string
  /** Trecho que o nome do workflow precisa conter. */
  busca: string
  /** Com algum filtro ativo, junta os workflows comuns: os sub-workflows que os encontrados chamam. */
  comuns: boolean
}

/** Um workflow da instância. O ID é o que identifica: o n8n aceita nomes repetidos. */
export interface ItemWorkflow {
  id: string
  nome: string
  /** Veio por ser chamado (sub-workflow) por um dos que casam com o filtro, e não pelo próprio filtro. */
  comum?: boolean
  /** IDs dos workflows que este chama (Execute Workflow), para montar a árvore workflow > sub-workflow. */
  filhos?: string[]
}

export interface AvisosChamadas {
  /** Chamadas feitas por expressão (={{ }}): o destino só existe na execução, então não dá para seguir. */
  dinamicos: number
  /** Chamadas a um workflow que não existe na instância ou está arquivado. */
  naoResolvidos: number
  /** Alguns exemplos ("origem -> destino"), para quem for investigar. */
  exemplos: string[]
}

export interface Previa {
  total: number
  /** Quantos dos `total` são comuns. */
  comuns?: number
  /** Chamadas entre workflows que não deu para seguir ao montar a árvore e os comuns. */
  avisos?: AvisosChamadas
  /** Workflows que casam com os filtros (até LIMITE_LISTA). */
  workflows: ItemWorkflow[]
}

/** O webhook devolve no máximo isto por consulta e aceita no máximo isto por exportação. */
export const LIMITE_LISTA = 300

export const SEM_FILTROS: Filtros = { cliente: '', base: '', busca: '', comuns: true }

/** Sem nenhum filtro a instância já é listada inteira, então não há "comuns" a juntar. */
export function temFiltro(filtros: Filtros): boolean {
  return Boolean(filtros.cliente || filtros.base || filtros.busca.trim())
}

function consulta(acao: string, instancia: string, filtros?: Filtros): string {
  const params = new URLSearchParams({ acao, instancia })
  if (filtros) {
    if (filtros.cliente) {
      params.set('cliente', filtros.cliente)
    }
    if (filtros.base) {
      params.set('base', filtros.base)
    }
    if (filtros.busca.trim()) {
      params.set('busca', filtros.busca.trim())
    }
    if (filtros.comuns && temFiltro(filtros)) {
      params.set('comuns', '1')
    }
  }
  return `?${params.toString()}`
}

export async function listarInstancias(): Promise<InstanciaN8n[]> {
  const resposta = await apiGet<{ instancias: InstanciaN8n[] }>('?acao=instancias', BASE_WF)
  return resposta.instancias
}

/** Opções dos dois filtros: os clientes e as bases que existem na instância. */
export async function listarOpcoes(instancia: string): Promise<{ clientes: OpcaoFiltro[]; bases: OpcaoFiltro[] }> {
  const resposta = await apiGet<{ clientes: OpcaoFiltro[]; bases: OpcaoFiltro[] }>(
    consulta('clientes', instancia),
    BASE_WF,
  )
  return { clientes: resposta.clientes, bases: resposta.bases ?? [] }
}

/** Quais workflows os filtros pegam, sem baixar nada. */
export function previa(instancia: string, filtros: Filtros): Promise<Previa> {
  return apiGet<Previa>(consulta('previa', instancia, filtros), BASE_WF)
}

/** Baixa o ZIP com um .json por workflow escolhido. A seleção vai por ID, não por filtro. */
export function baixarZip(instancia: string, ids: string[]) {
  const params = new URLSearchParams({ acao: 'exportar', instancia, ids: ids.join(',') })
  return apiBaixar(`?${params.toString()}`, BASE_WF)
}
