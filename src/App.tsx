import { useEffect, useState } from 'react'
import { FormIntegracao } from './components/FormIntegracao'
import { FormPlataforma } from './components/FormPlataforma'
import { ListaIntegracoes } from './components/ListaIntegracoes'
import { ListaPlataformas } from './components/ListaPlataformas'
import { PainelSucesso } from './components/PainelSucesso'
import { TelaLogin } from './components/TelaLogin'
import { registrarExpiracao, sair, temSessao, usuarioDaSessao } from './services/api'
import type { IntegracaoCriada } from './types/integracao'

type Aba = 'integracao' | 'consulta' | 'plataformas'

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'integracao', rotulo: 'Nova integração' },
  { id: 'consulta', rotulo: 'Integrações' },
  { id: 'plataformas', rotulo: 'Plataformas' },
]

export default function App() {
  const [autenticado, setAutenticado] = useState(temSessao)
  const [avisoLogin, setAvisoLogin] = useState<string | null>(null)

  const [aba, setAba] = useState<Aba>('integracao')
  const [criada, setCriada] = useState<IntegracaoCriada | null>(null)
  // Contadores para as abas recarregarem o que a outra mudou.
  const [versaoLojistas, setVersaoLojistas] = useState(0)
  const [versaoIntegracoes, setVersaoIntegracoes] = useState(0)
  const [versaoPlataformas, setVersaoPlataformas] = useState(0)

  useEffect(() => {
    registrarExpiracao(() => {
      setAutenticado(false)
      setAvisoLogin('Sua sessão expirou. Entre novamente para continuar.')
    })
    return () => registrarExpiracao(null)
  }, [])

  if (!autenticado) {
    return (
      <TelaLogin
        aviso={avisoLogin}
        aoEntrar={() => {
          setAvisoLogin(null)
          setAutenticado(true)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/conecta_logo.png" alt="Conecta" className="h-10 w-auto object-contain" />
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Portal Conecta</h1>
              <p className="text-sm text-slate-500">
                Cadastro de lojistas e integrações Conecta
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-600">{usuarioDaSessao()}</p>
            <button
              type="button"
              onClick={() => {
                sair()
                setAutenticado(false)
                setAvisoLogin(null)
              }}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Sair
            </button>
          </div>
        </header>

        <nav className="border-b border-slate-200">
          <div className="-mb-px flex gap-6" role="tablist">
            {ABAS.map(({ id, rotulo }) => {
              const ativa = aba === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={ativa}
                  onClick={() => setAba(id)}
                  className={`border-b-2 pb-3 text-sm transition-colors duration-150 ${
                    ativa
                      ? 'border-indigo-600 text-indigo-600 font-semibold'
                      : 'border-transparent text-slate-500 font-medium hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {rotulo}
                </button>
              )
            })}
          </div>
        </nav>

        <div hidden={aba !== 'integracao'}>
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

        {/* A consulta só monta quando aberta, para não buscar a lista à toa. */}
        {aba === 'consulta' && <ListaIntegracoes versao={versaoIntegracoes} />}

        {aba === 'plataformas' && (
          <div className="space-y-6">
            <FormPlataforma aoCriar={() => setVersaoPlataformas((v) => v + 1)} />
            <ListaPlataformas versao={versaoPlataformas} />
          </div>
        )}
      </div>
    </div>
  )
}
