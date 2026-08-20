import { useState } from 'react'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { ApiError, entrarComGoogle } from '../services/api'

interface Props {
  aoEntrar: () => void
  /** Preenchido quando a sessão caiu sozinha, para explicar por que a tela voltou. */
  aviso?: string | null
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src="/conecta_logo.png" alt="Conecta" className="h-12 w-auto object-contain" />
          <h1 className="text-xl font-semibold text-slate-800">Portal Conecta</h1>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Entrar</h2>
            <p className="mt-1 text-sm text-slate-500">
              Use sua conta Google da Citel.
            </p>
          </div>

          <div className="p-5 space-y-6">
            {aviso && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">{aviso}</p>
              </div>
            )}

            {!CLIENT_ID ? (
              <div className="rounded-md border border-red-300 bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  VITE_GOOGLE_CLIENT_ID não configurado. Copie o .env.example para .env e preencha
                  com o client ID do projeto no Google Cloud.
                </p>
              </div>
            ) : (
              <GoogleOAuthProvider clientId={CLIENT_ID}>
                <div className="flex justify-center">
                  {entrando ? (
                    <p className="text-sm text-slate-500">Entrando…</p>
                  ) : (
                    <GoogleLogin
                      onSuccess={(resposta) => trocarPorSessao(resposta.credential)}
                      onError={() => setErro('Não foi possível entrar com o Google.')}
                    />
                  )}
                </div>
              </GoogleOAuthProvider>
            )}

            {erro && (
              <div className="rounded-md border border-red-300 bg-red-50 p-4">
                <p className="text-sm text-red-700">{erro}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
