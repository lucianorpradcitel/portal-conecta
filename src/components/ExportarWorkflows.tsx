import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ApiError } from '../services/api'
import {
  LIMITE_LISTA,
  ROTULOS_PADRAO,
  SEM_FILTROS,
  baixarZip,
  listarInstancias,
  listarOpcoes,
  listarPastas,
  previa,
  temFiltro,
  type Filtros,
  type InstanciaN8n,
  type ItemWorkflow,
  type MapaPastas,
  type OpcaoFiltro,
  type Previa,
} from '../services/workflows'
import { ArvoreWorkflows } from './ArvoreWorkflows'
import { ExploradorWorkflows } from './ExploradorWorkflows'
import { Alerta } from './ui/Alerta'
import { Botao } from './ui/Botao'
import { Campo } from './ui/Campo'
import { DivisorVertical, gravarPreferencia, lerPreferencia } from './ui/DivisorVertical'
import { IconeX } from './ui/Icones'
import { Select } from './ui/Select'

/** Espera o usuário parar de digitar antes de consultar a prévia. */
const ATRASO_PREVIA_MS = 350

/** Parte da largura que o painel do resultado ocupa (a de fábrica é 3/5) e quanto ela pode variar ao arrastar a barra. */
const FRACAO_PADRAO = 0.6
const CHAVE_FRACAO = 'conecta.wf.largura-resultado'
/** Larguras mínimas, em px, que cada painel mantém, e a da própria barra (1 rem). */
const PAINEL_ESQ_MIN_PX = 360
const PAINEL_DIR_MIN_PX = 288
const BARRA_PX = 16

const CLASSE_ACAO_TEXTO =
  'text-[13px] font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline'

function mensagemDe(e: unknown, padrao: string) {
  return e instanceof ApiError ? e.message : padrao
}

