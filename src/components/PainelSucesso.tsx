import { useState } from 'react'
import type { IntegracaoCriada } from '../types/integracao'
import { Botao } from './ui/Botao'

interface Props {
  integracao: IntegracaoCriada
  aoCadastrarOutra: () => void
}

export function PainelSucesso({ integracao, aoCadastrarOutra }: Props) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(integracao.webhookToken)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // clipboard bloqueado (contexto não seguro): o token continua selecionável na tela.
      setCopiado(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800">Integração cadastrada</h3>
        <p className="mt-1 text-sm text-slate-500">
          Vinculada a <span className="font-medium text-slate-700">{integracao.nomeCliente}</span> (#
          {integracao.codigoCliente}).
        </p>
      </div>

      <div className="p-5 space-y-6">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-slate-700">Código da integração</dt>
            <dd className="mt-1 text-slate-600">{integracao.codigoIntegracao}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Plataforma</dt>
            <dd className="mt-1 text-slate-600">{integracao.plataforma}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Slug</dt>
            <dd className="mt-1 text-slate-600">{integracao.slug}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Situação</dt>
            <dd className="mt-1 text-slate-600">{integracao.ativo ? 'Ativa' : 'Inativa'}</dd>
          </div>
        </dl>

        <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <h4 className="text-sm font-semibold text-amber-900">
            Token do webhook — copie agora
          </h4>
          <p className="mt-1 text-sm text-amber-800">
            Esta é a única vez que ele aparece. Nenhum outro endpoint devolve este valor; perdido,
            só recadastrando a integração. É o que o n8n envia no header <code>x-ct-token</code>.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <code className="flex-1 rounded-md bg-white border border-amber-300 px-3 py-2 font-mono text-xs break-all text-slate-800">
              {integracao.webhookToken}
            </code>
            <Botao type="button" onClick={copiar}>
              {copiado ? 'Copiado' : 'Copiar'}
            </Botao>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <Botao type="button" variante="secundario" onClick={aoCadastrarOutra}>
            Cadastrar outra integração
          </Botao>
        </div>
      </div>
    </div>
  )
}
