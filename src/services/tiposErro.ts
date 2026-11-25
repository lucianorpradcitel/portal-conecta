import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { TipoErro } from '../types/tiposErro'
import { apiGet, apiPatch } from './api'
import { criarColeta } from './coleta'

/**
 * Os tipos de erro (CADMSG), lidos do GET /tipos-erro. A lista é pequena e muda pouco, então fica toda no módulo e é
 * relida a cada minuto: o Monitoramento cruza com ela pelo `codigoMensagem` de cada erro (para mostrar se o tipo foi
 * validado) e a página de Tipos de erro lista e valida. Qualquer usuário interno pode ler; validar é do DEV e do ADM.
 */
const INTERVALO_TIPOS_MS = 60_000

export const coletaTiposErro = criarColeta<TipoErro[]>('tipos de erro', INTERVALO_TIPOS_MS, () =>
  apiGet<TipoErro[]>('/tipos-erro'),
)

/** Assina a lista de tipos e mantém a releitura enquanto o componente estiver na tela. */
export function useTiposErro() {
  const { retrato, falha, sincronizando } = useSyncExternalStore(coletaTiposErro.assinar, coletaTiposErro.ler)
  useEffect(() => coletaTiposErro.iniciarAutomatica(), [])
  const tipos = useMemo(() => retrato ?? [], [retrato])
  const porCodigo = useMemo(() => new Map(tipos.map((t) => [t.codigo, t])), [tipos])
  const pendentes = useMemo(() => tipos.filter((t) => t.validado !== 'S').length, [tipos])
  return { tipos, porCodigo, pendentes, carregado: retrato !== null, falha, sincronizando }
}

/**
 * Valida o tipo. Sem `status`, só confirma o que está gravado; com `status`, reclassifica e confirma. A API grava
 * quem validou e quando, e todos os erros ligados ao tipo passam a mostrar a responsabilidade nova.
 */
export async function validarTipoErro(codigo: number, status?: number): Promise<TipoErro> {
  const tipo = await apiPatch<TipoErro>(`/tipos-erro/${codigo}`, status === undefined ? undefined : { status })
  await coletaTiposErro.sincronizar()
  return tipo
}

export function formatarDataHora(valor?: string | null): string | null {
  if (!valor) return null
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** A frase do hover: quem validou, ou que a IA definiu e ainda falta validar. */
export function descreverValidacao(tipo: TipoErro): string {
  if (tipo.validado === 'S') {
    const quem = tipo.usuarioValidacao?.trim()
    const quando = formatarDataHora(tipo.dataValidacao)
    return `Validado${quem ? ` por ${quem}` : ''}${quando ? ` em ${quando}` : ''}`
  }
  // O tipo sempre nasce da IA; a pessoa só valida ou reclassifica.
  return 'Definido pela IA, ainda não validado'
}
