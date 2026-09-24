import { useEffect, useState } from 'react'
import { ApiError, apiGet } from '../services/api'
import type { PlataformaResumo } from '../types/integracao'
import { Alerta } from './ui/Alerta'
import { CLASSE_ROTULO } from './ui/Campo'
import { Select } from './ui/Select'

interface Props {
  valor: string
  aoSelecionar: (plataforma: PlataformaResumo | null) => void
  erro?: string
  desabilitado?: boolean
  /** Muda de valor para forçar recarga — usado quando a aba de Plataformas cadastra uma nova. */
  versao?: number
}

/** Carrega as plataformas do GET /plataformas (CADPLA) e deixa escolher qual a integração usa. */
export function SeletorPlataforma({ valor, aoSelecionar, erro, desabilitado, versao = 0 }: Props) {
  const [plataformas, setPlataformas] = useState<PlataformaResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    setErroCarga(null)

    apiGet<PlataformaResumo[]>('/plataformas')
      .then((dados) => {
        if (!cancelado) {
          setPlataformas(dados)
        }
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setErroCarga(e instanceof ApiError ? e.message : 'Não foi possível carregar as plataformas.')
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
        <span className={CLASSE_ROTULO}>Plataforma</span>
        <div className="mt-1.5">
          <Alerta tom="erro">{erroCarga}</Alerta>
        </div>
      </div>
    )
  }

  return (
    <Select
      id="plataforma"
      label="Plataforma"
      value={valor}
      erro={erro}
      disabled={desabilitado || carregando}
      onChange={(e) => {
        const descricao = e.target.value
        aoSelecionar(plataformas.find((p) => p.descricao === descricao) ?? null)
      }}
    >
      <option value="">{carregando ? 'Carregando…' : 'Selecione'}</option>
      {plataformas.map((plataforma) => (
        <option key={plataforma.descricao} value={plataforma.descricao}>
          {plataforma.descricao} ({plataforma.sistemaExterno})
        </option>
      ))}
    </Select>
  )
}
