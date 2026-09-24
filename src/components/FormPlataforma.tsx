import { useState, type FormEvent } from 'react'
import { ApiError, apiPost } from '../services/api'
import type { DadosCriacaoPlataforma, PlataformaResumo } from '../types/integracao'
import { Alerta } from './ui/Alerta'
import { Botao } from './ui/Botao'
import { Campo } from './ui/Campo'
import { IconeMais } from './ui/Icones'

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
      className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card lg:sticky lg:top-10"
    >
      <div className="group flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10 transition-transform duration-200 group-hover:scale-105">
          <span className="h-[18px] w-[18px]">
            <IconeMais />
          </span>
        </div>
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Nova plataforma</h3>
          <p className="text-[13px] text-slate-500">Aparece no seletor da aba Nova integração.</p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-5">
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

        {erroApi && <Alerta tom="erro">{erroApi}</Alerta>}

        {criada && (
          <Alerta tom="sucesso" titulo={`Plataforma cadastrada: ${criada.descricao}`}>
            Já aparece no seletor da aba de Nova integração.
          </Alerta>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {enviando ? 'Cadastrando…' : 'Cadastrar plataforma'}
        </Botao>
      </div>
    </form>
  )
}
