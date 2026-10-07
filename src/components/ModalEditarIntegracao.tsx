import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { ApiError, apiGet, apiPatch } from '../services/api'
import type { DadosEdicaoIntegracao, IntegracaoEdicao, IntegracaoResumo } from '../types/integracao'
import { Alerta } from './ui/Alerta'
import { Botao } from './ui/Botao'
import { Campo } from './ui/Campo'
import { IconeEngrenagem, IconeX } from './ui/Icones'
import { Textarea } from './ui/Textarea'

interface Props {
  /** A linha da lista em que a engrenagem foi clicada. Só a identidade é usada: o resto vem da API. */
  integracao: IntegracaoResumo
  aoFechar: () => void
  /** Chamado depois do PATCH, com os rótulos dos campos que mudaram. */
  aoSalvar: (atualizada: IntegracaoEdicao, camposAlterados: string[]) => void
}

interface Formulario {
  urlWebservice: string
  urlApi: string
  chavePrivada: string
}

type Erros = Partial<Record<keyof Formulario, string>>

const ROTULOS: Record<keyof Formulario, string> = {
  urlWebservice: 'URL do webservice',
  urlApi: 'URL da API da plataforma',
  chavePrivada: 'chave privada',
}

const CAMPOS: (keyof Formulario)[] = ['urlWebservice', 'urlApi', 'chavePrivada']

/** O textarea entrega as quebras de linha como \n mesmo que o PEM do banco tenha \r\n. */
function semCr(texto: string): string {
  return texto.replace(/\r\n/g, '\n')
}

/** Valores originais já no formato em que os campos do formulário os devolvem. */
function formularioDe(dados: IntegracaoEdicao): Formulario {
  return {
    urlWebservice: dados.urlWebservice ?? '',
    urlApi: dados.urlApi ?? '',
    chavePrivada: semCr(dados.chavePrivada ?? ''),
  }
}

/** Quais campos o usuário realmente mexeu. URLs ignoram espaços nas pontas, como o servidor faz. */
function camposAlterados(original: Formulario, atual: Formulario): (keyof Formulario)[] {
  return CAMPOS.filter((campo) =>
    campo === 'chavePrivada'
      ? atual.chavePrivada !== original.chavePrivada
      : atual[campo].trim() !== original[campo].trim(),
  )
}

