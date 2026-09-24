/** Espelha os DTOs da API Monint. */

/** Sistema externo de uma plataforma cadastrada em CADPLA (ver PlataformaResumo). */
export type Plataforma = string

/** Item do GET /clientes. */
export interface ClienteResumo {
  codigoCliente: number
  nome: string
}

/** Corpo do POST /integracoes. */
export interface DadosCriacaoIntegracao {
  codigoIntegracao: string
  codigoCliente: number
  plataforma: Plataforma
  slug: string
  urlApi: string | null
  urlWebservice: string
  chavePrivada: string
}

/** Resposta 201. O webhookToken aparece só aqui, uma vez. */
export interface IntegracaoCriada {
  codigoIntegracao: string
  codigoCliente: number
  nomeCliente: string
  plataforma: string
  slug: string
  ativo: boolean
  webhookToken: string
  dataInclusao: string
}

/**
 * Item do GET /integracoes sem incluirCredenciais.
 * Não traz chavePrivada, apiToken, refreshToken nem webhookToken — de propósito.
 */
export interface IntegracaoResumo {
  codigoIntegracao: string
  codigoCliente: number
  nomeCliente: string
  plataforma: string
  slug: string
  ativo: boolean
  urlApi: string | null
  urlWebservice: string
  dataInclusao: string | null
  dataAlteracao: string | null
}

/** Corpo do POST /cadastro. */
export interface DadosCriacaoCliente {
  nome: string
  userName: string
  senha: string
}

/** Resposta 201 do POST /cadastro. */
export interface ClienteCriado {
  codigoCliente: number
  nome: string
  userName: string
}

/** Corpo de erro da API: LinkedHashMap com status e error. */
export interface ErroApi {
  status: number
  error: string
}

/** Item do GET /plataformas. */
export interface PlataformaResumo {
  descricao: string
  sistemaExterno: string
}

/** Corpo do POST /plataformas. */
export interface DadosCriacaoPlataforma {
  descricao: string
  sistemaExterno: string
}
