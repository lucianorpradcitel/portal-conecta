import { useState, type FormEvent, type ReactNode } from 'react'
import { ApiError, apiPost } from '../services/api'
import type {
  ClienteCriado,
  ClienteResumo,
  DadosCriacaoIntegracao,
  IntegracaoCriada,
  Plataforma,
} from '../types/integracao'
import { SeletorLojista } from './SeletorLojista'
import { SeletorPlataforma } from './SeletorPlataforma'
import { Alerta } from './ui/Alerta'
import { Botao } from './ui/Botao'
import { Campo } from './ui/Campo'
import { Textarea } from './ui/Textarea'

interface Props {
  aoCriar: (integracao: IntegracaoCriada) => void
  /** Incrementado quando a aba de lojistas cadastra alguém, para o seletor recarregar. */
  versaoLojistas?: number
  /** Incrementado quando a aba de Plataformas cadastra uma nova, para o seletor recarregar. */
  versaoPlataformas?: number
  /** Chamado quando um lojista é cadastrado por aqui, para outras telas recarregarem a lista. */
  aoCriarLojista?: () => void
}

type ModoLojista = 'existente' | 'novo'

interface Formulario {
  codigoCliente: number | null
  codigoIntegracao: string
  plataforma: Plataforma | ''
  slug: string
  urlApi: string
  urlWebservice: string
  chavePrivada: string
  nomeLojista: string
  userNameLojista: string
  senhaLojista: string
  confirmacaoSenhaLojista: string
}

const VAZIO: Formulario = {
  codigoCliente: null,
  codigoIntegracao: '',
  plataforma: '',
  slug: '',
  urlApi: '',
  urlWebservice: '',
  chavePrivada: '',
  nomeLojista: '',
  userNameLojista: '',
  senhaLojista: '',
  confirmacaoSenhaLojista: '',
}

const SLUG = /^[a-z0-9-]{3,40}$/

type Erros = Partial<Record<keyof Formulario, string>>

function validar(form: Formulario, modoLojista: ModoLojista): Erros {
  const erros: Erros = {}

  if (modoLojista === 'existente') {
    if (!form.codigoCliente) {
      erros.codigoCliente = 'Selecione o lojista dono da integração'
    }
  } else {
    if (!form.nomeLojista.trim()) {
      erros.nomeLojista = 'Informe a razão social do lojista'
    }

    if (!form.userNameLojista.trim()) {
      erros.userNameLojista = 'Informe o usuário de login'
    }

    if (!form.senhaLojista) {
      erros.senhaLojista = 'Informe a senha'
    }

    // A senha é gravada em bcrypt e não pode ser recuperada: um erro de digitação aqui só
    // apareceria na primeira tentativa de login, e a correção seria recadastrar.
    if (form.senhaLojista && form.confirmacaoSenhaLojista !== form.senhaLojista) {
      erros.confirmacaoSenhaLojista = 'As senhas não conferem'
    }
  }

  if (!form.codigoIntegracao) {
    erros.codigoIntegracao = 'Informe o código da integração'
  } else if (form.codigoIntegracao.length !== 7) {
    erros.codigoIntegracao = 'O código deve ter exatamente 7 caracteres'
  }

  if (!form.plataforma) {
    erros.plataforma = 'Selecione a plataforma'
  }

  if (!form.slug) {
    erros.slug = 'Informe o slug'
  } else if (!SLUG.test(form.slug)) {
    erros.slug = 'Use apenas letras minúsculas, números e hífen, entre 3 e 40 caracteres'
  }

  if (form.plataforma === 'tray' && !form.urlApi.trim()) {
    erros.urlApi = 'Obrigatória para a Tray'
  }

  if (!form.urlWebservice.trim()) {
    erros.urlWebservice = 'Informe a URL do webservice do ERP'
  }

  if (!form.chavePrivada) {
    erros.chavePrivada = 'Cole a chave privada'
  } else if (!form.chavePrivada.startsWith('-----BEGIN')) {
    erros.chavePrivada = 'A chave deve estar em formato PEM e começar com -----BEGIN'
  }

  return erros
}