/** Os dois painéis (resultado e exportação) têm a mesma altura e rolam por dentro, lado a lado. */
function Painel({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex h-[36rem] min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200/80">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <h4 className="text-sm font-semibold text-slate-800">{titulo}</h4>
        {acao}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-slate-400">{children}</p>
}

function BotaoLinha({
  rotulo,
  aoClicar,
  desabilitado,
  children,
}: {
  rotulo: string
  aoClicar: () => void
  desabilitado?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      onClick={aoClicar}
      disabled={desabilitado}
      className="h-6 w-6 shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:text-emerald-500 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

/**
 * Escolhe a instância do n8n, filtra os workflows e monta a lista final do que será exportado. Ao escolher
 * a instância, ela já é listada inteira; os filtros só refinam.
 *
 * Cada instância nomeia os workflows de um jeito (a produção usa Categoria_Plataforma_Etapa, as outras
 * Cliente_Base_Etapa), e os rótulos dos dois filtros vêm do n8n junto com a lista de instâncias. Por dentro,
 * o primeiro filtro é sempre `cliente` e o segundo `base` (estado, parâmetros do webhook portal-wf).
 *
 * Há duas listas: o resultado do filtro (que muda a cada busca) e a lista para exportar (que
 * acumula entre buscas). O ZIP leva exatamente a segunda, identificada por ID.
 */
export function ExportarWorkflows() {
  const [instancias, setInstancias] = useState<InstanciaN8n[]>([])
  const [instancia, setInstancia] = useState('')
  const [clientes, setClientes] = useState<OpcaoFiltro[]>([])
  const [bases, setBases] = useState<OpcaoFiltro[]>([])
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTROS)
  const [resultado, setResultado] = useState<Previa | null>(null)
  const [escolhidos, setEscolhidos] = useState<ItemWorkflow[]>([])
  // Pastas do n8n: vêm de um pacote exportado, demoram alguns segundos e são um extra (sem elas a tela
  // segue funcionando por nome, tag e chamadas).
  const [mapaPastas, setMapaPastas] = useState<MapaPastas | null>(null)
  const [carregandoPastas, setCarregandoPastas] = useState(false)
  const [erroPastas, setErroPastas] = useState<string | null>(null)
  const [visao, setVisao] = useState<'pastas' | 'chamadas'>('pastas')

  const [carregandoInstancias, setCarregandoInstancias] = useState(true)
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(false)
  const [carregandoPrevia, setCarregandoPrevia] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [baixado, setBaixado] = useState<string | null>(null)
  /** Parte em andamento quando "Baixar tudo" gera vários ZIPs. */
  const [progresso, setProgresso] = useState<{ parte: number; de: number } | null>(null)

  useEffect(() => {
    let cancelado = false
    listarInstancias()
      .then((lista) => {
        if (cancelado) {
          return
        }
        setInstancias(lista)
        // Com uma única instância não há o que escolher.
        if (lista.length === 1) {
          setInstancia(lista[0].id)
        }
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setErro(mensagemDe(e, 'Não foi possível carregar as instâncias.'))
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCarregandoInstancias(false)
        }
      })
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    // Os IDs são de cada instância: trocar de instância zera filtros e lista.
    setFiltros(SEM_FILTROS)
    setClientes([])
    setBases([])
    setResultado(null)
    setEscolhidos([])
    setBaixado(null)
    if (!instancia) {
      return
    }

    let cancelado = false
    setErro(null)
    setCarregandoOpcoes(true)
    listarOpcoes(instancia)
      .then((opcoes) => {
        if (!cancelado) {
          setClientes(opcoes.clientes)
          setBases(opcoes.bases)
        }
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setErro(mensagemDe(e, 'Não foi possível carregar os filtros desta instância.'))
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCarregandoOpcoes(false)
        }
      })
    return () => {
      cancelado = true
    }
  }, [instancia])

  useEffect(() => {
    setMapaPastas(null)
    setErroPastas(null)
    setVisao('pastas')
    if (!instancia) {
      setCarregandoPastas(false)
      return
    }

    let cancelado = false
    setCarregandoPastas(true)
    listarPastas(instancia)
      .then((mapa) => {
        if (!cancelado) {
          setMapaPastas(mapa)
          setErroPastas(mapa.erro ?? null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setMapaPastas({ pastas: [], workflows: {} })
          setErroPastas(mensagemDe(e, 'Não foi possível carregar as pastas desta instância.'))
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCarregandoPastas(false)
        }
      })
    return () => {
      cancelado = true
    }
  }, [instancia])

  // O resultado acompanha os filtros.
  useEffect(() => {
    setResultado(null)
    if (!instancia) {
      setCarregandoPrevia(false)
      return
    }

    let cancelado = false
    setCarregandoPrevia(true)
    const espera = setTimeout(() => {
      previa(instancia, filtros)
        .then((dados) => {
          if (!cancelado) {
            setResultado(dados)
          }
        })
        .catch((e: unknown) => {
          if (!cancelado) {
            setErro(mensagemDe(e, 'Não foi possível consultar os workflows.'))
          }
        })
        .finally(() => {
          if (!cancelado) {
            setCarregandoPrevia(false)
          }
        })
    }, ATRASO_PREVIA_MS)

    return () => {
      cancelado = true
      clearTimeout(espera)
    }
  }, [instancia, filtros])

  const pastas = mapaPastas?.pastas ?? []
  const temPastas = pastas.length > 0
  const pastaPorId = useMemo(() => new Map(pastas.map((p) => [p.id, p])), [pastas])

  /** Nomes das pastas da raiz até a pasta (a pasta dentro de outra, dentro de outra...). */
  function caminhoDaPasta(id: string): string[] {
    const nomes: string[] = []
    let atual = pastaPorId.get(id)
    for (let i = 0; atual && i < 30; i++) {
      nomes.unshift(atual.nome)
      atual = atual.pai ? pastaPorId.get(atual.pai) : undefined
    }
    return nomes
  }

  /** "multi-tenant / Tray": onde o workflow está no n8n (vazio se está fora de pasta). */
  function caminhoTexto(id: string): string {
    const pasta = mapaPastas?.workflows[id]
    return pasta ? caminhoDaPasta(pasta).join(' / ') : ''
  }

  // O resultado só aparece quando os workflows E as pastas chegaram: mostrar os workflows antes faria a lista
  // inteira aparecer solta na raiz e depois pular para dentro das pastas.
  const carregandoTudo = Boolean(instancia) && (carregandoPrevia || carregandoPastas || mapaPastas === null)

  const visiveis = useMemo(() => resultado?.workflows ?? [], [resultado])

  const idsEscolhidos = useMemo(() => new Set(escolhidos.map((w) => w.id)), [escolhidos])
  // A lista de exportação segue a ordem de um explorador: por pasta e, dentro dela, por nome.
  const escolhidosOrdenados = useMemo(
    () =>
      [...escolhidos].sort((a, b) =>
        `${caminhoTexto(a.id)}/${a.nome}`.localeCompare(`${caminhoTexto(b.id)}/${b.nome}`, 'pt-BR', {
          sensitivity: 'base',
          numeric: true,
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [escolhidos, mapaPastas, pastaPorId],
  )
  const aAdicionar = visiveis.filter((w) => !idsEscolhidos.has(w.id))
  // Largura dos dois painéis: o usuário arrasta a barra entre eles (lembrada neste navegador).
  const gradeRef = useRef<HTMLDivElement>(null)
  const [fracaoEsq, setFracaoEsq] = useState(() => lerPreferencia(CHAVE_FRACAO, FRACAO_PADRAO, 0.2, 0.85))

  function larguraGrade() {
    return gradeRef.current?.getBoundingClientRect().width ?? 0
  }

  /** Define a largura do painel da esquerda (px), respeitando o mínimo dos dois lados. */
  function ajustarColunas(esquerdaPx: number) {
    const largura = larguraGrade()
    if (!largura) {
      return
    }
    const util = largura - BARRA_PX
    const maximo = util - PAINEL_DIR_MIN_PX
    const px = maximo < PAINEL_ESQ_MIN_PX ? util / 2 : Math.min(Math.max(esquerdaPx, PAINEL_ESQ_MIN_PX), maximo)
    const fracao = px / largura
    setFracaoEsq(fracao)
    gravarPreferencia(CHAVE_FRACAO, fracao)
  }

  const cheia = escolhidos.length >= LIMITE_LISTA
  const vagas = Math.max(0, LIMITE_LISTA - escolhidos.length)
  const total = resultado?.total ?? 0

  function alterar(campo: 'cliente' | 'base' | 'busca', valor: string) {
    setErro(null)
    setBaixado(null)
    setFiltros((atual) => ({ ...atual, [campo]: valor }))
  }

  function alterarComuns(valor: boolean) {
    setErro(null)
    setBaixado(null)
    setFiltros((atual) => ({ ...atual, comuns: valor }))
  }

  function ordenar(lista: ItemWorkflow[]) {
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome))
  }

  function adicionar(itens: ItemWorkflow[]) {
    setBaixado(null)
    setEscolhidos((atual) => {
      const ja = new Set(atual.map((w) => w.id))
      const novos = itens.filter((w) => !ja.has(w.id))
      return ordenar([...atual, ...novos].slice(0, LIMITE_LISTA))
    })
  }

  function remover(id: string) {
    setBaixado(null)
    setEscolhidos((atual) => atual.filter((w) => w.id !== id))
  }

  // O ZIP repete as pastas do n8n a partir da raiz, com os nomes originais (ex.: Mercos/Paulinho Motos/...), de modo
  // que extrair um ou vários ZIPs na mesma pasta remonta a mesma hierarquia. "/" dentro de um nome viraria um nível a mais.
  function pastaNoZip(id: string) {
    const pasta = mapaPastas?.workflows[id]
    return pasta ? caminhoDaPasta(pasta).map((n) => n.replace(/[\\/]+/g, '-')).join('/') : null
  }

  function salvarArquivo(blob: Blob, nome: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nome
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function baixar() {
    if (!instancia || escolhidos.length === 0) {
      return
    }
    setErro(null)
    setBaixado(null)
    setBaixando(true)
    try {
      const { blob, nomeArquivo } = await baixarZip(
        instancia,
        escolhidos.map((w) => w.id),
        temPastas ? pastaNoZip : undefined,
      )
      const nome = nomeArquivo ?? `workflows_${instancia}.zip`
      salvarArquivo(blob, nome)
      setBaixado(nome)
    } catch (e) {
      setErro(mensagemDe(e, 'Não foi possível gerar o ZIP.'))
    } finally {
      setBaixando(false)
    }
  }

  /**
   * Baixa tudo o que o resultado do filtro mostra, em vários ZIPs de até LIMITE_LISTA workflows cada. A ordem é a de
   * um explorador (por pasta e nome), então cada parte leva as pastas quase inteiras, e as partes juntas, extraídas
   * na mesma pasta, formam a hierarquia completa.
   */
  async function baixarTudo() {
    if (!instancia || visiveis.length === 0) {
      return
    }
    const ordenados = [...visiveis].sort((a, b) =>
      `${caminhoTexto(a.id)}/${a.nome}`.localeCompare(`${caminhoTexto(b.id)}/${b.nome}`, 'pt-BR', {
        sensitivity: 'base',
        numeric: true,
      }),
    )
    const partes: ItemWorkflow[][] = []
    for (let i = 0; i < ordenados.length; i += LIMITE_LISTA) {
      partes.push(ordenados.slice(i, i + LIMITE_LISTA))
    }

    setErro(null)
    setBaixado(null)
    setBaixando(true)
    let feitas = 0
    try {
      let base = ''
      for (let i = 0; i < partes.length; i++) {
        setProgresso({ parte: i + 1, de: partes.length })
        const { blob, nomeArquivo } = await baixarZip(
          instancia,
          partes[i].map((w) => w.id),
          temPastas ? pastaNoZip : undefined,
        )
        if (!base) {
          base = (nomeArquivo ?? `workflows_${instancia}.zip`).replace(/\.zip$/i, '')
        }
        salvarArquivo(blob, partes.length > 1 ? `${base}_parte${i + 1}de${partes.length}.zip` : `${base}.zip`)
        feitas += 1
        if (i < partes.length - 1) {
          // Pausa curta: o navegador pode recusar vários downloads disparados no mesmo instante.
          await new Promise((resolve) => setTimeout(resolve, 800))
        }
      }
      setBaixado(
        partes.length > 1
          ? `${partes.length} arquivos (${base}_parte1de${partes.length}.zip …). Extraia todos na mesma pasta para ter a hierarquia completa.`
          : `${base}.zip`,
      )
    } catch (e) {
      const parcial = feitas > 0 ? ` As partes 1 a ${feitas} (de ${partes.length}) já foram baixadas.` : ''
      setErro(`${mensagemDe(e, 'Não foi possível gerar o ZIP.')}${parcial}`)
    } finally {
      setBaixando(false)
      setProgresso(null)
    }
  }

  const ocupado = carregandoOpcoes || baixando
  const rotulos = instancias.find((i) => i.id === instancia)?.rotulos ?? ROTULOS_PADRAO
  const filtrosAtivos = temFiltro(filtros)

  function limparFiltros() {
    setErro(null)
    setBaixado(null)
    setFiltros({ ...SEM_FILTROS, comuns: filtros.comuns })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-surface shadow-card">
      <div className="space-y-4 px-5 py-5">
        {/* Faixa de filtros: tudo em uma linha, sem textos soltos (as explicações ficam em "Como funcionam") */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            id="instancia"
            label="Instância do n8n"
            value={instancia}
            disabled={carregandoInstancias || baixando}
            onChange={(e) => setInstancia(e.target.value)}
          >
            <option value="">{carregandoInstancias ? 'Carregando…' : 'Selecione'}</option>
            {instancias.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </Select>

          <Select
            id="filtro-cliente"
            label={rotulos.primeiro}
            title={rotulos.ajudaPrimeiro}
            value={filtros.cliente}
            disabled={!instancia || ocupado}
            onChange={(e) => alterar('cliente', e.target.value)}
          >
            <option value="">{carregandoOpcoes ? 'Carregando…' : rotulos.todosPrimeiro}</option>
            {clientes.map((c) => (
              <option key={c.nome} value={c.nome}>
                {c.nome} ({c.total})
              </option>
            ))}
          </Select>

          <Select
            id="filtro-base"
            label={rotulos.segundo}
            title={rotulos.ajudaSegundo}
            value={filtros.base}
            disabled={!instancia || ocupado}
            onChange={(e) => alterar('base', e.target.value)}
          >
            <option value="">{carregandoOpcoes ? 'Carregando…' : rotulos.todosSegundo}</option>
            {bases.map((b) => (
              <option key={b.nome} value={b.nome}>
                {b.nome} ({b.total})
              </option>
            ))}
          </Select>

          <Campo
            id="filtro-busca"
            label="O nome contém"
            title="Procura o trecho em qualquer parte do nome"
            placeholder="ex.: pedido"
            value={filtros.busca}
            disabled={!instancia || ocupado}
            onChange={(e) => alterar('busca', e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <label
            className={`flex items-center gap-2 ${temFiltro(filtros) ? 'text-slate-700' : 'text-slate-400'}`}
            title="Com qualquer filtro (inclusive o campo O nome contém), junta também os sub-workflows que os encontrados chamam (e os que esses chamam)"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={filtros.comuns}
              disabled={!instancia || !temFiltro(filtros) || ocupado}
              onChange={(e) => alterarComuns(e.target.checked)}
            />
            Incluir os workflows comuns
            <span className="text-[13px] text-slate-400">(sub-workflows que eles chamam)</span>
          </label>

          <button type="button" className={CLASSE_ACAO_TEXTO} disabled={!filtrosAtivos || ocupado} onClick={limparFiltros}>
            Limpar filtros
          </button>

          {instancia && carregandoPastas && <span className="text-[13px] text-slate-400">Carregando as pastas do n8n…</span>}

          <details className="text-[13px] text-slate-500 sm:ml-auto">
            <summary className="cursor-pointer select-none font-medium text-slate-600 hover:text-slate-900">
              Como funcionam os filtros
            </summary>
            <p className="mt-2 max-w-2xl leading-relaxed">
              Nesta instância os nomes seguem <code>{rotulos.padrao}</code>: em <code>LAB_Mercos_Pedido_Captura</code>,{' '}
              <code>LAB</code> é o filtro “{rotulos.primeiro}” e <code>Mercos</code> é “{rotulos.segundo}”. A etiqueta
              (tag) do workflow também vale nesses dois filtros. Os filtros se combinam, e sem nenhum a instância é
              listada inteira. Workflows arquivados não entram.
            </p>
          </details>
        </div>

        {instancia && erroPastas && (
          <p className="text-[13px] text-amber-700">
            Pastas indisponíveis ou incompletas nesta instância: {erroPastas} A chave da credencial precisa dos
            escopos de listar pastas e de exportar workflows. Nome, tag e chamadas continuam funcionando.
          </p>
        )}

        {erro && <Alerta tom="erro">{erro}</Alerta>}

        {/* Esquerda: o que há na instância. Direita: o que vai no ZIP. */}
        <div
          ref={gradeRef}
          style={{ '--esq': `${(fracaoEsq * 100).toFixed(2)}%` } as CSSProperties}
          className="grid gap-4 xl:grid-cols-[minmax(0,var(--esq))_1rem_minmax(0,1fr)] xl:gap-0"
        >
          <Painel
            titulo={
              !instancia
                ? 'Resultado do filtro'
                : carregandoTudo
                  ? 'Resultado do filtro: carregando…'
                  : `Resultado do filtro (${total})`
            }
            acao={
              <div className="flex items-center gap-3">
                {temPastas && (
                  <div className="flex items-center gap-0.5 rounded-md bg-slate-100/80 p-0.5" role="tablist" aria-label="Como mostrar o resultado">
                    {(
                      [
                        { id: 'pastas', rotulo: 'Explorador' },
                        { id: 'chamadas', rotulo: 'Por chamadas' },
                      ] as const
                    ).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        role="tab"
                        aria-selected={visao === v.id}
                        onClick={() => setVisao(v.id)}
                        className={`rounded px-2.5 py-1 text-[12px] font-medium transition-colors ${
                          visao === v.id ? 'bg-surface text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {v.rotulo}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className={CLASSE_ACAO_TEXTO}
                  disabled={carregandoTudo || aAdicionar.length === 0 || cheia || baixando}
                  onClick={() => adicionar(aAdicionar)}
                >
                  Adicionar todos
                  {!carregandoTudo && aAdicionar.length > 0
                    ? aAdicionar.length > vagas
                      ? ` (${vagas} de ${aAdicionar.length})`
                      : ` (${aAdicionar.length})`
                    : ''}
                </button>
              </div>
            }
          >
            {!instancia ? (
              <Vazio>Escolha a instância.</Vazio>
            ) : carregandoTudo ? (
              <Vazio>Carregando workflows e pastas…</Vazio>
            ) : resultado && visiveis.length === 0 ? (
              <Vazio>Nenhum workflow neste filtro.</Vazio>
            ) : (
              <>
                {temPastas && visao === 'pastas' ? (
                  <ExploradorWorkflows
                    nomeRaiz={instancias.find((i) => i.id === instancia)?.nome ?? ''}
                    itens={visiveis}
                    pastas={pastas}
                    mapa={mapaPastas?.workflows ?? {}}
                    jaAdicionados={idsEscolhidos}
                    desabilitado={cheia || baixando}
                    vagas={vagas}
                    aoAdicionar={adicionar}
                  />
                ) : (
                  <ArvoreWorkflows
                    itens={visiveis}
                    jaAdicionados={idsEscolhidos}
                    desabilitado={cheia || baixando}
                    aoAdicionar={adicionar}
                  />
                )}
                {resultado?.avisos && resultado.avisos.dinamicos + resultado.avisos.naoResolvidos > 0 && (
                  <p
                    className="shrink-0 border-t border-slate-100 px-4 py-1.5 text-[13px] text-amber-700"
                    title={resultado.avisos.exemplos.join('\n')}
                  >
                    {resultado.avisos.naoResolvidos > 0 &&
                      `${resultado.avisos.naoResolvidos} chamada(s) a workflow inexistente ou arquivado`}
                    {resultado.avisos.naoResolvidos > 0 && resultado.avisos.dinamicos > 0 && '; '}
                    {resultado.avisos.dinamicos > 0 &&
                      `${resultado.avisos.dinamicos} chamada(s) por expressão`}{' '}
                    não puderam ser seguidas, então podem faltar sub-workflows. Passe o mouse para ver exemplos.
                  </p>
                )}
                {resultado && total > resultado.workflows.length && (
                  <p className="shrink-0 border-t border-slate-100 px-4 py-1.5 text-sm text-slate-400">
                    …e mais {total - resultado.workflows.length}. Refine o filtro para ver o restante.
                  </p>
                )}
              </>
            )}
          </Painel>

          <DivisorVertical
            rotulo="Largura dos painéis do resultado e da exportação"
            className="hidden xl:flex"
            aoArrastar={(x) =>
              ajustarColunas(x - (gradeRef.current?.getBoundingClientRect().left ?? 0) - BARRA_PX / 2)
            }
            aoTeclar={(sentido) => ajustarColunas(fracaoEsq * larguraGrade() + sentido * 24)}
            aoRestaurar={() => ajustarColunas(FRACAO_PADRAO * larguraGrade())}
          />

          <Painel
            titulo={`Para exportar (${escolhidos.length})`}
            acao={
              <button
                type="button"
                className={CLASSE_ACAO_TEXTO}
                disabled={escolhidos.length === 0 || baixando}
                onClick={() => setEscolhidos([])}
              >
                Remover todos
              </button>
            }
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              {escolhidos.length === 0 ? (
                <Vazio>Adicione workflows pelo resultado ao lado. A lista se mantém ao trocar de filtro.</Vazio>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm text-slate-600">
                  {escolhidosOrdenados.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 px-4 py-1.5">
                      <span
                        className="min-w-0 flex-1 truncate"
                        title={caminhoTexto(w.id) ? `${caminhoTexto(w.id)} / ${w.nome}` : w.nome}
                      >
                        {caminhoTexto(w.id) && <span className="text-[12px] text-slate-400">{caminhoTexto(w.id)} / </span>}
                        {w.nome}
                      </span>
                      <BotaoLinha rotulo={`Remover ${w.nome}`} aoClicar={() => remover(w.id)} desabilitado={baixando}>
                        <IconeX />
                      </BotaoLinha>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="shrink-0 space-y-2 border-t border-slate-100 bg-slate-50/50 p-3">
              {cheia && (
                <p className="text-[13px] text-amber-700">
                  A lista chegou ao limite de {LIMITE_LISTA} workflows por ZIP. Baixe este e monte outro para o restante,
                  ou use “Baixar tudo do resultado”, que divide em vários ZIPs.
                </p>
              )}
              {baixado && (
                <Alerta tom="sucesso" titulo="ZIP gerado">
                  {baixado}
                </Alerta>
              )}
              <Botao type="button" className="w-full" onClick={baixar} disabled={escolhidos.length === 0 || baixando}>
                {baixando
                  ? progresso
                    ? `Gerando parte ${progresso.parte} de ${progresso.de}…`
                    : 'Gerando ZIP…'
                  : `Baixar ZIP${escolhidos.length > 0 ? ` (${escolhidos.length})` : ''}`}
              </Botao>
              <Botao
                type="button"
                variante="secundario"
                className="w-full"
                onClick={baixarTudo}
                disabled={carregandoTudo || visiveis.length === 0 || baixando}
                title="Baixa todos os workflows do resultado do filtro, sem precisar adicioná-los à lista, em ZIPs de até 300 cada"
              >
                {visiveis.length === 0 || carregandoTudo
                  ? 'Baixar tudo do resultado'
                  : `Baixar tudo do resultado (${visiveis.length}${
                      visiveis.length > LIMITE_LISTA ? `, ${Math.ceil(visiveis.length / LIMITE_LISTA)} ZIPs` : ''
                    })`}
              </Botao>
              <p className="text-[12px] leading-snug text-slate-500">
                <strong className="font-semibold text-amber-700">Cuidado:</strong> os JSONs podem conter senhas e tokens em
                texto puro dentro dos nodes. Guarde o ZIP com cuidado; cada exportação fica registrada com o seu e-mail e
                os nomes dos workflows.
              </p>
            </div>
          </Painel>
        </div>
      </div>
    </div>
  )
}
