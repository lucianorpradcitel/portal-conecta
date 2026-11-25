import { temPerfil, type Perfil } from './api'

/**
 * Responsabilidade do erro (STAERR), como a API Monint devolve no campo `responsabilidade` de produtos e pedidos:
 * 0 não informado (inclui o erro ainda sem tipo), 1 culpa nossa, 2 culpa do cliente, 3 instabilidade, 4 culpa da
 * plataforma externa. Não é o `status` do pedido, que é a situação na fila.
 */
export const ROTULO_RESPONSABILIDADE: Record<number, { rotulo: string; dica: string; classe: string }> = {
  0: {
    rotulo: 'A classificar',
    dica: 'Ainda sem tipo de erro: ninguém definiu de quem é a responsabilidade',
    classe: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  },
  1: {
    rotulo: 'Nossa',
    dica: 'Culpa nossa (integração): o time precisa agir',
    classe: 'bg-red-50 text-red-700 ring-red-600/15',
  },
  2: {
    rotulo: 'Cliente',
    dica: 'Culpa do cliente (lojista): precisa corrigir o cadastro no ERP',
    classe: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  },
  3: {
    rotulo: 'Instabilidade',
    dica: 'Passageira (ERP ou plataforma fora do ar): a próxima tentativa costuma resolver',
    classe: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  },
  4: {
    rotulo: 'Plataforma',
    dica: 'Culpa da plataforma externa',
    classe: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15',
  },
}

/** Os recortes da lista de erros por responsabilidade. */
export type Visao = 'padrao' | 'usuarios' | 'todos'

export interface DefinicaoVisao {
  id: Visao
  rotulo: string
  dica: string
  /** O que a API recebe em `?responsabilidade=`. Nulo = sem o parâmetro, ou seja, todas. */
  responsabilidades: readonly number[] | null
  /** Quem enxerga a visão. A API confere o perfil de novo: aqui é só o que a tela oferece. */
  perfilMinimo: Perfil
}

/** A ordem é a das abas; a primeira que o perfil enxerga é a que abre. */
export const VISOES: readonly DefinicaoVisao[] = [
  {
    id: 'padrao',
    rotulo: 'Padrão',
    dica: 'Erros nossos (1) e ainda sem classificação (0)',
    responsabilidades: [1, 0],
    perfilMinimo: 'DEV',
  },
  {
    id: 'usuarios',
    rotulo: 'Usuários',
    dica: 'Erros do cliente (2) e da plataforma externa (4)',
    responsabilidades: [2, 4],
    perfilMinimo: 'USR',
  },
  {
    id: 'todos',
    rotulo: 'Todos',
    dica: 'Todas as responsabilidades, inclusive instabilidade (3)',
    responsabilidades: null,
    perfilMinimo: 'DEV',
  },
]

/** As visões que o perfil da sessão enxerga (o USR só tem "Usuários"). */
export function visoesDoPerfil(): DefinicaoVisao[] {
  return VISOES.filter((v) => temPerfil(v.perfilMinimo))
}

export function visaoInicial(): Visao {
  return visoesDoPerfil()[0].id
}

/** Acrescenta `?responsabilidade=` à consulta da visão; "Todos" não acrescenta nada. */
export function adicionarResponsabilidade(params: URLSearchParams, visao: Visao): void {
  const definicao = VISOES.find((v) => v.id === visao)
  for (const r of definicao?.responsabilidades ?? []) {
    params.append('responsabilidade', String(r))
  }
}
