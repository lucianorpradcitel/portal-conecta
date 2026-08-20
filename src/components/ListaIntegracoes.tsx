import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiGet } from '../services/api'
import type { IntegracaoResumo } from '../types/integracao'
import { Botao } from './ui/Botao'
import { Select } from './ui/Select'

interface Props {
  /** Incrementado quando uma integração é criada na outra aba. */
  versao?: number
}

function formatarData(valor: string | null): string {
  if (!valor) {
    return '—'
  }
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleString('pt-BR')
}

/**
 * Consulta das integrações cadastradas. Somente leitura: a API ainda não tem endpoint de edição
 * nem de desativação — hoje isso é UPDATE direto no banco.
 *
 * Usa o GET /integracoes sem incluirCredenciais, então nenhum segredo trafega até aqui.
 */
export function ListaIntegracoes({ versao = 0 }: Props) {
  const [integracoes, setIntegracoes] = useState<IntegracaoResumo[]>([])
  const [plataforma, setPlataforma] = useState('')
  const [ativo, setAtivo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(() => {
    const parametros = new URLSearchParams()
    if (plataforma) {
      parametros.set('plataforma', plataforma)
    }
    if (ativo) {
      parametros.set('ativo', ativo)
    }
    const query = parametros.toString()

    setCarregando(true)
    setErro(null)

    return apiGet<IntegracaoResumo[]>(`/integracoes${query ? `?${query}` : ''}`)
      .then(setIntegracoes)
      .catch((e: unknown) => {
        setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar as integrações.')
      })
      .finally(() => setCarregando(false))
  }, [plataforma, ativo])

  useEffect(() => {
    carregar()
  }, [carregar, versao])

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800">Integrações cadastradas</h3>
        <p className="mt-1 text-sm text-slate-500">
          
        </p>
      </div>

      <div className="p-5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <Select
            id="filtroPlataforma"
            label="Plataforma"
            value={plataforma}
            onChange={(e) => setPlataforma(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="tray">Tray</option>
            <option value="mercos">Mercos</option>
          </Select>

          <Select
            id="filtroAtivo"
            label="Situação"
            value={ativo}
            onChange={(e) => setAtivo(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="S">Ativas</option>
            <option value="N">Inativas</option>
          </Select>

          <Botao type="button" variante="secundario" onClick={carregar} disabled={carregando}>
            {carregando ? 'Carregando…' : 'Atualizar'}
          </Botao>
        </div>

        {erro && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4">
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        {!erro && !carregando && integracoes.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma integração encontrada com esses filtros.</p>
        )}

        {integracoes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4 font-medium">Código</th>
                  <th className="py-2 pr-4 font-medium">Lojista</th>
                  <th className="py-2 pr-4 font-medium">Plataforma</th>
                  <th className="py-2 pr-4 font-medium">Slug</th>
                  <th className="py-2 pr-4 font-medium">Situação</th>
                  <th className="py-2 font-medium">Cadastrada em</th>
                </tr>
              </thead>
              <tbody>
                {integracoes.map((i) => (
                  <tr
                    key={`${i.codigoIntegracao}-${i.codigoCliente}`}
                    className="border-b border-slate-100 text-slate-700"
                  >
                    <td className="py-2 pr-4 font-mono text-xs">{i.codigoIntegracao}</td>
                    <td className="py-2 pr-4">
                      {i.nomeCliente} <span className="text-slate-400">#{i.codigoCliente}</span>
                    </td>
                    <td className="py-2 pr-4">{i.plataforma}</td>
                    <td className="py-2 pr-4">{i.slug}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          i.ativo
                            ? 'rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700'
                            : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'
                        }
                      >
                        {i.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="py-2">{formatarData(i.dataInclusao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
