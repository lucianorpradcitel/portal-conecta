/** Espelha os DTOs de monitoramento da API Monint (antigo monitoramento-front). */

/** Item do GET /pendentes?status=2 — pedidos que falharam na integração. */
export interface PedidoComErro {
  codigoPedido: string
  cliente: string
  erro?: string | null
  plataforma?: string | null
  rotina?: string | null
  status: number
}

/** Item do GET /pedidos?cliente= — todos os pedidos de um lojista, em qualquer status. */
export interface PedidoDoCliente {
  codigoPedido: string
  cliente: string
  /** Mensagem do último processamento. Nos finalizados costuma vir "FINALIZADO". */
  erro?: string | null
  plataforma?: string | null
  status: number
  ultimaAlteracao?: string | null
  sequencialProcessamento?: number
  idIntegracao?: string | null
  rotina?: string | null
}

/** Item do GET /produtos — produtos que falharam na integração. */
export interface ProdutoComErro {
  /** Único por registro. O codigoProduto se repete entre clientes, então não serve de chave. */
  id: string
  codigoProduto: string
  dataErro: string
  cliente: string
  plataforma: string
  status: number
  /** É o nome que a API usa. Pode vir nulo. */
  mensagemErro?: string | null
  /** Cópia de mensagemErro, preenchida na tela para o filtro tratar pedido e produto igual. */
  erro?: string | null
  rotina?: string | null
}