function validar(original: Formulario, atual: Formulario): Erros {
  const erros: Erros = {}
  const alterados = camposAlterados(original, atual)

  // A API recusa campo vazio: os três são necessários para a integração funcionar.
  if (!atual.urlWebservice.trim()) {
    erros.urlWebservice = 'Informe a URL do webservice do ERP'
  }

  if (alterados.includes('urlApi') && !atual.urlApi.trim()) {
    erros.urlApi = 'Não dá para apagar a URL da API. Informe a nova URL, ou desfaça a alteração.'
  }

  if (alterados.includes('chavePrivada')) {
    if (!atual.chavePrivada.trim()) {
      erros.chavePrivada = 'Não dá para apagar a chave. Cole a nova chave, ou desfaça a alteração.'
    } else if (!atual.chavePrivada.startsWith('-----BEGIN')) {
      erros.chavePrivada = 'A chave deve estar em formato PEM e começar com -----BEGIN'
    }
  }

  return erros
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Popup de edição de uma integração, aberto pela engrenagem da lista. Só admin chega aqui: o botão
 * some para os demais e a API responde 403 a quem tentar pelo Swagger.
 *
 * Só webservice, URL da API e chave privada são editáveis; o resto aparece travado. O PATCH leva
 * apenas o que mudou, e a API registra cada campo alterado no LOGINT.
 */
export function ModalEditarIntegracao({ integracao, aoFechar, aoSalvar }: Props) {
  const [dados, setDados] = useState<IntegracaoEdicao | null>(null)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [form, setForm] = useState<Formulario | null>(null)
  const [erros, setErros] = useState<Erros>({})
  const [erroApi, setErroApi] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const dialogo = useRef<HTMLDivElement>(null)

  const original = useMemo(() => (dados ? formularioDe(dados) : null), [dados])
  const alterados = useMemo(() => (original && form ? camposAlterados(original, form) : []), [original, form])
  const temAlteracao = alterados.length > 0

  // Carrega os dados atuais, com a chave privada, direto da rota de admin.
  useEffect(() => {
    let cancelado = false
    apiGet<IntegracaoEdicao>(`/integracoes/${encodeURIComponent(integracao.codigoIntegracao)}/${integracao.codigoCliente}`)
      .then((resposta) => {
        if (cancelado) {
          return
        }
        setDados(resposta)
        setForm(formularioDe(resposta))
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setErroCarga(e instanceof ApiError ? e.message : 'Não foi possível carregar a integração.')
        }
      })
    return () => {
      cancelado = true
    }
  }, [integracao.codigoIntegracao, integracao.codigoCliente])

  // Trava a rolagem da página por baixo e devolve o foco ao botão que abriu o popup.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogo.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      anterior?.focus()
    }
  }, [])

  // Quando os dados chegam, o cursor vai para o primeiro campo editável.
  const carregado = form !== null
  useEffect(() => {
    if (carregado) {
      document.getElementById('editUrlWebservice')?.focus()
    }
  }, [carregado])

  /** Esc e clique no fundo só fecham se nada foi digitado: uma chave colada não se perde sem querer. */
  function fecharSeLimpo() {
    if (!enviando && !temAlteracao) {
      aoFechar()
    }
  }

  function aoTeclar(evento: KeyboardEvent) {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      fecharSeLimpo()
      return
    }

    // Mantém o Tab dentro do popup.
    if (evento.key === 'Tab' && dialogo.current) {
      const itens = Array.from(dialogo.current.querySelectorAll<HTMLElement>(FOCAVEIS))
      if (itens.length === 0) {
        return
      }
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }
  }

  function alterar(campo: keyof Formulario, valor: string) {
    setForm((atual) => (atual ? { ...atual, [campo]: valor } : atual))
    setErros((atuais) => ({ ...atuais, [campo]: undefined }))
    setErroApi(null)
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    if (!original || !form || !temAlteracao || enviando) {
      return
    }

    const encontrados = validar(original, form)
    if (Object.keys(encontrados).length > 0) {
      setErros(encontrados)
      return
    }

    // Só o que mudou: o que ficar de fora o servidor preserva, e nada de log para o que não mudou.
    const corpo: DadosEdicaoIntegracao = {}
    for (const campo of alterados) {
      corpo[campo] = campo === 'chavePrivada' ? form[campo] : form[campo].trim()
    }

    setEnviando(true)
    setErroApi(null)
    try {
      const atualizada = await apiPatch<IntegracaoEdicao>(
        `/integracoes/${encodeURIComponent(integracao.codigoIntegracao)}/${integracao.codigoCliente}`,
        corpo,
      )
      aoSalvar(
        atualizada,
        alterados.map((campo) => ROTULOS[campo]),
      )
    } catch (e) {
      setErroApi(e instanceof ApiError ? e.message : 'Não foi possível salvar. Tente novamente.')
      setEnviando(false)
    }
  }

  const titulo = `Editar integração ${integracao.codigoIntegracao}`

  // No <body>, por um portal: as páginas animam a entrada com transform, e um fixed dentro delas
  // ficaria preso ao container em vez de cobrir a tela.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          fecharSeLimpo()
        }
      }}
    >
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tituloEdicao"
        tabIndex={-1}
        onKeyDown={aoTeclar}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-surface shadow-card-hover outline-none animate-fade-in"
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10">
              <span className="h-[18px] w-[18px]">
                <IconeEngrenagem />
              </span>
            </div>
            <div>
              <h2 id="tituloEdicao" className="text-[15px] font-semibold tracking-tight text-slate-900">
                {titulo}
              </h2>
              <p className="text-[13px] text-slate-500">
                {integracao.nomeCliente} · {integracao.plataforma}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            disabled={enviando}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="h-4 w-4">
              <IconeX />
            </span>
          </button>
        </header>

        {erroCarga ? (
          <div className="p-5">
            <Alerta tom="erro" titulo="Não foi possível carregar">
              {erroCarga}
            </Alerta>
            <div className="mt-4 flex justify-end">
              <Botao type="button" variante="secundario" onClick={aoFechar}>
                Fechar
              </Botao>
            </div>
          </div>
        ) : !dados || !form ? (
          <div className="flex items-center gap-2 px-5 py-10 text-[13px] font-medium text-slate-500" aria-busy="true">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
            Carregando integração…
          </div>
        ) : (
          <form onSubmit={salvar} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <section aria-labelledby="secaoLeitura">
                <h3 id="secaoLeitura" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  Dados da integração
                  <span className="ml-2 font-medium normal-case tracking-normal text-slate-400">
                    somente leitura
                  </span>
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo id="editLojista" label="Lojista" value={`${dados.nomeCliente} (#${dados.codigoCliente})`} disabled readOnly />
                  <Campo id="editCodigo" label="Código da integração" value={dados.codigoIntegracao} disabled readOnly />
                  <Campo id="editPlataforma" label="Plataforma" value={dados.plataforma} disabled readOnly />
                  <Campo id="editSlug" label="Slug" value={dados.slug} disabled readOnly />
                </div>
              </section>

              <section aria-labelledby="secaoEdicao" className="space-y-4">
                <h3 id="secaoEdicao" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  Pode ser alterado
                </h3>
                <Campo
                  id="editUrlWebservice"
                  label="URL do webservice do ERP"
                  value={form.urlWebservice}
                  onChange={(e) => alterar('urlWebservice', e.target.value)}
                  erro={erros.urlWebservice}
                  disabled={enviando}
                  autoComplete="off"
                  spellCheck={false}
                />
                <Campo
                  id="editUrlApi"
                  label="URL da API da plataforma"
                  value={form.urlApi}
                  onChange={(e) => alterar('urlApi', e.target.value)}
                  erro={erros.urlApi}
                  disabled={enviando}
                  autoComplete="off"
                  spellCheck={false}
                />
                <Textarea
                  id="editChavePrivada"
                  label="Chave privada (PEM)"
                  rows={8}
                  value={form.chavePrivada}
                  onChange={(e) => alterar('chavePrivada', e.target.value)}
                  erro={erros.chavePrivada}
                  ajuda="Cole exatamente como está no arquivo .pem, sem reformatar."
                  disabled={enviando}
                  autoComplete="off"
                  spellCheck={false}
                />
              </section>
            </div>

            {/* Fora da área rolável: com o popup alto, um erro no fim dela ficaria abaixo da dobra. */}
            {erroApi && (
              <div className="border-t border-slate-100 px-5 py-3">
                <Alerta tom="erro" titulo="Não foi possível salvar">
                  {erroApi}
                </Alerta>
              </div>
            )}

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              <p className="text-[13px] text-slate-500" aria-live="polite">
                {temAlteracao
                  ? `Vai alterar: ${alterados.map((c) => ROTULOS[c]).join(', ')}.`
                  : 'Nenhuma alteração ainda.'}
              </p>
              <div className="flex gap-2">
                <Botao type="button" variante="secundario" onClick={aoFechar} disabled={enviando}>
                  Cancelar
                </Botao>
                <Botao type="submit" disabled={!temAlteracao || enviando}>
                  {enviando ? 'Salvando…' : 'Salvar alterações'}
                </Botao>
              </div>
            </footer>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
