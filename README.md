# ⭐ star-ping

Uma GitHub Action que corre uma vez por dia e te avisa por email quando algum
dos teus repositórios públicos ganha (ou perde) estrelas.

Sem servidor, sem base de dados, sem serviço externo a correr 24/7 — só o
próprio GitHub Actions, um ficheiro `data.json` versionado no repo, e um
email via Gmail SMTP quando há diferenças.

## 🚀 Quick Start

1. **Use this template** → clica no botão verde *"Use this template"* no
   topo deste repositório e cria o teu próprio repositório a partir deste
   (não é um fork — o repositório fica todo teu, sem histórico ligado a
   este).
2. **Ativa as Actions** → no teu novo repositório, vai a **Actions** e
   confirma que estão ativas (em repositórios criados a partir de um
   template ficam normalmente ativas por omissão).
3. **Adiciona os secrets necessários** → **Settings → Secrets and
   variables → Actions → New repository secret**, um por um:

   | Secret | O que é |
   |---|---|
   | `GH_STARS_PAT` | Personal Access Token *fine-grained*, só leitura, para listar os teus repositórios e estrelas |
   | `GMAIL_USER` | O teu endereço Gmail (quem envia o email) |
   | `GMAIL_APP_PASSWORD` | App Password da conta Gmail (não é a tua password normal) |
   | `NOTIFY_EMAIL` | O endereço que vai receber as notificações (pode ser o mesmo que `GMAIL_USER`) |

   Vê abaixo como criar o `GH_STARS_PAT` e o `GMAIL_APP_PASSWORD`.
4. **Pronto** — o workflow corre todos os dias às 08:00 UTC. Se quiseres
   testar sem esperar, vai a **Actions → star-ping → Run workflow**.

Se faltar algum secret quando o workflow correr, ele **não falha em
silêncio**: abre automaticamente uma Issue no teu repositório a explicar
exatamente o que falta configurar.

Na primeira execução não recebes nenhum email — essa primeira run serve só
para gravar os valores iniciais em `data.json`. A partir da segunda run,
qualquer diferença gera notificação.

## 🔍 Como funciona

1. Uma vez por dia (cron `0 8 * * *`, ou manualmente via *Run workflow*), o
   workflow usa o `GH_STARS_PAT` para listar todos os teus repositórios
   públicos e não-forks, com o respetivo número de estrelas.
2. Compara essa lista com o `data.json` guardado no repo da run anterior.
3. Se houver diferenças, envia um email (via Gmail SMTP) com a lista de
   repositórios que mudaram e quanto mudaram.
4. Faz commit do `data.json` atualizado de volta ao repo, usando o
   `GITHUB_TOKEN` automático do workflow — nunca o PAT.

## 🔐 Segurança

- **`GH_STARS_PAT` é só de leitura.** É um PAT *fine-grained* com a
  permissão **"Metadata: read-only"** em todos os repositórios — o mínimo
  necessário para listar repositórios públicos e ver o número de estrelas.
  Nunca tem permissão de escrita em nada.
- **O commit do `data.json` usa o `GITHUB_TOKEN` automático**, não o PAT.
  O workflow declara explicitamente `permissions: contents: write` (e
  `issues: write`, só para poder abrir a Issue de configuração em falta) —
  e mais nada.
- **Todas as actions de terceiros estão fixadas por commit SHA**, não por
  tag (`actions/checkout`, `actions/setup-node`, `actions/github-script`,
  `dawidd6/action-send-mail`). Uma tag pode ser movida; um SHA não.
- **O workflow nunca se auto-modifica** — não há nenhum step que edite o
  próprio `.yml`.
- **Sem `workflow_dispatch` com inputs** — o botão manual existe só para
  testar, corre exatamente a mesma lógica do cron, sem nenhuma opção de
  configuração dinâmica.

### Criar o `GH_STARS_PAT` (fine-grained)

1. GitHub → **Settings** (da tua conta) → **Developer settings** →
   **Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Resource owner**: a tua conta pessoal.
3. **Repository access**: *All repositories* (precisa de ver todos os
   repositórios públicos para os poder listar).
4. **Permissions → Repository permissions → Metadata**: `Read-only`. Não
   marques mais nenhuma permissão.
5. Gera o token e cola-o no secret `GH_STARS_PAT`.

### Criar o `GMAIL_APP_PASSWORD`

Gmail só aceita SMTP de apps de terceiros com uma **App Password**, e isso
exige que a verificação em dois passos esteja ativa na conta.

1. Ativa a verificação em dois passos em
   [myaccount.google.com/security](https://myaccount.google.com/security),
   se ainda não estiver.
2. Vai a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Cria uma nova App Password (podes chamar-lhe "star-ping").
4. Copia a password gerada (16 caracteres, sem espaços) para o secret
   `GMAIL_APP_PASSWORD`.

## ➕ Adicionar outros canais de notificação

O email é o único canal implementado, mas o workflow está desenhado para
ser fácil de estender: o step que calcula as diferenças
(`scripts/check-stars.js`) não sabe nada sobre email — só escreve um
resultado (`changed`, `notify`, `subject`, `email_body.html`) que o step de
envio lê. Para adicionar, por exemplo, um webhook do Discord, basta
acrescentar um novo step no `.github/workflows/star-ping.yml` que leia
`steps.stars.outputs.notify` e `email_body.html`, sem tocar no script.

## ⭐ Stars

[![a104437ana/star-ping stars](https://repo-stars.vercel.app/api/stars-badge?repo=a104437ana%2Fstar-ping)](https://repo-stars.vercel.app)
[![a104437ana/star-ping stars](https://repo-stars.vercel.app/api/svg?repo=a104437ana%2Fstar-ping)](https://repo-stars.vercel.app)

---

<a href="https://star-history.com/#a104437ana/star-ping&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=a104437ana/star-ping&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=a104437ana/star-ping&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=a104437ana/star-ping&type=Date" />
  </picture>
</a>
