import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiGet } from '../services/api'
import type { PlataformaResumo } from '../types/integracao'
import { Botao } from './ui/Botao'

interface Props {
  /** Incrementado quando uma plataforma é criada no formulário acima. */
  versao?: number
}

/** Consulta das plataformas cadastradas (CADPLA). */
export function ListaPlataformas({ versao = 0 }: Props) {
  const [plataformas, setPlataformas] = useState<PlataformaResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(() => {
    setCarregando(true)
    setErro(null)

    return apiGet<PlataformaResumo[]>('/plataformas')
      .then(setPlataformas)
      .catch((e: unknown) => {
        setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar as plataformas.')
      })
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar, versao])

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Plataformas cadastradas</h3>
        <Botao type="button" variante="secundario" onClick={carregar} disabled={carregando}>
          {carregando ? 'Carregando…' : 'Atualizar'}
        </Botao>
      </div>

      <div className="p-5 space-y-6">
        {erro && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4">
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        {!erro && !carregando && plataformas.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma plataforma cadastrada.</p>
        )}

        {plataformas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4 font-medium">Identificador</th>
                  <th className="py-2 font-medium">Sistema externo</th>
                </tr>
              </thead>
              <tbody>
                {plataformas.map((p) => (
                  <tr key={p.descricao} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-4">{p.descricao}</td>
                    <td className="py-2 font-mono text-xs">{p.sistemaExterno}</td>
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
