import { useState, type FormEvent } from 'react'
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
      className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800">Cadastro de integração</h3>
        <p className="mt-1 text-sm text-slate-500">
          Vincula uma plataforma a um lojista já cadastrado no Monint. Um mesmo lojista pode ter
          várias integrações.
        </p>
      </div>

      <div className="p-5 space-y-6">
        <div className="rounded-md border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-md border border-slate-300 text-sm overflow-hidden">
              <button
                type="button"
                disabled={enviando}
                onClick={() => trocarModoLojista('existente')}
                className={`px-3 py-1.5 transition-colors duration-150 ${
                  modoLojista === 'existente'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Selecionar existente
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => trocarModoLojista('novo')}
                className={`px-3 py-1.5 border-l border-slate-300 transition-colors duration-150 ${
                  modoLojista === 'novo'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Cadastrar novo
              </button>
            </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {erroApi && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4">
            <p className="text-sm text-red-700">{erroApi}</p>
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <Botao type="submit" disabled={enviando}>
            {enviando ? 'Cadastrando…' : 'Cadastrar integração'}
          </Botao>
        </div>
      </div>
    </form>
  )
}
