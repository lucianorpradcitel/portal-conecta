import { useState, type ReactNode } from 'react'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { ApiError, entrarComGoogle, entrarComSenhaDev } from '../services/api'
import { Alerta } from './ui/Alerta'
import { IconeAtividade, IconeEscudo, IconeRaio } from './ui/Icones'

interface Props {
  aoEntrar: () => void
  /** Preenchido quando a sessão caiu sozinha, para explicar por que a tela voltou. */
  aviso?: string | null
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

const DESTAQUES: { icone: ReactNode; titulo: string; texto: string }[] = [
  {
    icone: <IconeAtividade />,
    titulo: 'Monitoramento ao vivo',
    texto: 'Pedidos e produtos com erro, atualizados a cada 10 segundos.',
  },
  {
    icone: <IconeRaio />,
    titulo: 'Cadastro em poucos passos',
    texto: 'Lojistas, plataformas e integrações em um só lugar.',
  },
  {
    icone: <IconeEscudo />,
    titulo: 'Acesso corporativo',
    texto: 'Entrada com a conta Google da Citel, validada pela API.',
  },
]

export function TelaLogin({ aoEntrar, aviso }: Props) {
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  async function trocarPorSessao(idToken: string | undefined) {
    if (!idToken) {
      setErro('O Google não devolveu o token de identidade. Tente novamente.')
      return
    }

    setEntrando(true)
    setErro(null)

    try {
      // O ID Token só vale depois que a API confere a assinatura e o domínio: entrar antes disso
      // deixaria passar qualquer conta Google.
      await entrarComGoogle(idToken)
      aoEntrar()
    } catch (e: unknown) {
      setErro(
        e instanceof ApiError
          ? e.message
          : 'Não foi possível falar com a API. Verifique se ela está no ar.',
      )
    } finally {
      setEntrando(false)
    }
  }

  async function entrarSemGoogle() {
    setEntrando(true)
    setErro(null)
    try {
      await entrarComSenhaDev()
      aoEntrar()
    } catch (e: unknown) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível falar com a API.')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Painel da marca: só em telas largas. */}
      <aside className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-ink-900 p-12 lg:flex">
        <div className="bg-grade mascara-radial pointer-events-none absolute inset-0" />
        <img
          src="/conecta_logo.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 h-[420px] w-auto rotate-12 opacity-[0.04]"
        />

        <div className="relative flex items-center gap-3 animate-fade-in">
          <img src="/conecta_logo.png" alt="Conecta" className="h-9 w-auto object-contain" />
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight text-white">Portal Conecta</p>
            <p className="text-xs font-medium text-slate-500">Integrações Citel</p>
          </div>
        </div>

        <div className="relative max-w-md animate-fade-in [animation-delay:80ms]">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-inset ring-white/10">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
            </span>
            Central de integrações
          </p>
          <h2 className="mt-6 text-[40px] font-semibold leading-[1.1] tracking-tight text-white">
            Todas as integrações,
            <br />
            <span className="text-slate-400">em um só painel.</span>
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-400">
            Acompanhe falhas, cadastre lojistas e conecte plataformas sem sair do portal.
          </p>

          <ul className="mt-10 space-y-5">
            {DESTAQUES.map((d) => (
              <li key={d.titulo} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-brand-300 ring-1 ring-inset ring-white/10">
                  <span className="h-[18px] w-[18px]">{d.icone}</span>
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{d.titulo}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{d.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} Citel Software</p>
      </aside>

      {/* Acesso */}
      <main className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12 lg:bg-white">
        <div className="w-full max-w-[380px] animate-fade-in">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <img src="/conecta_logo.png" alt="Conecta" className="h-9 w-auto object-contain" />
            <p className="text-[15px] font-semibold tracking-tight text-slate-900">Portal Conecta</p>
          </div>

          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-slate-900">Entrar no portal</h1>
          <p className="mt-2 text-sm text-slate-500">Use sua conta Google da Citel para continuar.</p>

          <div className="mt-8 space-y-4">
            {aviso && <Alerta tom="aviso">{aviso}</Alerta>}

            {!CLIENT_ID ? (
              <Alerta tom="erro" titulo="Login com Google indisponível">
                VITE_GOOGLE_CLIENT_ID não configurado. Copie o .env.example para .env e preencha com
                o client ID do projeto no Google Cloud.
              </Alerta>
            ) : (
              <GoogleOAuthProvider clientId={CLIENT_ID}>
                <div className="flex min-h-[44px] justify-center">
                  {entrando ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
                      Entrando…
                    </p>
                  ) : (
                    <GoogleLogin
                      onSuccess={(resposta) => trocarPorSessao(resposta.credential)}
                      onError={() => setErro('Não foi possível entrar com o Google.')}
                      size="large"
                      shape="rectangular"
                      text="signin_with"
                      width={380}
                    />
                  )}
                </div>
              </GoogleOAuthProvider>
            )}

            {/* Só no npm run dev: o Vite remove este bloco do build de produção. */}
            {import.meta.env.DEV && !entrando && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Desenvolvimento
                  </span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <button
                  type="button"
                  onClick={entrarSemGoogle}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-soft transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.99]"
                >
                  Entrar sem Google
                </button>
              </>
            )}

            {erro && <Alerta tom="erro">{erro}</Alerta>}
          </div>

          <p className="mt-10 flex items-center gap-2 text-xs text-slate-400">
            <span className="h-3.5 w-3.5">
              <IconeEscudo />
            </span>
            Acesso restrito a colaboradores Citel.
          </p>
        </div>
      </main>
    </div>
  )
}