export function FormIntegracao({ aoCriar, versaoLojistas, versaoPlataformas, aoCriarLojista }: Props) {
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [modoLojista, setModoLojista] = useState<ModoLojista>('existente')
  const [erros, setErros] = useState<Erros>({})
  const [erroApi, setErroApi] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function alterar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
    setErros((atuais) => ({ ...atuais, [campo]: undefined }))
    setErroApi(null)
  }

  function trocarModoLojista(modo: ModoLojista) {
    setModoLojista(modo)
    setErros({})
    setErroApi(null)
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()

    const encontrados = validar(form, modoLojista)
    setErros(encontrados)
    if (Object.keys(encontrados).length > 0) {
      return
    }

    setEnviando(true)
    setErroApi(null)

    try {
      let codigoCliente = form.codigoCliente

      if (modoLojista === 'novo') {
        const lojistaCriado = await apiPost<ClienteCriado>('/cadastro', {
          nome: form.nomeLojista.trim(),
          userName: form.userNameLojista.trim(),
          senha: form.senhaLojista,
        })
        codigoCliente = lojistaCriado.codigoCliente

        // Trava o lojista recém-criado antes de seguir: se a integração falhar abaixo, uma
        // nova tentativa de envio não pode recadastrá-lo.
        setForm((atual) => ({ ...atual, codigoCliente }))
        setModoLojista('existente')
        aoCriarLojista?.()
      }

      // A chavePrivada vai exatamente como foi colada: sem trim, sem normalizar quebras de linha.
      // Reformatar o PEM quebra a assinatura JWT RS256 e o erro só aparece em produção.
      const corpo: DadosCriacaoIntegracao = {
        codigoIntegracao: form.codigoIntegracao,
        codigoCliente: codigoCliente!,
        plataforma: form.plataforma as Plataforma,
        slug: form.slug,
        urlApi: form.urlApi.trim() || null,
        urlWebservice: form.urlWebservice.trim(),
        chavePrivada: form.chavePrivada,
      }

      aoCriar(await apiPost<IntegracaoCriada>('/integracoes', corpo))
    } catch (e: unknown) {
      setErroApi(
        e instanceof ApiError
          ? e.message
          : 'Não foi possível falar com a API. Verifique se ela está no ar.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card"
    >
      <div className="divide-y divide-slate-100">
        <Secao
          numero={1}
          titulo="Lojista"
          descricao="Dono da integração. Escolha um lojista existente ou cadastre um novo agora."
        >
          <div className="space-y-5">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm" role="group" aria-label="Lojista">
            {(
              [
                { modo: 'existente', rotulo: 'Selecionar existente' },
                { modo: 'novo', rotulo: 'Cadastrar novo' },
              ] as const
            ).map(({ modo, rotulo }) => (
              <button
                key={modo}
                type="button"
                disabled={enviando}
                aria-pressed={modoLojista === modo}
                onClick={() => trocarModoLojista(modo)}
                className={`rounded-md px-3.5 py-1.5 font-medium transition-all duration-150 disabled:cursor-not-allowed ${
                  modoLojista === modo
                    ? 'bg-white text-slate-900 shadow-soft ring-1 ring-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>

          {modoLojista === 'existente' ? (
            <SeletorLojista
              valor={form.codigoCliente}
              erro={erros.codigoCliente}
              desabilitado={enviando}
              versao={versaoLojistas}
              aoSelecionar={(cliente: ClienteResumo | null) =>
                alterar('codigoCliente', cliente?.codigoCliente ?? null)
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo
                id="nomeLojista"
                label="Razão social"
                value={form.nomeLojista}
                erro={erros.nomeLojista}
                placeholder="CASA DAS FURADEIRAS LTDA"
                disabled={enviando}
                onChange={(e) => alterar('nomeLojista', e.target.value)}
              />

              <Campo
                id="userNameLojista"
                label="Usuário"
                value={form.userNameLojista}
                erro={erros.userNameLojista}
                ajuda="Usado no login da API. Não pode repetir."
                autoComplete="off"
                disabled={enviando}
                onChange={(e) => alterar('userNameLojista', e.target.value)}
              />

              <Campo
                id="senhaLojista"
                label="Senha"
                type="password"
                value={form.senhaLojista}
                erro={erros.senhaLojista}
                autoComplete="new-password"
                disabled={enviando}
                onChange={(e) => alterar('senhaLojista', e.target.value)}
              />

              <Campo
                id="confirmacaoSenhaLojista"
                label="Confirmar senha"
                type="password"
                value={form.confirmacaoSenhaLojista}
                erro={erros.confirmacaoSenhaLojista}
                ajuda="A senha é gravada criptografada e não pode ser consultada depois."
                autoComplete="new-password"
                disabled={enviando}
                onChange={(e) => alterar('confirmacaoSenhaLojista', e.target.value)}
              />
            </div>
          )}
          </div>
        </Secao>

        <Secao
          numero={2}
          titulo="Dados da integração"
          descricao="Identificação da integração e os endereços usados para falar com a plataforma e com o ERP."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Campo
            id="codigoIntegracao"
            label="Código da integração"
            value={form.codigoIntegracao}
            erro={erros.codigoIntegracao}
            ajuda="7 caracteres, vem do ERP. É desta integração, não do lojista."
            maxLength={7}
            disabled={enviando}
            onChange={(e) => alterar('codigoIntegracao', e.target.value)}
          />

          <SeletorPlataforma
            valor={form.plataforma}
            erro={erros.plataforma}
            desabilitado={enviando}
            versao={versaoPlataformas}
            aoSelecionar={(plataforma) => alterar('plataforma', plataforma?.descricao ?? '')}
          />

          <Campo
            id="slug"
            label="Slug"
            value={form.slug}
            erro={erros.slug}
            ajuda="Identificador na rota do webhook. Ex: casa-furadeiras"
            disabled={enviando}
            // Normaliza ao digitar: o backend recusa maiúscula com 400.
            onChange={(e) => alterar('slug', e.target.value.toLowerCase())}
          />

          <Campo
            id="urlApi"
            label="URL da API da plataforma"
            type="url"
            value={form.urlApi}
            erro={erros.urlApi}
            placeholder="https://loja.commercesuite.com.br/web_api"
            disabled={enviando}
            onChange={(e) => alterar('urlApi', e.target.value)}
          />

          <Campo
            id="urlWebservice"
            label="URL do webservice do ERP"
            value={form.urlWebservice}
            erro={erros.urlWebservice}
            placeholder="http://159.112.189.1:25058"
            disabled={enviando}
            onChange={(e) => alterar('urlWebservice', e.target.value)}
          />
          </div>
        </Secao>

        <Secao
          numero={3}
          titulo="Credenciais"
          descricao="Chave usada para assinar os tokens da integração. Cole exatamente como está no arquivo .pem."
        >
          <Textarea
            id="chavePrivada"
            label="Chave privada (PEM)"
            rows={8}
            value={form.chavePrivada}
            erro={erros.chavePrivada}
            ajuda="Cole o conteúdo do .pem inteiro. As quebras de linha são preservadas como estão."
            placeholder={'-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----'}
            disabled={enviando}
            onChange={(e) => alterar('chavePrivada', e.target.value)}
          />
        </Secao>
      </div>

      {erroApi && (
        <div className="px-6 pb-6">
          <Alerta tom="erro" titulo="Não foi possível cadastrar">
            {erroApi}
          </Alerta>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
        <p className="text-[13px] text-slate-500">
          Todos os campos são obrigatórios. A URL da API só é exigida para a Tray.
        </p>
        <Botao type="submit" disabled={enviando}>
          {enviando && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {enviando ? 'Cadastrando…' : 'Cadastrar integração'}
        </Botao>
      </div>
    </form>
  )
}

function Secao({
  numero,
  titulo,
  descricao,
  children,
}: {
  numero: number
  titulo: string
  descricao: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-5 px-6 py-7 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
      <div>
        <p className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold tabular-nums text-slate-600 ring-1 ring-inset ring-slate-200">
            {numero}
          </span>
          {titulo}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{descricao}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
