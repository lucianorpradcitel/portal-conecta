/** Item do GET /tipos-erro (CADMSG): o tipo do erro, que define a responsabilidade de todos os erros ligados a ele. */
export interface TipoErro {
  /** MSG_CODIGO: é o `codigoMensagem` que produtos e pedidos guardam. */
  codigo: number
  /** PLA_SISEXT da plataforma (ex.: "1005"). O nome vem do GET /plataformas. */
  plataforma: string
  /** Código estável do erro (ex.: categoria_ausente), nunca o texto da mensagem. */
  codigoErro: string
  /** Responsabilidade (0 a 4), veja services/responsabilidade.ts. */
  status: number
  /** S = uma pessoa conferiu a responsabilidade; N = ainda não. */
  validado: 'S' | 'N'
  /** Uma mensagem real de exemplo, para quem for validar. */
  exemplo?: string | null
  idExemplo?: string | null
  dataCadastro: string
  /** Quem validou (MSG_USUVAL). */
  usuarioValidacao?: string | null
  dataValidacao?: string | null
}
