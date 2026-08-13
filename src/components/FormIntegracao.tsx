import { useState, type FormEvent } from 'react'
import { ApiError, apiPost } from '../services/api'
import type {
  ClienteResumo,
  DadosCriacaoIntegracao,
  IntegracaoCriada,
  Plataforma,
} from '../types/integracao'
import { SeletorLojista } from './SeletorLojista'
import { Botao } from './ui/Botao'
import { Campo } from './ui/Campo'
import { Select } from './ui/Select'
import { Textarea } from './ui/Textarea'

interface Props {
  aoCriar: (integracao: IntegracaoCriada) => void
  /** Incrementado quando a aba de lojistas cadastra alguém, para o seletor recarregar. */
  versaoLojistas?: number
}

interface Formulario {
  codigoCliente: number | null
  codigoIntegracao: string
  plataforma: Plataforma | ''
  slug: string
  urlApi: string
  urlWebservice: string
  chavePrivada: string
}

const VAZIO: Formulario = {
  codigoCliente: null,
  codigoIntegracao: '',
  plataforma: '',
  slug: '',
  urlApi: '',
  urlWebservice: '',
  chavePrivada: '',
}

const SLUG = /^[a-z0-9-]{3,40}$/

type Erros = Partial<Record<keyof Formulario, string>>

function validar(form: Formulario): Erros {
  const erros: Erros = {}

  if (!form.codigoCliente) {
    erros.codigoCliente = 'Selecione o lojista dono da integração'
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

export function FormIntegracao({ aoCriar, versaoLojistas }: Props) {
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [erros, setErros] = useState<Erros>({})
  const [erroApi, setErroApi] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function alterar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
    setErros((atuais) => ({ ...atuais, [campo]: undefined }))
    setErroApi(null)
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()

    const encontrados = validar(form)
    setErros(encontrados)
    if (Object.keys(encontrados).length > 0) {
      return
    }

    // A chavePrivada vai exatamente como foi colada: sem trim, sem normalizar quebras de linha.
    // Reformatar o PEM quebra a assinatura JWT RS256 e o erro só aparece em produção.
    const corpo: DadosCriacaoIntegracao = {
      codigoIntegracao: form.codigoIntegracao,
      codigoCliente: form.codigoCliente!,
      plataforma: form.plataforma as Plataforma,
      slug: form.slug,
      urlApi: form.urlApi.trim() || null,
      urlWebservice: form.urlWebservice.trim(),
      chavePrivada: form.chavePrivada,
    }

    setEnviando(true)
    setErroApi(null)

    try {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SeletorLojista
            valor={form.codigoCliente}
            erro={erros.codigoCliente}
            desabilitado={enviando}
            versao={versaoLojistas}
            aoSelecionar={(cliente: ClienteResumo | null) =>
              alterar('codigoCliente', cliente?.codigoCliente ?? null)
            }
          />

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

          <Select
            id="plataforma"
            label="Plataforma"
            value={form.plataforma}
            erro={erros.plataforma}
            disabled={enviando}
            onChange={(e) => alterar('plataforma', e.target.value as Plataforma | '')}
          >
            <option value="">Selecione</option>
            <option value="tray">Tray</option>
            <option value="mercos">Mercos</option>
          </Select>

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
