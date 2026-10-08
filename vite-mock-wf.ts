import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

/**
 * Simula, só no `npm run dev`, o backend de workflows (webhooks portal-acesso e portal-wf do n8n),
 * para mexer na aba Workflows sem depender do n8n, de token válido nem de login pelo Google.
 *
 * Liga com VITE_MOCK_WF=1 no .env. Desligado (o padrão) o Vite continua mandando /acesso e /wf para o
 * n8n de VITE_N8N_TARGET. Nada disto entra no build de produção: o plugin só atua em `serve`.
 *
 * A busca repete o que o node "Preparar Dados" do Portal_WF_Exportar faz: o filtro casa o nome
 * (Primeiro_Segundo_Etapa) ou a tag e, com uma plataforma escolhida e ?comuns=1, junta os
 * sub-workflows que os encontrados chamam.
 */

interface Wf {
  id: string
  name: string
  tags?: string[]
  chama?: string[]
}

const CATEGORIA_PLATAFORMA = {
  padrao: 'Categoria_Plataforma_Etapa',
  primeiro: 'Categoria do workflow',
  todosPrimeiro: 'Todas as categorias',
  ajudaPrimeiro: 'Primeira parte do nome (ex.: MASTER, LAB).',
  segundo: 'Plataforma',
  todosSegundo: 'Todas as plataformas',
  ajudaSegundo: 'Segunda parte do nome (ex.: Tray, Mercos).',
}

const CLIENTE_BASE = {
  padrao: 'Cliente_Base_Etapa',
  primeiro: 'Cliente',
  todosPrimeiro: 'Todos os clientes',
  ajudaPrimeiro: 'Primeira parte do nome (ex.: Servtec, Cofam).',
  segundo: 'Base',
  todosSegundo: 'Todas as bases',
  ajudaSegundo: 'Segunda parte do nome (ex.: Tray, Mercos).',
}

const INSTANCIAS = [
  { id: 'automaker_prod', nome: 'Produção (simulado)', rotulos: CATEGORIA_PLATAFORMA },
  { id: 'automaker_1', nome: 'Automaker 1 (simulado)', rotulos: CLIENTE_BASE },
  { id: 'automakerdev_cr', nome: 'AutomakerDev CR (simulado)', rotulos: CLIENTE_BASE },
]

const WORKFLOWS: Record<string, Wf[]> = {
  automaker_prod: [
    { id: 'p01', name: 'MASTER_Tray_Pedido_Captura', tags: ['master', 'tray', 'captura'], chama: ['SUB_Contexto', 'p13'] },
    { id: 'p02', name: 'MASTER_Tray_Pedido_Processa', tags: ['master', 'tray'], chama: ['SUB_Contexto'] },
    { id: 'p03', name: 'MASTER_Tray_Produto_Item', tags: ['master', 'tray'] },
    { id: 'p04', name: 'MASTER_Mercos_Pedido_Captura', tags: ['master', 'mercos'], chama: ['SUB_Contexto'] },
    { id: 'p05', name: 'MASTER_Mercos_Clientes_Captura', tags: ['master', 'mercos'] },
    { id: 'p06', name: 'MASTER_Shopify_Pedido_Captura', tags: ['master', 'shopify'] },
    { id: 'p07', name: 'MASTER_Cilia_Orcamento', tags: ['master', 'cilia'] },
    { id: 'p08', name: 'TOOLS_Admin_Limpar_Execucoes', tags: ['tools'] },
    { id: 'p09', name: 'TOOLS_Admin_Reprocessar_Pedido', tags: ['tools'] },
    { id: 'p10', name: 'LEGADO_Tray_Estoque_Antigo', tags: ['legado', 'tray'], chama: ['SUB_Que_Foi_Apagado'] },
    { id: 'p11', name: 'Portal_Acesso' },
    { id: 'p12', name: 'Portal_WF_Exportar' },
    { id: 'p13', name: 'SUB_Retry', chama: ['SUB_Log'] },
    { id: 'p14', name: 'SUB_Contexto', chama: ['SUB_Log'] },
    { id: 'p15', name: 'SUB_Log' },
  ],
  automaker_1: [
    { id: 'a01', name: 'Servtec_Tray_NFe', tags: ['Tray NFe 4.0'] },
    { id: 'a02', name: 'Cofam_Tray_Estoque', tags: ['Tray Estoque 3.0', 'Tray Estoque 4.0'] },
    { id: 'a03', name: 'Cofam_Tray_Credenciais', tags: ['Tray Credenciais 3.0'] },
    { id: 'a04', name: 'AutopecAutoPecas_Tray_Pedido_Captura', tags: ['Tray Captura 4.0'] },
    { id: 'a05', name: 'Ferraminas_Tray_Estoque', tags: ['Tray Preco 3.0', 'Tray Estoque 4.0'] },
    { id: 'a06', name: 'LAB_Mercos_Pedido_Captura', tags: ['mercos'] },
    { id: 'a07', name: 'LAB_Mercos_Titulos', tags: ['mercos'] },
    { id: 'a08', name: 'Paraiso_Shopify_PedidoProcessa' },
  ],
  automakerdev_cr: [
    { id: 'd01', name: 'LAB_Mercos_Cliente_Subida' },
    { id: 'd02', name: 'LAB_Mercos_Pedido_Captura', chama: ['LAB_Mercos_Credenciais'] },
    { id: 'd03', name: 'LAB_Mercos_Credenciais' },
    { id: 'd04', name: 'Paraiso_Shopify_PedidoProcessa' },
  ],
}

