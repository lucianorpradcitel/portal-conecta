import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alerta } from './Alerta'
import { Botao } from './Botao'

interface Props {
  /** Quando este valor muda (ex.: a aba aberta), o aviso some e a tela tenta renderizar de novo. */
  reiniciarCom?: string
  children: ReactNode
}

interface Estado {
  erro: Error | null
}

/**
 * Rede de segurança das telas. Sem ela, um erro ao desenhar qualquer componente — um dado nulo que
 * ninguém previu, por exemplo — desmonta o app inteiro e a pessoa fica olhando uma página em branco.
 * Com ela, só a área da tela falha, o menu continua ali e há um botão para recarregar.
 */
export class ErroNaTela extends Component<Props, Estado> {
  state: Estado = { erro: null }

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('[TELA] Erro ao desenhar a tela', erro, info.componentStack)
  }

  componentDidUpdate(anterior: Props) {
    if (this.state.erro && anterior.reiniciarCom !== this.props.reiniciarCom) {
      this.setState({ erro: null })
    }
  }

  render() {
    if (!this.state.erro) {
      return this.props.children
    }

    return (
      <div className="space-y-4">
        <Alerta tom="erro" titulo="Esta tela encontrou um erro">
          Algum dado veio em um formato inesperado e a tela não pôde ser exibida. Recarregar costuma resolver;
          se o erro voltar, avise o time com o que você estava fazendo.
        </Alerta>
        <Botao type="button" variante="secundario" onClick={() => window.location.reload()}>
          Recarregar a página
        </Botao>
      </div>
    )
  }
}
