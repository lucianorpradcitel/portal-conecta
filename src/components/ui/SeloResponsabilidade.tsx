import { ROTULO_RESPONSABILIDADE } from '../../services/responsabilidade'
import { descreverValidacao } from '../../services/tiposErro'
import type { TipoErro } from '../../types/tiposErro'

/**
 * De quem é o erro (0 a 4), com a cor de cada responsabilidade. Sem valor, vale "A classificar". É cheio quando uma
 * pessoa validou o tipo e tracejado, com um ponto, quando ainda não; o hover diz por quê (quem validou ou como o
 * tipo nasceu). Sem `tipo` (ainda não carregado, ou erro sem tipo) fica só a descrição da responsabilidade.
 */
export function SeloResponsabilidade({ valor, tipo }: { valor?: number | null; tipo?: TipoErro }) {
  const info = ROTULO_RESPONSABILIDADE[valor ?? 0] ?? ROTULO_RESPONSABILIDADE[0]
  const pendente = !!tipo && tipo.validado !== 'S'
  return (
    <span
      title={tipo ? `${info.dica}\n${descreverValidacao(tipo)}` : info.dica}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
        pendente ? info.tracejado : `ring-1 ring-inset ${info.classe}`
      }`}
    >
      {pendente && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {info.rotulo}
    </span>
  )
}
