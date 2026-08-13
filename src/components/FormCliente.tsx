import { useState, type FormEvent } from 'react'
import { ApiError, apiPost } from '../services/api'
import type { ClienteCriado, DadosCriacaoCliente } from '../types/integracao'
import { Botao } from './ui/Botao'
import { Campo } from './ui/Campo'

interface Props {
  aoCriar: (cliente: ClienteCriado) => void
}

interface Formulario {
  nome: string
  userName: string
  senha: string
  confirmacao: string
}

const VAZIO: Formulario = { nome: '', userName: '', senha: '', confirmacao: '' }

type Erros = Partial<Record<keyof Formulario, string>>

function validar(form: Formulario): Erros {
  const erros: Erros = {}

  if (!form.nome.trim()) {
    erros.nome = 'Informe a razão social do lojista'
  }

  if (!form.userName.trim()) {
    erros.userName = 'Informe o usuário de login'
  }

  if (!form.senha) {
    erros.senha = 'Informe a senha'
  }

  // A senha é gravada em bcrypt e não pode ser recuperada: um erro de digitação aqui só
  // apareceria na primeira tentativa de login, e a correção seria recadastrar.
  if (form.senha && form.confirmacao !== form.senha) {
    erros.confirmacao = 'As senhas não conferem'
  }

  return erros
}

export function FormCliente({ aoCriar }: Props) {
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [erros, setErros] = useState<Erros>({})
  const [erroApi, setErroApi] = useState<string | null>(null)
  const [criado, setCriado] = useState<ClienteCriado | null>(null)
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

    const corpo: DadosCriacaoCliente = {
      nome: form.nome.trim(),
      userName: form.userName.trim(),
      senha: form.senha,
    }

    setEnviando(true)
    setErroApi(null)

    try {
      const novo = await apiPost<ClienteCriado>('/cadastro', corpo)
      setCriado(novo)
      setForm(VAZIO)
      aoCriar(novo)
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
        <h3 className="text-lg font-semibold text-slate-800">Cadastro de lojista</h3>
        <p className="mt-1 text-sm text-slate-500">
          Cria o usuário de login do lojista. É pré-requisito do cadastro de integração — só
          lojistas já cadastrados aparecem no seletor da outra aba.
        </p>
      </div>

      <div className="p-5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Campo
            id="nome"
            label="Razão social"
            value={form.nome}
            erro={erros.nome}
            placeholder="CASA DAS FURADEIRAS LTDA"
            disabled={enviando}
            onChange={(e) => alterar('nome', e.target.value)}
          />

          <Campo
            id="userName"
            label="Usuário"
            value={form.userName}
            erro={erros.userName}
            ajuda="Usado no login da API. Não pode repetir."
            autoComplete="off"
            disabled={enviando}
            onChange={(e) => alterar('userName', e.target.value)}
          />

          <Campo
            id="senha"
            label="Senha"
            type="password"
            value={form.senha}
            erro={erros.senha}
            autoComplete="new-password"
            disabled={enviando}
            onChange={(e) => alterar('senha', e.target.value)}
          />

          <Campo
            id="confirmacao"
            label="Confirmar senha"
            type="password"
            value={form.confirmacao}
            erro={erros.confirmacao}
            ajuda="A senha é gravada criptografada e não pode ser consultada depois."
            autoComplete="new-password"
            disabled={enviando}
            onChange={(e) => alterar('confirmacao', e.target.value)}
          />
        </div>

        {erroApi && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4">
            <p className="text-sm text-red-700">{erroApi}</p>
          </div>
        )}

        {criado && (
          <div className="rounded-md border border-green-300 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-700">
              Lojista cadastrado: {criado.nome} (#{criado.codigoCliente}).
            </p>
            <p className="mt-1 text-sm text-green-700">
              Já aparece no seletor da aba de integração.
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <Botao type="submit" disabled={enviando}>
            {enviando ? 'Cadastrando…' : 'Cadastrar lojista'}
          </Botao>
        </div>
      </div>
    </form>
  )
}
