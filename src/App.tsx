import { useEffect, useState } from 'react'
import { FormIntegracao } from './components/FormIntegracao'
import { ListaIntegracoes } from './components/ListaIntegracoes'
import { PaginaPlataformas } from './components/PaginaPlataformas'
import { Monitoramento } from './components/Monitoramento'
import { ErroNaTela } from './components/ui/ErroNaTela'
import { PainelSucesso } from './components/PainelSucesso'
import { TelaLogin } from './components/TelaLogin'
import { PaginaWorkflows } from './components/PaginaWorkflows'
import { ContadorTiposPendentes, PaginaTiposErro } from './components/PaginaTiposErro'
import { perfilDaSessao, registrarExpiracao, sair, temPerfil, temSessao, usuarioDaSessao, type Perfil } from './services/api'
import { carregarRecursos, type Recurso } from './services/acesso'
import type { IntegracaoCriada } from './types/integracao'
import { MenuUsuario } from './components/MenuUsuario'
import { AlternarTema } from './components/ui/AlternarTema'
import { Segredos } from './segredos/Segredos'
import {
  IconeAtividade,
  IconeCamadas,
  IconeCaixa,
  IconeEscudo,
  IconeLink,
  IconeMais,
  IconeSetaDireita,
  IconeSetaEsquerda,
} from './components/ui/Icones'

type Aba = 'monitoramento' | 'tipos-erro' | 'integracao' | 'consulta' | 'plataformas' | 'workflows'

// `perfilMinimo` esconde a aba de quem tem um perfil menor (USR < DEV < ADM; USR_PERFIL, claim "perfil" do token).
// Sem ele, a aba é de todos. `recurso` a restringe também à lista do n8n (veja services/acesso.ts). Esconder é só
// conforto: a API e o n8n barram de verdade, com 403.
const ABAS: {
  id: Aba
  rotulo: string
  descricao: string
  Icone: () => JSX.Element
  perfilMinimo?: Perfil
  recurso?: Recurso
}[] = [
  {
    id: 'monitoramento',
    rotulo: 'Monitoramento',
    descricao: 'Pedidos e produtos com falha de integração, acompanhados em tempo real.',
    Icone: IconeAtividade,
  },
  {
    id: 'tipos-erro',
    rotulo: 'Tipos de erro',
    descricao: 'Confira e valide de quem é a responsabilidade que a IA definiu para cada tipo de erro. Restrito ao time de integrações.',
    Icone: IconeEscudo,
    perfilMinimo: 'DEV',
  },
  {
    id: 'plataformas',
    rotulo: 'Plataformas',
    descricao: 'Plataformas cadastradas e, para o time de desenvolvimento, o controle do que já foi feito em cada uma.',
    Icone: IconeCamadas,
  },
  {
    id: 'integracao',
    rotulo: 'Nova integração',
    descricao: 'Vincule uma plataforma a um lojista do Monint. Um mesmo lojista pode ter várias integrações.',
    Icone: IconeMais,
    perfilMinimo: 'DEV',
  },
  {
    id: 'consulta',
    rotulo: 'Integrações',
    descricao: 'Relatório das integrações por situação e plataforma, e a lista por lojista. Clique no nome de um lojista para ver os pedidos dele.',
    Icone: IconeLink,
  },
  {
    id: 'workflows',
    rotulo: 'Workflows',
    descricao: 'Exportação dos workflows do n8n por instância, categoria e plataforma. Restrito ao time de integrações.',
    Icone: IconeCaixa,
    perfilMinimo: 'DEV',
    recurso: 'workflows',
  },
]

// As consultas têm tabelas largas; os formulários ficam mais estreitos.
const LARGURA: Record<Aba, string> = {
  monitoramento: 'max-w-none',
  'tipos-erro': 'max-w-none',
  consulta: 'max-w-none',
  integracao: 'max-w-5xl',
  // Largura total: a matriz de funcionalidades tem tabela larga. O formulário de cadastro limita a própria largura.
  plataformas: 'max-w-none',
  // Largura total: o explorador de workflows tem painel de pastas, lista e a lista de exportação lado a lado.
  workflows: 'max-w-none',
}

const CHAVE_MENU = 'conecta.menu-recolhido'

/** O menu lateral abre recolhido (só os ícones) até a pessoa fixá-lo aberto; a escolha fica neste navegador. */
function menuRecolhidoGuardado(): boolean {
  try {
    return localStorage.getItem(CHAVE_MENU) !== '0'
  } catch {
    return true
  }
}