const minus = (s: unknown) => String(s ?? '').trim().toLowerCase()
const partes = (nome: string) => nome.split('_').map((s) => s.trim())

function agrupar(lista: Wf[], indice: 0 | 1) {
  const grupos = new Map<string, { nome: string; total: number }>()
  for (const w of lista) {
    const p = partes(w.name)
    const nome = indice === 0 ? p[0] : (p[1] ?? '')
    if (!nome) continue
    const g = grupos.get(nome.toLowerCase()) ?? { nome, total: 0 }
    g.total += 1
    grupos.set(nome.toLowerCase(), g)
  }
  return [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome))
}

function previa(lista: Wf[], q: URLSearchParams) {
  const cliente = q.get('cliente') ?? ''
  const base = q.get('base') ?? ''
  const busca = q.get('busca') ?? ''
  const casa = (w: Wf) => {
    const p = partes(w.name)
    const tags = (w.tags ?? []).map(minus)
    return (
      (!cliente || minus(p[0]) === minus(cliente) || tags.includes(minus(cliente))) &&
      (!base || minus(p[1]) === minus(base) || tags.includes(minus(base))) &&
      (!busca || minus(w.name).includes(minus(busca)))
    )
  }
  const achados = lista.filter(casa)

  const comuns = new Set<string>()
  if ((cliente || base || busca) && /^(1|true|sim)$/i.test(q.get('comuns') ?? '')) {
    const resolver = (ref: string) => lista.filter((w) => w.id === ref || minus(w.name) === minus(ref))
    const jaTem = new Set(achados.map((w) => w.id))
    const fila = [...achados]
    for (let i = 0; i < fila.length; i++) {
      for (const ref of fila[i].chama ?? []) {
        for (const r of resolver(ref)) {
          if (!jaTem.has(r.id)) {
            jaTem.add(r.id)
            comuns.add(r.id)
            fila.push(r)
          }
        }
      }
    }
  }

  // Quem cada workflow chama (por id ou por nome), para a tela montar a árvore workflow > sub-workflow.
  const filhosDe = (w: Wf) => [
    ...new Set(
      (w.chama ?? []).flatMap((ref) =>
        lista.filter((x) => x.id === ref || minus(x.name) === minus(ref)).map((x) => x.id),
      ),
    ),
  ]

  // Chamadas que não dá para seguir: para um workflow inexistente ou por expressão (={{ }}).
  const naoResolvidos = new Set<string>()
  const dinamicos = new Set<string>()
  for (const w of lista) {
    for (const ref of w.chama ?? []) {
      if (ref.startsWith('=')) {
        dinamicos.add(`${w.name} / ${ref}`)
      } else if (!lista.some((x) => x.id === ref || minus(x.name) === minus(ref))) {
        naoResolvidos.add(`${w.name} -> ${ref}`)
      }
    }
  }

  const todos = [...achados, ...lista.filter((w) => comuns.has(w.id))].sort((a, b) => a.name.localeCompare(b.name))
  return {
    total: todos.length,
    comuns: comuns.size,
    workflows: todos
      .slice(0, 300)
      .map((w) => ({ id: w.id, nome: w.name, comum: comuns.has(w.id), filhos: filhosDe(w) })),
    avisos: {
      dinamicos: dinamicos.size,
      naoResolvidos: naoResolvidos.size,
      exemplos: [...naoResolvidos, ...dinamicos].slice(0, 12),
    },
  }
}

/** ZIP vazio válido (só o registro de fim de diretório): serve para testar o download da tela. */
const ZIP_VAZIO = Buffer.from([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

function json(res: ServerResponse, status: number, corpo: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(corpo))
}

function tratar(req: IncomingMessage, res: ServerResponse): boolean {
  const url = new URL(req.url ?? '/', 'http://localhost')

  if (url.pathname === '/acesso') {
    json(res, 200, { email: 'dev@simulado', recursos: ['workflows'] })
    return true
  }
  if (url.pathname !== '/wf') {
    return false
  }

  const q = url.searchParams
  const acao = minus(q.get('acao'))
  if (acao === 'instancias') {
    json(res, 200, { instancias: INSTANCIAS })
    return true
  }

  const lista = WORKFLOWS[minus(q.get('instancia'))]
  if (!lista) {
    json(res, 404, { error: 'Instância não encontrada' })
    return true
  }
  if (acao === 'clientes') {
    json(res, 200, { instancia: q.get('instancia'), clientes: agrupar(lista, 0), bases: agrupar(lista, 1) })
  } else if (acao === 'previa') {
    json(res, 200, previa(lista, q))
  } else if (acao === 'exportar') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="workflows_${q.get('instancia')}_simulado.zip"`)
    res.end(ZIP_VAZIO)
  } else {
    json(res, 400, { error: 'Ação inválida' })
  }
  return true
}

export function mockWorkflows(ligado: boolean): Plugin {
  return {
    name: 'mock-workflows',
    apply: 'serve',
    configureServer(server) {
      if (!ligado) {
        return
      }
      // Sem devolver função: roda antes do proxy do Vite, então /wf e /acesso não saem da máquina.
      server.middlewares.use((req, res, next) => {
        if (!tratar(req, res)) {
          next()
        }
      })
    },
  }
}
