import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../services/api'
import {
  LIMITE_LISTA,
  ROTULOS_PADRAO,
  SEM_FILTROS,
  baixarZip,
  listarInstancias,
  listarOpcoes,
  previa,
  type Filtros,
  type InstanciaN8n,
  type ItemWorkflow,
  type OpcaoFiltro,
  type Previa,
} from '../services/workflows'
import { ArvoreWorkflows } from './ArvoreWorkflows'
import { Alerta } from './ui/Alerta'
import { Botao } from './ui/Botao'
import { Campo } from './ui/Campo'
import { IconeX } from './ui/Icones'
import { Select } from './ui/Select'

/** Espera o usuário parar de digitar antes de consultar a prévia. */
const ATRASO_PREVIA_MS = 350

const CLASSE_ACAO_TEXTO =
  'text-[13px] font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline'

function mensagemDe(e: unknown, padrao: string) {
  return e instanceof ApiError ? e.message : padrao
}

function Painel({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col rounded-lg border border-slate-200/80">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <h4 className="text-sm font-medium text-slate-700">{titulo}</h4>
        {acao}
      </div>
      {children}
    </div>
  )
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-slate-400">{children}</p>
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

  const [carregandoInstancias, setCarregandoInstancias] = useState(true)
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(false)
  const [carregandoPrevia, setCarregandoPrevia] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [baixado, setBaixado] = useState<string | null>(null)

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

  const idsEscolhidos = useMemo(() => new Set(escolhidos.map((w) => w.id)), [escolhidos])
  const aAdicionar = resultado?.workflows.filter((w) => !idsEscolhidos.has(w.id)) ?? []
  const cheia = escolhidos.length >= LIMITE_LISTA
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
      )
      const nome = nomeArquivo ?? `workflows_${instancia}.zip`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = nome
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setBaixado(nome)
    } catch (e) {
      setErro(mensagemDe(e, 'Não foi possível gerar o ZIP.'))
    } finally {
      setBaixando(false)
    }
  }

  const ocupado = carregandoOpcoes || baixando
  const rotulos = instancias.find((i) => i.id === instancia)?.rotulos ?? ROTULOS_PADRAO

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-surface shadow-card">
      <div className="space-y-6 px-6 py-6">
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

        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            id="filtro-cliente"
            label={rotulos.primeiro}
            ajuda={rotulos.ajudaPrimeiro}
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
            ajuda={rotulos.ajudaSegundo}
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
            ajuda="Procura o trecho em qualquer parte do nome."
            placeholder="ex.: pedido"
            value={filtros.busca}
            disabled={!instancia || ocupado}
            onChange={(e) => alterar('busca', e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Nesta instância os nomes seguem <code>{rotulos.padrao}</code>: em <code>LAB_Mercos_Pedido_Captura</code>,{' '}
            <code>LAB</code> é o filtro “{rotulos.primeiro}” e <code>Mercos</code> é “{rotulos.segundo}”. A
            etiqueta (tag) do workflow também vale nesses dois filtros. Os filtros se combinam, e sem nenhum a
            instância é listada inteira. Workflows arquivados não entram.
          </p>

          <label
            className={`flex items-start gap-2.5 text-sm ${filtros.base ? 'text-slate-700' : 'text-slate-400'}`}
          >
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={filtros.comuns}
              disabled={!instancia || !filtros.base || ocupado}
              onChange={(e) => alterarComuns(e.target.checked)}
            />
            <span>
              Incluir os workflows comuns
              <span className="block text-[13px] font-normal text-slate-500">
                Com uma {rotulos.segundo.toLowerCase()} escolhida, junta também os sub-workflows que os encontrados chamam
                (e os que esses chamam).
              </span>
            </span>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Painel
            titulo={
              !instancia
                ? 'Resultado do filtro'
                : carregandoPrevia
                  ? 'Resultado do filtro: buscando…'
                  : `Resultado do filtro (${total})`
            }
            acao={
              <button
                type="button"
                className={CLASSE_ACAO_TEXTO}
                disabled={aAdicionar.length === 0 || cheia || baixando}
                onClick={() => adicionar(aAdicionar)}
              >
                Adicionar todos{aAdicionar.length > 0 ? ` (${aAdicionar.length})` : ''}
              </button>
            }
          >
            {!instancia ? (
              <Vazio>Escolha a instância.</Vazio>
            ) : carregandoPrevia && !resultado ? (
              <Vazio>Buscando workflows…</Vazio>
            ) : resultado && resultado.workflows.length === 0 ? (
              <Vazio>Nenhum workflow neste filtro.</Vazio>
            ) : (
              <>
                <ArvoreWorkflows
                  itens={resultado?.workflows ?? []}
                  jaAdicionados={idsEscolhidos}
                  desabilitado={cheia || baixando}
                  aoAdicionar={adicionar}
                />
                {resultado && total > resultado.workflows.length && (
                  <p className="border-t border-slate-100 px-4 py-1.5 text-sm text-slate-400">
                    …e mais {total - resultado.workflows.length}. Refine o filtro para ver o restante.
                  </p>
                )}
              </>
            )}
          </Painel>

          <Painel
            titulo={`Para exportar (${escolhidos.length})`}
            acao={
              <button
                type="button"
                className={CLASSE_ACAO_TEXTO}
                disabled={escolhidos.length === 0 || baixando}
                onClick={() => setEscolhidos([])}
              >
                Limpar lista
              </button>
            }
          >
            {escolhidos.length === 0 ? (
              <Vazio>Adicione workflows do resultado do filtro. A lista se mantém ao trocar de filtro.</Vazio>
            ) : (
              <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto text-sm text-slate-600">
                {escolhidos.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-2 px-4 py-1.5">
                    <span className="min-w-0 truncate" title={w.nome}>
                      {w.nome}
                    </span>
                    <BotaoLinha rotulo={`Remover ${w.nome}`} aoClicar={() => remover(w.id)} desabilitado={baixando}>
                      <IconeX />
                    </BotaoLinha>
                  </li>
                ))}
              </ul>
            )}
          </Painel>
        </div>

        {cheia && (
          <Alerta tom="aviso">
            A lista chegou ao limite de {LIMITE_LISTA} workflows por ZIP. Baixe este e monte outro para o restante.
          </Alerta>
        )}

        <Alerta tom="aviso" titulo="Cuidado com o arquivo baixado">
          Os JSONs podem conter senhas e tokens em texto puro dentro dos nodes. Guarde o ZIP com cuidado: cada
          exportação fica registrada com o seu e-mail e os nomes dos workflows exportados.
        </Alerta>

        {erro && <Alerta tom="erro">{erro}</Alerta>}
        {baixado && (
          <Alerta tom="sucesso" titulo="ZIP gerado">
            {baixado}
          </Alerta>
        )}

        <div>
          <Botao type="button" onClick={baixar} disabled={escolhidos.length === 0 || baixando}>
            {baixando ? 'Gerando ZIP…' : `Baixar ZIP${escolhidos.length > 0 ? ` (${escolhidos.length})` : ''}`}
          </Botao>
        </div>
      </div>
    </div>
  )
}