export default function App() {
  const [autenticado, setAutenticado] = useState(temSessao)
  const [avisoLogin, setAvisoLogin] = useState<string | null>(null)

  const [aba, setAba] = useState<Aba>('monitoramento')
  const [criada, setCriada] = useState<IntegracaoCriada | null>(null)
  // Contadores para as abas recarregarem o que a outra mudou.
  const [versaoLojistas, setVersaoLojistas] = useState(0)
  const [versaoIntegracoes, setVersaoIntegracoes] = useState(0)
  const [versaoPlataformas, setVersaoPlataformas] = useState(0)
  // Recursos restritos liberados para quem está logado; vazio até o n8n responder.
  const [recursos, setRecursos] = useState<string[]>([])
  // Menu lateral: recolhido mostra só os ícones e volta ao tamanho normal quando o mouse passa por cima (por cima do
  // conteúdo, sem empurrá-lo). "Fixar" o deixa sempre aberto.
  const [recolhido, setRecolhido] = useState(menuRecolhidoGuardado)
  const [pairando, setPairando] = useState(false)
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_MENU, recolhido ? '1' : '0')
    } catch {
      // sem armazenamento: vale só até recarregar
    }
  }, [recolhido])

  useEffect(() => {
    registrarExpiracao(() => {
      setAutenticado(false)
      setAvisoLogin('Sua sessão expirou. Entre novamente para continuar.')
    })
    return () => registrarExpiracao(null)
  }, [])

  useEffect(() => {
    if (!autenticado) {
      setRecursos([])
      return
    }
    let ativo = true
    carregarRecursos().then((liberados) => {
      if (ativo) {
        setRecursos(liberados)
      }
    })
    return () => {
      ativo = false
    }
  }, [autenticado])

  if (!autenticado) {
    return (
      <>
        <TelaLogin
          aviso={avisoLogin}
          aoEntrar={() => {
            setAvisoLogin(null)
            // Todo login começa pelo monitoramento.
            setAba('monitoramento')
            setAutenticado(true)
          }}
        />
        <Segredos />
      </>
    )
  }

  function sairDoPortal() {
    sair()
    setAutenticado(false)
    setAvisoLogin(null)
  }

  const usuario = usuarioDaSessao()
  const abasVisiveis = ABAS.filter(
    (a) => temPerfil(a.perfilMinimo ?? 'USR') && (!a.recurso || recursos.includes(a.recurso)),
  )
  const atual = abasVisiveis.find((a) => a.id === aba) ?? ABAS[0]
  const expandido = !recolhido || pairando
  // Largura que a tela precisa: as consultas usam a tela inteira; só os formulários ficam estreitos e centralizados.
  const larguraTotal = LARGURA[aba] === 'max-w-none'
  // O Monitoramento não rola a página: ele ocupa a janela e só a lista rola, por dentro.
  const telaCheia = aba === 'monitoramento' || aba === 'tipos-erro'

  return (
    <div className={`min-h-screen bg-slate-50 transition-[padding] duration-200 ${recolhido ? 'lg:pl-[4.5rem]' : 'lg:pl-64'}`}>
      <aside
        onMouseEnter={() => setPairando(true)}
        onMouseLeave={() => setPairando(false)}
        onFocusCapture={() => setPairando(true)}
        onBlurCapture={() => setPairando(false)}
        className={`escuro-fixo bg-ink-900 lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:flex-col lg:overflow-hidden lg:border-r lg:border-white/[0.06] lg:transition-[width,box-shadow] lg:duration-200 ${
          expandido ? 'lg:w-64' : 'lg:w-[4.5rem]'
        } ${recolhido && pairando ? 'lg:shadow-[8px_0_24px_rgb(0_0_0/0.35)]' : ''}`}
      >
        <div className="flex h-16 items-center justify-between gap-3 px-5 lg:border-b lg:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <img src="/conecta_logo.png" alt="Conecta" data-segredo="logo" className="h-8 w-auto object-contain" />
            <div className={`leading-tight transition-opacity duration-150 ${expandido ? '' : 'lg:opacity-0'}`}>
              <p className="whitespace-nowrap text-sm font-semibold tracking-tight text-white">Portal Conecta</p>
              <p className="text-[11px] font-medium text-slate-500">Integrações Citel</p>
            </div>
          </div>
          <div className="flex items-center gap-1 lg:hidden">
            <AlternarTema escuroFixo />
            <MenuUsuario usuario={usuario} aoSair={sairDoPortal} compacto />
          </div>
        </div>

        <p
          className={`hidden whitespace-nowrap px-6 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 transition-opacity duration-150 lg:block ${expandido ? '' : 'lg:opacity-0'}`}
        >
          Menu
        </p>
        <nav
          role="tablist"
          aria-label="Seções do portal"
          className="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {abasVisiveis.map(({ id, rotulo, Icone }) => {
            const ativa = aba === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => setAba(id)}
                title={rotulo}
                className={`group relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                  ativa
                    ? 'bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                }`}
              >
                {ativa && (
                  <span className="absolute left-0 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400 lg:block" />
                )}
                <span
                  className={`h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${
                    ativa ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                >
                  <Icone />
                </span>
                <span className={`transition-opacity duration-150 ${expandido ? '' : 'lg:opacity-0'}`}>{rotulo}</span>
                {id === 'tipos-erro' && <ContadorTiposPendentes ponto={!expandido} />}
                {id === 'monitoramento' && (
                  <span className="relative ml-auto flex h-2 w-2" title="Ao vivo">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="hidden space-y-1 border-t border-white/[0.06] p-3 lg:block">
          {/* Só no npm run dev: avisa quando o perfil do token está sendo ignorado, para ninguém testar o USR vendo o ADM. */}
          {import.meta.env.DEV && import.meta.env.VITE_PERFIL_DEV && expandido && (
            <p className="px-3 pb-1 text-[11px] font-medium text-amber-400">
              Dev: perfil forçado para {perfilDaSessao()} (VITE_PERFIL_DEV)
            </p>
          )}
          <button
            type="button"
            onClick={() => setRecolhido((r) => !r)}
            title={recolhido ? 'Fixar o menu aberto' : 'Recolher o menu'}
            aria-label={recolhido ? 'Fixar o menu aberto' : 'Recolher o menu'}
            className="group flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors duration-150 hover:bg-white/[0.04] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <span className="block h-[18px] w-[18px] shrink-0">{recolhido ? <IconeSetaDireita /> : <IconeSetaEsquerda />}</span>
            <span className={`transition-opacity duration-150 ${expandido ? '' : 'lg:opacity-0'}`}>
              {recolhido ? 'Fixar o menu aberto' : 'Recolher o menu'}
            </span>
          </button>
          <AlternarTema escuroFixo comRotulo rotuloVisivel={expandido} />
          <MenuUsuario usuario={usuario} aoSair={sairDoPortal} recolhido={!expandido} />
        </div>
      </aside>

      <main
        className={`px-4 sm:px-6 lg:px-6 ${
          telaCheia ? 'flex h-screen flex-col overflow-hidden py-5 lg:py-5' : 'py-8 lg:py-8'
        }`}
      >
        <div
          className={`${larguraTotal ? 'w-full' : 'mx-auto max-w-7xl'} ${
            telaCheia ? 'flex min-h-0 flex-1 flex-col' : ''
          }`}
        >
          <header key={aba} className={`${telaCheia ? 'mb-4 shrink-0' : 'mb-8'} flex animate-fade-in flex-wrap items-start justify-between gap-x-6 gap-y-3`}>
            <div>
              <h1
                data-segredo={aba === 'monitoramento' ? 'titulo' : undefined}
                className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px] sm:leading-9"
              >
                {atual.rotulo}
              </h1>
              <p className={`mt-1.5 text-sm text-slate-500 ${aba === 'tipos-erro' ? 'whitespace-nowrap' : 'max-w-2xl'}`}>{atual.descricao}</p>
            </div>
            {/* Canto direito: onde a página coloca os controles dela (ex.: o seletor Dev / Cliente / Todos do Monitoramento). */}
            <div id="acoes-da-pagina" className="shrink-0" />
          </header>

          <ErroNaTela reiniciarCom={aba}>
            <div className={`${LARGURA[aba]} ${telaCheia ? 'min-h-0 flex-1' : ''}`}>
              {/* Só monta quando aberto, para a atualização automática não rodar em segundo plano. */}
              {aba === 'monitoramento' && (
                <div className="flex h-full min-h-0 animate-fade-in flex-col">
                  <Monitoramento />
                </div>
              )}

              {/* Só monta quando aberta: a releitura dos tipos de erro não roda em segundo plano. DEV e ADM validam. */}
              {temPerfil('DEV') && aba === 'tipos-erro' && (
                <div className="flex h-full min-h-0 animate-fade-in flex-col">
                  <PaginaTiposErro />
                </div>
              )}

              {/* Fica montado ao trocar de aba (não perde o que foi digitado), mas só para DEV e ADM. */}
              {temPerfil('DEV') && (
                <div hidden={aba !== 'integracao'} className="animate-fade-in">
                  {criada ? (
                    <PainelSucesso integracao={criada} aoCadastrarOutra={() => setCriada(null)} />
                  ) : (
                    <FormIntegracao
                      versaoLojistas={versaoLojistas}
                      versaoPlataformas={versaoPlataformas}
                      aoCriarLojista={() => setVersaoLojistas((v) => v + 1)}
                      aoCriar={(integracao) => {
                        setCriada(integracao)
                        setVersaoIntegracoes((v) => v + 1)
                      }}
                    />
                  )}
                </div>
              )}

              {/* A consulta só monta quando aberta, para não buscar a lista à toa. */}
              {aba === 'consulta' && (
                <div className="animate-fade-in">
                  <ListaIntegracoes versao={versaoIntegracoes} />
                </div>
              )}

              {/* Todo usuário interno vê a lista de plataformas; a matriz de funcionalidades é do DEV e do ADM, e só o ADM grava. */}
              {aba === 'plataformas' && (
                <div className="animate-fade-in">
                  <PaginaPlataformas
                    perfil={perfilDaSessao()}
                    versaoPlataformas={versaoPlataformas}
                    aoCriarPlataforma={() => setVersaoPlataformas((v) => v + 1)}
                  />
                </div>
              )}

              {temPerfil('DEV') && aba === 'workflows' && recursos.includes('workflows') && (
                <div className="animate-fade-in">
                  <PaginaWorkflows podeImportar={recursos.includes('workflows-importar')} />
                </div>
              )}
            </div>
          </ErroNaTela>
        </div>
      </main>
      <Segredos />
    </div>
  )
}
