import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, apiGet } from '../services/api'
import type { PlataformaResumo } from '../types/integracao'
import { Alerta } from './ui/Alerta'
import { IconeCamadas, IconeLupa } from './ui/Icones'
import {
  BotaoAtualizar,
  CampoBusca,
  Carregando,
  CartaoConsulta,
  Celula,
  Codigo,
  EstadoVazio,
  EtiquetaPlataforma,
  Linha,
  RodapeContagem,
  Tabela,
  TituloConsulta,
} from './ui/Tabela'

interface Props {
  /** Incrementado quando uma plataforma é criada no formulário acima. */
  versao?: number
}

/** Consulta das plataformas cadastradas (CADPLA). */
export function ListaPlataformas({ versao = 0 }: Props) {
  const [plataformas, setPlataformas] = useState<PlataformaResumo[]>([])
  const [busca, setBusca] = useState('')
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

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return termo
      ? plataformas.filter(
          (p) => p.descricao.toLowerCase().includes(termo) || p.sistemaExterno.includes(termo),
        )
      : plataformas
  }, [plataformas, busca])

  const primeiraCarga = carregando && plataformas.length === 0 && !erro

  return (
    <CartaoConsulta
      cabecalho={
        <>
          <TituloConsulta
            icone={<IconeCamadas />}
            titulo="Plataformas cadastradas"
            subtitulo="Disponíveis no seletor da aba Nova integração."
          />
          <BotaoAtualizar onClick={carregar} carregando={carregando} />
        </>
      }
      filtros={
        plataformas.length > 0 ? (
          <div className="max-w-sm">
            <CampoBusca
              id="buscaPlataforma"
              aria-label="Buscar plataforma"
              placeholder="Buscar por identificador ou código…"
              value={busca}
              onChange={setBusca}
            />
          </div>
        ) : undefined
      }
      rodape={
        !erro && plataformas.length > 0 ? (
          <RodapeContagem visiveis={visiveis.length} total={plataformas.length} />
        ) : undefined
      }
    >
      {erro ? (
        <div className="p-5">
          <Alerta tom="erro" titulo="Não foi possível carregar">
            {erro}
          </Alerta>
        </div>
      ) : primeiraCarga ? (
        <Carregando />
      ) : visiveis.length === 0 ? (
        <EstadoVazio
          icone={plataformas.length === 0 ? <IconeCamadas /> : <IconeLupa />}
          texto={
            plataformas.length === 0
              ? 'Nenhuma plataforma cadastrada.'
              : 'Nenhuma plataforma corresponde à busca.'
          }
        />
      ) : (
        <Tabela
          colunas={[{ rotulo: 'Identificador', className: 'w-full' }, { rotulo: 'Sistema externo' }]}
        >
          {visiveis.map((p) => (
            <Linha key={p.descricao}>
              <Celula primeira>
                <EtiquetaPlataforma nome={p.descricao} />
              </Celula>
              <Celula ultima className="whitespace-nowrap">
                <Codigo>{p.sistemaExterno}</Codigo>
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}
    </CartaoConsulta>
  )
}
