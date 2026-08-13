import { useEffect, useState } from 'react'
import { ApiError, apiGet } from '../services/api'
import type { ClienteResumo } from '../types/integracao'
import { Select } from './ui/Select'

interface Props {
  valor: number | null
  aoSelecionar: (cliente: ClienteResumo | null) => void
  erro?: string
  desabilitado?: boolean
  /** Muda de valor para forçar recarga — usado quando a outra aba cadastra um lojista. */
  versao?: number
}

/**
 * Carrega os lojistas do GET /clientes e deixa escolher qual receberá a integração.
 *
 * A lista vem inteira de uma vez, sem busca incremental: o endpoint não pagina e o CADCLI tem
 * poucas linhas. Se crescer a ponto do select ficar impraticável, trocar por busca com debounce
 * é local a este componente — o filtro ?nome= já existe na API.
 */
export function SeletorLojista({ valor, aoSelecionar, erro, desabilitado, versao = 0 }: Props) {
  const [lojistas, setLojistas] = useState<ClienteResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    setErroCarga(null)

    apiGet<ClienteResumo[]>('/clientes')
      .then((dados) => {
        if (!cancelado) {
          setLojistas(dados)
        }
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setErroCarga(e instanceof ApiError ? e.message : 'Não foi possível carregar os lojistas.')
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCarregando(false)
        }
      })

    return () => {
      cancelado = true
    }
  }, [versao])

  if (erroCarga) {
    return (
      <div>
        <span className="block text-sm font-medium text-slate-700">Lojista</span>
        <p className="mt-1 text-sm text-red-600">{erroCarga}</p>
      </div>
    )
  }

  return (
    <Select
      id="codigoCliente"
      label="Lojista"
      value={valor ?? ''}
      erro={erro}
      disabled={desabilitado || carregando}
      onChange={(e) => {
        const codigo = Number(e.target.value)
        aoSelecionar(lojistas.find((l) => l.codigoCliente === codigo) ?? null)
      }}
    >
      <option value="">{carregando ? 'Carregando…' : 'Selecione o lojista'}</option>
      {lojistas.map((lojista) => (
        <option key={lojista.codigoCliente} value={lojista.codigoCliente}>
          {lojista.nome} (#{lojista.codigoCliente})
        </option>
      ))}
    </Select>
  )
}
