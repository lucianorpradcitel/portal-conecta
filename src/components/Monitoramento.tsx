import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { apiGet } from '../services/api'
import type { PedidoComErro, ProdutoComErro } from '../types/monitoramento'
import { IconeCaixa, IconeCheck, IconeEtiqueta, IconeLupa, IconePessoas } from './ui/Icones'
import {
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

type SubAba = 'pedidos' | 'produtos'

const INTERVALO_ATUALIZACAO_MS = 10_000

/** Remove acentos e caixa, para a busca achar "integracao" em "Integração". */
function normalizar(texto: string): string {
  // NFD separa a letra do acento; \p{M} casa os acentos soltos.
  return texto.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

function formatarDataHora(valor: string): { data: string; hora: string } | null {
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) {
    return null
  }
  return {
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

/**
 * Mescla a resposta nova na lista atual sem embaralhar a tabela a cada atualização: mantém na
 * posição os itens que continuam com erro, descarta os que saíram e acrescenta os novos no fim.
 * Devolve a própria lista atual quando nada mudou, para o React não renderizar à toa.
 */
function mesclar<T>(atual: T[], recebidos: T[], chave: (item: T) => string): T[] {
  const idsRecebidos = new Set(recebidos.map(chave))
  const mantidos = atual.filter((item) => idsRecebidos.has(chave(item)))
  const idsMantidos = new Set(mantidos.map(chave))
  const novos = recebidos.filter((item) => !idsMantidos.has(chave(item)))
  if (mantidos.length === atual.length && novos.length === 0) {
    return atual
  }
  return [...mantidos, ...novos]
}

interface Filtros {
  codigo: string
  cliente: string
  plataforma: string
  erro: string
}

const FILTROS_VAZIOS: Filtros = { codigo: '', cliente: '', plataforma: '', erro: '' }

interface ItemFiltravel {
  cliente: string
  plataforma?: string | null
  erro?: string | null
}

function filtrar<T extends ItemFiltravel>(itens: T[], filtros: Filtros, codigoDe: (item: T) => string): T[] {
  const codigo = normalizar(filtros.codigo)
  const erro = normalizar(filtros.erro)
  return itens.filter(
    (item) =>
      (!codigo || normalizar(codigoDe(item)).includes(codigo)) &&
      (!filtros.cliente || item.cliente === filtros.cliente) &&
      (!filtros.plataforma || item.plataforma === filtros.plataforma) &&
      (!erro || normalizar(item.erro || '').includes(erro)),
  )
}

const chaveProduto = (p: ProdutoComErro) => p.id ?? `${p.cliente}|${p.codigoProduto}`

/**
 * Monitoramento das integrações: pedidos e produtos que falharam, atualizados a cada 10s.
 * Somente leitura. Usa a mesma sessão do portal (JWT do Monint).
 */
export function Monitoramento() {
  const [subAba, setSubAba] = useState<SubAba>('pedidos')
  const [carregando, setCarregando] = useState(true)

  const [pedidos, setPedidos] = useState<PedidoComErro[]>([])
  const [produtos, setProdutos] = useState<ProdutoComErro[]>([])
  // O total vem da resposta da API, não da lista mesclada.
  const [totalPedidos, setTotalPedidos] = useState(0)
  const [totalProdutos, setTotalProdutos] = useState(0)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS)
  const primeiraCarga = useRef(true)

  useEffect(() => {
    let ativo = true

    function carregar() {
      const buscaPedidos = apiGet<PedidoComErro[]>('/pendentes?status=2')
        .then((recebidos) => {
          if (!ativo) return
          setPedidos((atual) => mesclar(atual, recebidos, (p) => p.codigoPedido))
          setTotalPedidos(recebidos.length)
          setUltimaAtualizacao(new Date())
        })
        .catch((e: unknown) => console.error('[MONITORAMENTO] Erro ao carregar pedidos', e))

      const buscaProdutos = apiGet<ProdutoComErro[]>('/produtos')
        // A API chama o campo de mensagemErro; o monitoramento antigo lia "erro" e a coluna vinha vazia.
        .then((brutos) => brutos.map((p) => ({ ...p, erro: p.mensagemErro ?? p.erro })))
        .then((recebidos) => {
          if (!ativo) return
          setProdutos((atual) => mesclar(atual, recebidos, chaveProduto))
          setTotalProdutos(recebidos.length)
          setUltimaAtualizacao(new Date())
        })
        .catch((e: unknown) => console.error('[MONITORAMENTO] Erro ao carregar produtos', e))

      // Falha numa atualização não limpa a tela: fica o último retrato bom até a próxima.
      Promise.all([buscaPedidos, buscaProdutos]).finally(() => {
        if (ativo && primeiraCarga.current) {
          primeiraCarga.current = false
          setCarregando(false)
        }
      })
    }

    carregar()
    const intervalo = setInterval(carregar, INTERVALO_ATUALIZACAO_MS)
    return () => {
      ativo = false
      clearInterval(intervalo)
    }
  }, [])

  const dadosDaAba: ItemFiltravel[] = subAba === 'pedidos' ? pedidos : produtos

  const clientes = useMemo(
    () => Array.from(new Set(dadosDaAba.map((i) => i.cliente))).sort(),
    [dadosDaAba],
  )
  const plataformas = useMemo(
    () =>
      Array.from(
        new Set(dadosDaAba.map((i) => i.plataforma).filter((p): p is string => !!p)),
      ).sort(),
    [dadosDaAba],
  )
  const clientesAfetados = useMemo(
    () => new Set([...pedidos, ...produtos].map((i) => (i.cliente ?? '').toUpperCase())).size,
    [pedidos, produtos],
  )

  const pedidosFiltrados = useMemo(
    () => filtrar(pedidos, filtros, (p) => p.codigoPedido),
    [pedidos, filtros],
  )
  const produtosFiltrados = useMemo(
    () => filtrar(produtos, filtros, (p) => p.codigoProduto),
    [produtos, filtros],
  )

  function trocarSubAba(nova: SubAba) {
    setSubAba(nova)
    setFiltros(FILTROS_VAZIOS)
  }

  function alterarFiltro(campo: keyof Filtros, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor }))
  }

  const ehPedidos = subAba === 'pedidos'
  const total = ehPedidos ? totalPedidos : totalProdutos
  const semErros = (ehPedidos ? pedidos : produtos).length === 0
  const visiveis = ehPedidos ? pedidosFiltrados.length : produtosFiltrados.length
  const temFiltro = Object.values(filtros).some(Boolean)
  const termo = ehPedidos ? 'pedido' : 'produto'

  if (carregando) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <Carregando />
      </div>
    )
  }

  const colunas = [
    { rotulo: ehPedidos ? 'Pedido' : 'Produto' },
    { rotulo: 'Cliente' },
    { rotulo: 'Plataforma' },
    ...(ehPedidos ? [] : [{ rotulo: 'Data/Hora' }]),
    { rotulo: 'Erro', className: 'w-full' },
    { rotulo: 'Rotina' },
  ]

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CartaoResumo
          rotulo="Pedidos com erro"
          valor={totalPedidos}
          destaque={totalPedidos > 0}
          icone={<IconeCaixa />}
        />
        <CartaoResumo
          rotulo="Produtos com erro"
          valor={totalProdutos}
          destaque={totalProdutos > 0}
          icone={<IconeEtiqueta />}
        />
        <CartaoResumo rotulo="Clientes afetados" valor={clientesAfetados} icone={<IconePessoas />} />
      </div>

      <CartaoConsulta
        cabecalho={
          <>
            <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist">
              {(
                [
                  { id: 'pedidos', rotulo: 'Pedidos', contador: totalPedidos, icone: <IconeCaixa /> },
                  { id: 'produtos', rotulo: 'Produtos', contador: totalProdutos, icone: <IconeEtiqueta /> },
                ] as const
              ).map(({ id, rotulo, contador, icone }) => {
                const ativa = subAba === id
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={ativa}
                    onClick={() => trocarSubAba(id)}
                    className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm transition-all duration-150 ${
                      ativa
                        ? 'bg-white text-indigo-600 font-semibold shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500 font-medium hover:text-slate-700'
                    }`}
                  >
                    <span className="h-4 w-4">{icone}</span>
                    {rotulo}
                    <span
                      className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                        contador === 0
                          ? 'bg-slate-200 text-slate-500'
                          : ativa
                            ? 'bg-red-100 text-red-700'
                            : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {contador}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>
                Ao vivo · atualiza a cada 10s
                {ultimaAtualizacao && (
                  <span className="text-slate-400">
                    {' '}
                    · última às {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
                  </span>
                )}
              </span>
            </div>
          </>
        }
        filtros={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.3fr_auto] gap-3 items-center">
            <CampoBusca
              id="filtroCodigo"
              aria-label={ehPedidos ? 'Pedido' : 'Produto'}
              placeholder={ehPedidos ? 'Buscar pedido…' : 'Buscar produto…'}
              value={filtros.codigo}
              onChange={(v) => alterarFiltro('codigo', v)}
            />
            <SelectFiltro
              id="filtroCliente"
              aria-label="Cliente"
              value={filtros.cliente}
              onChange={(v) => alterarFiltro('cliente', v)}
            >
              <option value="">Todos os clientes</option>
              {clientes.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </SelectFiltro>
            <SelectFiltro
              id="filtroPlataformaMonitor"
              aria-label="Plataforma"
              value={filtros.plataforma}
              onChange={(v) => alterarFiltro('plataforma', v)}
            >
              <option value="">Todas as plataformas</option>
              {plataformas.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </SelectFiltro>
            <CampoBusca
              id="filtroErro"
              aria-label="Erro"
              placeholder="Buscar na mensagem de erro…"
              value={filtros.erro}
              onChange={(v) => alterarFiltro('erro', v)}
            />
            <BotaoLimpar onClick={() => setFiltros(FILTROS_VAZIOS)} disabled={!temFiltro} />
          </div>
        }
        rodape={semErros ? undefined : <RodapeContagem visiveis={visiveis} total={total} />}
      >
        {semErros ? (
          <EstadoVazio
            tom="sucesso"
            icone={<IconeCheck />}
            titulo={`Nenhum ${termo} com erro`}
            texto={`Todos os ${termo}s foram processados com sucesso!`}
          />
        ) : visiveis === 0 ? (
          <EstadoVazio
            icone={<IconeLupa />}
            texto={`Nenhum ${termo} encontrado com os filtros aplicados.`}
            acao={
              <button
                type="button"
                onClick={() => setFiltros(FILTROS_VAZIOS)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Limpar filtros
              </button>
            }
          />
        ) : (
          <Tabela colunas={colunas}>
            {ehPedidos
              ? pedidosFiltrados.map((p) => (
                  <Linha key={p.codigoPedido}>
                    <Celula primeira className="whitespace-nowrap">
                      <Codigo>{p.codigoPedido}</Codigo>
                    </Celula>
                    <CelulaCliente nome={p.cliente} />
                    <Celula className="whitespace-nowrap">
                      <EtiquetaPlataforma nome={p.plataforma} />
                    </Celula>
                    <CelulaErro texto={p.erro || 'Erro desconhecido'} />
                    <CelulaRotina texto={p.rotina?.toUpperCase() || 'Não Informado'} vazia={!p.rotina} />
                  </Linha>
                ))
              : produtosFiltrados.map((p) => {
                  const quando = formatarDataHora(p.dataErro)
                  return (
                    <Linha key={chaveProduto(p)}>
                      <Celula primeira className="whitespace-nowrap">
                        <Codigo>{p.codigoProduto}</Codigo>
                      </Celula>
                      <CelulaCliente nome={p.cliente} />
                      <Celula className="whitespace-nowrap">
                        <EtiquetaPlataforma nome={p.plataforma} />
                      </Celula>
                      <Celula className="whitespace-nowrap tabular-nums">
                        {quando ? (
                          <>
                            <div className="text-slate-700">{quando.data}</div>
                            <div className="text-xs text-slate-400">{quando.hora}</div>
                          </>
                        ) : (
                          <span className="text-slate-700">{p.dataErro}</span>
                        )}
                      </Celula>
                      <CelulaErro texto={p.erro || 'Erro desconhecido'} />
                      <CelulaRotina texto={p.rotina?.toUpperCase() || 'N/A'} vazia={!p.rotina} />
                    </Linha>
                  )
                })}
          </Tabela>
        )}
      </CartaoConsulta>
    </div>
  )
}

/* ---------- Peças específicas do monitoramento ---------- */

function CartaoResumo({
  rotulo,
  valor,
  icone,
  destaque = false,
}: {
  rotulo: string
  valor: number
  icone: ReactNode
  destaque?: boolean
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex items-center gap-4">
      <div
        className={`h-11 w-11 shrink-0 rounded-lg flex items-center justify-center ${
          destaque ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
        }`}
      >
        <span className="h-5 w-5">{icone}</span>
      </div>
      <div>
        <p className="text-sm text-slate-500">{rotulo}</p>
        <p className="text-2xl font-semibold text-slate-800 tabular-nums leading-tight">{valor}</p>
      </div>
    </div>
  )
}

function CelulaCliente({ nome }: { nome?: string | null }) {
  return (
    <Celula className="font-medium text-slate-800 whitespace-nowrap">
      {nome ? nome.toUpperCase() : <span className="font-normal text-slate-400">N/A</span>}
    </Celula>
  )
}

/** Erro em até duas linhas; clicar abre o texto inteiro. */
function CelulaErro({ texto }: { texto: string }) {
  const [aberto, setAberto] = useState(false)
  const longo = texto.length > 120
  return (
    <Celula className="min-w-[20rem]">
      <div className="flex gap-2">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
        <div className="min-w-0">
          <p
            className={`text-slate-600 break-words leading-relaxed ${aberto ? '' : 'line-clamp-2'}`}
            title={aberto ? undefined : texto}
          >
            {texto}
          </p>
          {longo && (
            <button
              type="button"
              onClick={() => setAberto((a) => !a)}
              className="mt-0.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              {aberto ? 'Ver menos' : 'Ver mais'}
            </button>
          )}
        </div>
      </div>
    </Celula>
  )
}

function CelulaRotina({ texto, vazia }: { texto: string; vazia: boolean }) {
  return (
    <Celula ultima className="whitespace-nowrap">
      {vazia ? (
        <span className="text-xs text-slate-400">{texto}</span>
      ) : (
        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
          {texto}
        </span>
      )}
    </Celula>
  )
}
