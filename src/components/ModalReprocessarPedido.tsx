import { useState } from 'react'
import { ApiError, apiPatch } from '../services/api'
import type { PedidoDoCliente } from '../types/monitoramento'
import { Alerta } from './ui/Alerta'
import { Botao } from './ui/Botao'
import { IconeReciclar } from './ui/Icones'
import { Modal } from './ui/Modal'

interface Props {
  pedido: PedidoDoCliente
  nomeCliente: string
  aoFechar: () => void
  /** Chamado depois que a API devolveu o pedido à fila. */
  aoReprocessar: (pedido: PedidoDoCliente) => void
}

/**
 * Confirmação do reprocessamento. O pedido volta ao status 0 e o n8n o processa de novo, então a
 * pessoa vê qual foi o erro antes de confirmar: reprocessar sem corrigir a causa só repete a falha.
 */
export function ModalReprocessarPedido({ pedido, nomeCliente, aoFechar, aoReprocessar }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function confirmar() {
    if (enviando) {
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      await apiPatch<PedidoDoCliente>(`/pedidos/${encodeURIComponent(pedido.id)}/reprocessar`)
      aoReprocessar(pedido)
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível reprocessar. Tente novamente.')
      setEnviando(false)
    }
  }

  return (
    <Modal idTitulo="tituloReprocesso" aoFechar={aoFechar} podeFechar={!enviando}>
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10">
          <span className="h-[18px] w-[18px]">
            <IconeReciclar />
          </span>
        </div>
        <div>
          <h2 id="tituloReprocesso" className="text-[15px] font-semibold tracking-tight text-slate-900">
            Reprocessar pedido {pedido.codigoPedido}?
          </h2>
          <p className="text-[13px] text-slate-500">
            {nomeCliente}
            {pedido.plataforma ? ` · ${pedido.plataforma}` : ''}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <p className="text-sm leading-relaxed text-slate-600">
          O pedido volta para o status <strong className="font-semibold text-slate-800">0 · Aguardando</strong> e o
          n8n vai processá-lo de novo.
        </p>

        {pedido.erro && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Erro atual</p>
            <p className="mt-1.5 max-h-32 overflow-y-auto break-words rounded-lg bg-red-50/70 p-3 text-[13px] leading-relaxed text-red-700 ring-1 ring-inset ring-red-600/15">
              {pedido.erro}
            </p>
            <p className="mt-2 text-[13px] text-slate-500">
              Se a causa do erro não foi corrigida, o pedido deve falhar de novo.
            </p>
          </div>
        )}

        {erro && (
          <Alerta tom="erro" titulo="Não foi possível reprocessar">
            {erro}
          </Alerta>
        )}
      </div>

      <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <Botao type="button" variante="secundario" onClick={aoFechar} disabled={enviando}>
          Cancelar
        </Botao>
        <Botao type="button" onClick={confirmar} disabled={enviando}>
          <span className={`h-4 w-4 ${enviando ? 'animate-spin' : ''}`}>
            <IconeReciclar />
          </span>
          {enviando ? 'Reprocessando…' : 'Reprocessar'}
        </Botao>
      </footer>
    </Modal>
  )
}
