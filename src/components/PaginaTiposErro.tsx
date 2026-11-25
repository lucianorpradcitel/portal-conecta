import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../services/api'
import { ROTULO_RESPONSABILIDADE } from '../services/responsabilidade'
import {
  coletaTiposErro,
  descreverValidacao,
  formatarDataHora,
  useTiposErro,
  validarTipoErro,
} from '../services/tiposErro'
import type { PlataformaResumo } from '../types/integracao'
import type { TipoErro } from '../types/tiposErro'
import { Alerta } from './ui/Alerta'
import { SeloResponsabilidade } from './ui/SeloResponsabilidade'
import { IconeCheck, IconeCheckCirculo, IconeEscudo } from './ui/Icones'
import {
  BotaoAtualizar,
  BotaoLimpar,
  CampoBusca,
  Carregando,
  CartaoConsulta,
  Celula,
  Codigo,
  EstadoVazio,
  EtiquetaPlataforma,
  Linha,
  RodapeContagem,
  SelectFiltro,
  Tabela,
} from './ui/Tabela'

type Filtro = 'pendentes' | 'validados' | 'todos'

const coletaAgora = () => coletaTiposErro.sincronizar()

const CLASSE_CAMPO_DATA =
  'block h-9 rounded-lg border-slate-200 bg-surface px-2.5 text-sm text-slate-700 shadow-soft transition duration-150 hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15'

