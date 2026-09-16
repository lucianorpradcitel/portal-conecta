import { useState, type FormEvent } from 'react'
import { ApiError, apiPost } from '../services/api'
import type { DadosCriacaoPlataforma, PlataformaResumo } from '../types/integracao'
import { Botao } from './ui/Botao'
import { Campo } from './ui/Campo'

interface Props {
  aoCriar: (plataforma: PlataformaResumo) => void
}

interface Formulario {
  descricao: string
  sistemaExterno: string
}

const VAZIO: Formulario = { descricao: '', sistemaExterno: '' }

type Erros = Partial<Record<keyof Formulario, string>>

function validar(form: Formulario): Erros {
  const erros: Erros = {}

  if (!form.descricao.trim()) {
    erros.descricao = 'Informe o identificador da plataforma'
  }

  if (!form.sistemaExterno.trim()) {
    erros.sistemaExterno = 'Informe o código do sistema externo'
  }

  return erros
}

export function FormPlataforma({ aoCriar }: Props) {
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [erros, setErros] = useState<Erros>({})
  const [erroApi, setErroApi] = useState<string | null>(null)
  const [criada, setCriada] = useState<PlataformaResumo | null>(null)
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

    const corpo: DadosCriacaoPlataforma = {
      // Normaliza: o IntegracaoService compara em minúsculas antes de gravar em CADINT.
      descricao: form.descricao.trim().toLowerCase(),
      sistemaExterno: form.sistemaExterno.trim(),
    }

    setEnviando(true)
    setErroApi(null)

    try {
      const nova = await apiPost<PlataformaResumo>('/plataformas', corpo)
      setCriada(nova)
      setForm(VAZIO)
      aoCriar(nova)
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
        <h3 className="text-lg font-semibold text-slate-800">Cadastro de plataforma</h3>
        <p className="mt-1 text-sm text-slate-500">
          Alimenta o seletor de plataforma da aba "Nova integração".
        </p>
      </div>

      <div className="p-5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Campo
            id="descricao"
            label="Identificador"
            value={form.descricao}
            erro={erros.descricao}
            placeholder="tray"
            ajuda="Usado internamente para vincular a integração. Ex: tray"
            disabled={enviando}
            onChange={(e) => alterar('descricao', e.target.value.toLowerCase())}
          />

          <Campo
            id="sistemaExterno"
            label="Código do sistema externo"
            value={form.sistemaExterno}
            erro={erros.sistemaExterno}
            placeholder="1001"
            disabled={enviando}
            onChange={(e) => alterar('sistemaExterno', e.target.value)}
          />
        </div>

        {erroApi && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4">
            <p className="text-sm text-red-700">{erroApi}</p>
          </div>
        )}

        {criada && (
          <div className="rounded-md border border-green-300 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-700">
              Plataforma cadastrada: {criada.descricao}.
            </p>
            <p className="mt-1 text-sm text-green-700">
              Já aparece no seletor da aba de Nova integração.
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <Botao type="submit" disabled={enviando}>
            {enviando ? 'Cadastrando…' : 'Cadastrar plataforma'}
          </Botao>
        </div>
      </div>
    </form>
  )
}
