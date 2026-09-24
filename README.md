# Conecta — Onboarding

Tela de cadastro de lojistas e integrações da integração multi-tenant. Consome a API Monint
(`monitoramento-pedpen`).

Três abas:

| Aba | O que faz | Endpoints |
|---|---|---|
| Nova integração | Vincula uma plataforma a um lojista | `GET /clientes`, `POST /integracoes` |
| Novo lojista | Cria o usuário de login do lojista | `POST /cadastro` |
| Integrações | Consulta o que está cadastrado | `GET /integracoes` |

## Rodar

```bash
npm install
```

Copie o `.env.example` para `.env` e preencha o `VITE_GOOGLE_CLIENT_ID` — **sem ele o Google não
funciona** (veja a armadilha abaixo).

```bash
npm run dev
```

Sobe em `http://localhost:4200` e pede login com a conta Google da Citel.

## Login pelo Google

A tela autentica só pelo Google Workspace. O fluxo:

1. O botão do Google devolve um **ID Token** no navegador
2. A tela manda esse token para `POST /Autenticar/google`
3. A API confere a assinatura contra as chaves públicas do Google, o `aud`, o `exp`, o
   `email_verified` e o domínio (`hd`)
4. Se passar, a API cria o usuário no `CADUSR` na primeira entrada e devolve o JWT do Monint

O `POST /Autenticar` por usuário e senha continua existindo na API — é o que o n8n usa —, mas esta
tela não o usa.

### Configuração no Google Cloud

No projeto, em *Credentials > OAuth 2.0 Client IDs > Web application*, a origem em que a tela roda
precisa estar em **Authorized JavaScript origins**:

- `http://localhost:4200` para desenvolvimento
- `https://onboarding.citelsoftware.com.br` para produção

Não é preciso configurar *Authorized redirect URIs*: o Google Identity Services devolve o token na
própria página, sem redirect.

Se o consent screen estiver em **Testing**, só entram os e-mails cadastrados como *test users* — o
sintoma é `access_blocked`.

### ⚠️ O client ID tem que bater dos dois lados

`VITE_GOOGLE_CLIENT_ID` (aqui) e `api.security.google.client-id` (na API) precisam ser **o mesmo
valor**. Ele é o `audience` do ID Token: se divergirem, o login falha com "Token do Google inválido
ou expirado". Ao trocar o projeto pessoal pelo da Citel, troque nos dois.

### ⚠️ Build sem a variável remove o Google silenciosamente

O Vite substitui `import.meta.env.VITE_GOOGLE_CLIENT_ID` no momento do build. Sem a variável, ela
vira `undefined`, a condição `!CLIENT_ID` fica constante e o Rollup **elimina o ramo do Google
inteiro** como código morto — o build passa sem erro e a tela sai sem botão de login, só com o
aviso de configuração.

Por isso o `Dockerfile` recebe `VITE_GOOGLE_CLIENT_ID` como `ARG`. Ao publicar, confira que ele foi
passado:

```bash
grep -c "gsi/client" dist/assets/*.js
```

Tem que devolver `1`. Se devolver `0`, o bundle saiu sem o Google.

## Build e publicação

```bash
npm run build
```

Gera em `dist/`. O `Dockerfile` faz build em dois estágios e serve com nginx; o `location /api/` do
`nginx.conf` cumpre em produção o mesmo papel do proxy do Vite. **Nenhuma credencial entra no
build.**

## Sessão

O login guarda o JWT em `sessionStorage` e a credencial apenas em memória, nunca em disco. Enquanto
a aba estiver aberta o token é renovado sozinho quando vence (a API expira em 2h). Depois de um F5,
a credencial se perde: o token continua valendo até expirar, e aí a tela pede login de novo.

Fechar a aba encerra a sessão.

## Decisões que não são óbvias no código

**`@tailwindcss/forms` é obrigatório.** Os inputs usam `rounded-md border-slate-300` sem classe de
largura de borda — no CDN do protótipo o input herda a borda nativa do navegador, mas num build
local o preflight do Tailwind zera `border-width` e os campos ficam invisíveis. O plugin é o que
repõe `border-width: 1px`. Ao mexer no Tailwind, confira que os campos ainda têm borda.

**A chave PEM vai exatamente como colada.** Sem `trim`, sem normalizar quebras de linha. O n8n
assina JWT RS256 com ela e qualquer reformatação quebra a assinatura — com erro que só aparece em
produção.

**O `codigoIntegracao` é da integração, não do lojista.** Um lojista com Tray e Mercos cadastra
duas integrações, com códigos diferentes, sob o mesmo `codigoCliente`. Por isso o formulário pede
os dois.

**O `webhookToken` aparece uma vez só.** Nenhum endpoint devolve esse valor depois do 201; perdido,
só recadastrando a integração.

**A aba de consulta não carrega segredos.** Usa o `GET /integracoes` sem `incluirCredenciais`, então
chave privada e tokens não chegam ao navegador.

**Os formulários ficam montados ao trocar de aba.** Interromper o preenchimento de uma integração
para cadastrar um lojista não pode apagar o que já foi digitado.

**Sem fonte externa.** O protótipo carrega Inter do Google Fonts, o que não funciona em rede
fechada. Aqui a fonte cai para a do sistema. Para usar Inter de verdade, coloque o `.woff2` em
`public/fonts/` e descomente o `@font-face` do `src/index.css`.

## Limitações conhecidas

- A consulta é somente leitura: a API ainda não tem endpoint de edição nem de desativação de
  integração. Hoje desativar é `UPDATE CADINT SET INT_ATIVO_='N'` no banco.
- Nenhuma listagem pagina. Com o volume atual não é problema.