/** Remove acentos e caixa, para a busca achar "integracao" em "Integração". */
function normalizar(texto?: string | null): string {
  return (texto ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

const CLASSE_BOTAO_ACAO =
  'inline-flex h-8 w-28 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 disabled:cursor-not-allowed disabled:active:scale-100'
const CLASSE_BOTAO_PRIMARIO = `${CLASSE_BOTAO_ACAO} bg-ink-900 text-white hover:bg-ink-800 disabled:bg-slate-300 disabled:text-slate-500 dark:bg-brand-500 dark:text-ink-950 dark:hover:bg-brand-400 dark:disabled:bg-slate-200 dark:disabled:text-slate-400`
const CLASSE_BOTAO_SECUNDARIO = `${CLASSE_BOTAO_ACAO} border border-slate-200 bg-surface text-slate-700 shadow-soft hover:border-slate-300 hover:bg-slate-50 disabled:text-slate-400`

/**
 * Tipos de erro (CADERR) para o DEV e o ADM conferirem. Cada tipo define a responsabilidade de todos os erros ligados a
 * ele, e quem decide de início é a IA. Aqui uma pessoa confirma ou troca a responsabilidade; a API grava
 * quem validou e quando. Trocar vale para todos os erros do tipo, de uma vez.
 */
export function PaginaTiposErro() {
  const { tipos, pendentes, carregado, falha, sincronizando } = useTiposErro()
  const [filtro, setFiltro] = useState<Filtro>('pendentes')
  const [busca, setBusca] = useState('')
  // Quem validou e quando (dia da validação, as duas pontas inclusivas). Só valem nas visões Validados e Todos.
  const [usuario, setUsuario] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  // PLA_SISEXT -> nome da plataforma. Sem isso a tela mostraria só o código (ex.: 1005).
  const [nomes, setNomes] = useState<Map<string, string>>(new Map())
  // A responsabilidade escolhida em cada linha, enquanto não foi salva.
  const [escolhas, setEscolhas] = useState<Record<number, number>>({})
  const [salvando, setSalvando] = useState<number | null>(null)
  const [aviso, setAviso] = useState<{ tom: 'sucesso' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    let ativo = true
    apiGet<PlataformaResumo[]>('/plataformas')
      .then((lista) => {
        if (ativo) setNomes(new Map(lista.map((p) => [p.sistemaExterno, p.descricao])))
      })
      .catch((e: unknown) => console.error('[TIPOS DE ERRO] Erro ao carregar plataformas', e))
    return () => {
      ativo = false
    }
  }, [])

  const nomeDaPlataforma = (codigo: string) => nomes.get(codigo) ?? codigo

  const validados = tipos.length - pendentes
  const comFiltroDeValidacao = filtro !== 'pendentes'
  // Só em "Validados" todo tipo tem quem validou; em "Todos" a coluna ficaria vazia nos pendentes.
  const mostrarValidadoPor = filtro === 'validados'
  // Quem já validou algum tipo: as opções do filtro de usuário.
  const usuarios = useMemo(
    () =>
      Array.from(new Set(tipos.map((t) => t.usuarioValidacao?.trim()).filter((u): u is string => !!u))).sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      ),
    [tipos],
  )
  const temFiltro = !!busca || (comFiltroDeValidacao && !!(usuario || de || ate))
  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    return [...tipos]
      .filter((t) => (filtro === 'todos' ? true : filtro === 'pendentes' ? t.validado !== 'S' : t.validado === 'S'))
      .filter(
        (t) =>
          !termo ||
          normalizar(t.codigoErro).includes(termo) ||
          normalizar(t.exemplo).includes(termo) ||
          normalizar(t.plataforma).includes(termo) ||
          normalizar(nomes.get(t.plataforma)).includes(termo),
      )
      // Em "Todos", quem não foi validado não tem usuário nem data: sai quando um desses filtros está ligado.
      .filter((t) => !comFiltroDeValidacao || !usuario || t.usuarioValidacao?.trim() === usuario)
      .filter((t) => {
        if (!comFiltroDeValidacao || (!de && !ate)) return true
        const dia = t.dataValidacao?.slice(0, 10)
        return !!dia && (!de || dia >= de) && (!ate || dia <= ate)
      })
      .sort((a, b) => b.dataCadastro.localeCompare(a.dataCadastro))
  }, [tipos, filtro, busca, nomes, comFiltroDeValidacao, usuario, de, ate])

  function limparFiltros() {
    setBusca('')
    setUsuario('')
    setDe('')
    setAte('')
  }

  async function validar(tipo: TipoErro) {
    const escolhida = escolhas[tipo.codigo] ?? tipo.status
    const mudou = escolhida !== tipo.status
    setSalvando(tipo.codigo)
    setAviso(null)
    try {
      await validarTipoErro(tipo.codigo, mudou ? escolhida : undefined)
      setEscolhas((atual) => {
        const { [tipo.codigo]: _descartada, ...resto } = atual
        return resto
      })
      setAviso({
        tom: 'sucesso',
        texto: `${tipo.codigoErro} (${nomeDaPlataforma(tipo.plataforma)}) ${mudou ? 'reclassificado e validado' : 'validado'}.`,
      })
    } catch (e) {
      setAviso({ tom: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível validar o tipo.' })
    } finally {
      setSalvando(null)
    }
  }

  const abas: { id: Filtro; rotulo: string; contador: number }[] = [
    { id: 'pendentes', rotulo: 'Não validados', contador: pendentes },
    { id: 'validados', rotulo: 'Validados', contador: validados },
    { id: 'todos', rotulo: 'Todos', contador: tipos.length },
  ]

  const cabecalho = (
    <>
      <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Situação do tipo">
        {abas.map(({ id, rotulo, contador }) => {
          const ativa = filtro === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setFiltro(id)}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ${
                ativa
                  ? 'bg-surface text-slate-900 shadow-soft ring-1 ring-slate-200/80 dark:bg-slate-200 dark:ring-slate-300/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {rotulo}
              <span
                className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  id === 'pendentes' && contador > 0
                    ? ativa
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-100 text-amber-700'
                    : 'bg-slate-200/70 text-slate-500'
                }`}
              >
                {contador}
              </span>
            </button>
          )
        })}
      </div>
      <BotaoAtualizar onClick={() => void coletaAgora()} carregando={sincronizando} />
    </>
  )

  if (!carregado) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-surface shadow-card">
        {falha ? (
          <EstadoVazio
            tom="erro"
            icone={<IconeEscudo />}
            titulo="Não foi possível carregar os tipos de erro"
            texto="A API não respondeu. Tente atualizar em instantes."
            acao={<BotaoAtualizar onClick={() => void coletaAgora()} carregando={sincronizando} />}
          />
        ) : (
          <Carregando texto="Carregando tipos de erro…" />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {aviso && <Alerta tom={aviso.tom}>{aviso.texto}</Alerta>}

      <CartaoConsulta
        cabecalho={cabecalho}
        filtros={
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-96">
              <CampoBusca
                aria-label="Buscar tipo de erro"
                placeholder="Buscar por plataforma, código ou mensagem…"
                value={busca}
                onChange={setBusca}
              />
            </div>
            {comFiltroDeValidacao && (
              <>
                <div className="w-full sm:w-52">
                  <SelectFiltro aria-label="Validado por" value={usuario} onChange={setUsuario}>
                    <option value="">Todos os usuários</option>
                    {usuarios.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </SelectFiltro>
                </div>
                <label className="flex items-center gap-2 text-[13px] text-slate-500">
                  <span>Validado de</span>
                  <input
                    type="date"
                    aria-label="Validado a partir de"
                    value={de}
                    max={ate || undefined}
                    onChange={(ev) => setDe(ev.target.value)}
                    className={CLASSE_CAMPO_DATA}
                  />
                </label>
                <label className="flex items-center gap-2 text-[13px] text-slate-500">
                  <span>até</span>
                  <input
                    type="date"
                    aria-label="Validado até"
                    value={ate}
                    min={de || undefined}
                    onChange={(ev) => setAte(ev.target.value)}
                    className={CLASSE_CAMPO_DATA}
                  />
                </label>
              </>
            )}
            <BotaoLimpar onClick={limparFiltros} disabled={!temFiltro} />
          </div>
        }
        rodape={visiveis.length === 0 ? undefined : <RodapeContagem visiveis={visiveis.length} total={tipos.length} />}
      >
        {visiveis.length === 0 ? (
          filtro === 'pendentes' && !busca.trim() ? (
            <EstadoVazio
              tom="sucesso"
              icone={<IconeCheck />}
              titulo="Nenhum tipo aguardando validação"
              texto="Todos os tipos de erro já foram conferidos por uma pessoa."
            />
          ) : (
            <EstadoVazio icone={<IconeEscudo />} texto="Nenhum tipo encontrado com esses filtros." />
          )
        ) : (
          <Tabela
            colunas={[
              { rotulo: 'Plataforma' },
              { rotulo: 'Código do erro' },
              { rotulo: 'Mensagem de exemplo', className: 'w-full' },
              { rotulo: 'Cadastrado em' },
              ...(mostrarValidadoPor ? [{ rotulo: 'Validado por' }] : []),
              { rotulo: 'Responsabilidade' },
              { rotulo: 'Alterar para' },
              { rotulo: 'Ação' },
            ]}
          >
            {visiveis.map((tipo) => {
              const escolhida = escolhas[tipo.codigo] ?? tipo.status
              const mudou = escolhida !== tipo.status
              const validado = tipo.validado === 'S'
              const ocupado = salvando === tipo.codigo
              return (
                <Linha key={tipo.codigo}>
                  <Celula primeira className="whitespace-nowrap">
                    <EtiquetaPlataforma nome={nomeDaPlataforma(tipo.plataforma)} />
                  </Celula>
                  <Celula className="whitespace-nowrap">
                    <Codigo>{tipo.codigoErro}</Codigo>
                  </Celula>
                  <Celula className="min-w-[18rem]">
                    <p className="line-clamp-3 break-words leading-relaxed text-slate-600" title={tipo.exemplo ?? undefined}>
                      {tipo.exemplo || <span className="text-slate-400">Sem exemplo</span>}
                    </p>
                  </Celula>
                  <Celula className="whitespace-nowrap tabular-nums text-slate-600">
                    {formatarDataHora(tipo.dataCadastro) ?? '—'}
                  </Celula>
                  {mostrarValidadoPor && (
                    <Celula className="whitespace-nowrap">
                      {tipo.usuarioValidacao?.trim() ? (
                        <>
                          <div className="max-w-[12rem] truncate text-slate-700" title={tipo.usuarioValidacao}>
                            {tipo.usuarioValidacao}
                          </div>
                          {formatarDataHora(tipo.dataValidacao) && (
                            <div className="text-xs tabular-nums text-slate-400">{formatarDataHora(tipo.dataValidacao)}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400">Não informado</span>
                      )}
                    </Celula>
                  )}
                  <Celula className="whitespace-nowrap">
                    <SeloResponsabilidade valor={tipo.status} tipo={tipo} />
                  </Celula>
                  <Celula className="whitespace-nowrap">
                    <div className="w-44">
                      <SelectFiltro
                        aria-label={`Responsabilidade de ${tipo.codigoErro}`}
                        value={String(escolhida)}
                        disabled={ocupado}
                        onChange={(v) => setEscolhas((atual) => ({ ...atual, [tipo.codigo]: Number(v) }))}
                      >
                        {Object.entries(ROTULO_RESPONSABILIDADE)
                          // "A classificar" (0) só aparece se o tipo já está nele: não faz sentido validar como 0.
                          .filter(([n]) => Number(n) !== 0 || tipo.status === 0)
                          .map(([n, info]) => (
                            <option key={n} value={n}>
                              {info.rotulo} ({n})
                            </option>
                          ))}
                      </SelectFiltro>
                    </div>
                  </Celula>
                  <Celula ultima className="whitespace-nowrap">
                    {validado && !mudou ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700"
                        title={descreverValidacao(tipo)}
                      >
                        <span className="h-4 w-4">
                          <IconeCheckCirculo />
                        </span>
                        Validado
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={validado ? CLASSE_BOTAO_SECUNDARIO : CLASSE_BOTAO_PRIMARIO}
                        disabled={ocupado || escolhida === 0}
                        title={
                          mudou
                            ? `Muda a responsabilidade para ${ROTULO_RESPONSABILIDADE[escolhida]?.rotulo ?? escolhida}${validado ? '' : ' e valida o tipo'}, para todos os erros dele`
                            : descreverValidacao(tipo)
                        }
                        onClick={() => void validar(tipo)}
                      >
                        {ocupado ? 'Salvando…' : mudou ? 'Reclassificar' : 'Validar'}
                      </button>
                    )}
                  </Celula>
                </Linha>
              )
            })}
          </Tabela>
        )}
      </CartaoConsulta>
    </div>
  )
}

/** Quantos tipos aguardam validação, para o menu lateral. Só monta para quem pode validar (DEV e ADM). */
export function ContadorTiposPendentes() {
  const { pendentes, carregado } = useTiposErro()
  if (!carregado || pendentes === 0) return null
  return (
    <span
      className="ml-auto min-w-[1.25rem] rounded-full bg-amber-400/90 px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums text-ink-950"
      title={`${pendentes} ${pendentes === 1 ? 'tipo aguarda' : 'tipos aguardam'} validação`}
    >
      {pendentes}
    </span>
  )
}
