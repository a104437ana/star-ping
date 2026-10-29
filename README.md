# ⭐ star-ping

A GitHub Action that runs once a day and alerts you — by email, Discord,
and/or Telegram, your choice — when one of your public repositories gains
(or loses) stars.

No server, no database, no external service running 24/7 — just GitHub
Actions itself and a `data.json` file versioned in the repo. All three
notification channels are optional and independent; you just need to set
up at least one of them.

## 🚀 Quick Start

1. **Use this template** (the green button at the top) → **Create a new repository** (not
   *Open in a codespace*).
2. **Create the `GH_STARS_PAT`** (fine-grained)

   1. GitHub → **Settings** (your account) → **Developer settings** →
      **Personal access tokens → Fine-grained tokens → Generate new token**.
   2. **Resource owner**: your personal account.
   3. **Repository access**: *All repositories* (it needs to see all public
      repositories in order to list them).
   4. **Permissions → Repository permissions → Metadata**: `Read-only`.
      Don't enable any other permission.
   5. Generate the token and keep it somewhere safe for a moment — you'll
      paste it in step 4.
3. **Set up your notification channel(s)** — you need **at least one** of
   the three below (Email, Discord or Telegram), pick whichever you want (any combination works).

   <details open>
   <summary>Email</summary>

   1. Enable two-step verification at
      [myaccount.google.com/security](https://myaccount.google.com/security),
      if it isn't already.
   2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
   3. Create a new App Password (you can name it "star-ping").
   4. Copy the generated password (16 characters, no spaces) — you'll paste
      it in step 4.

   </details>

   <details>
   <summary>Discord</summary>

   1. In your Discord server: **Server Settings → Integrations → Webhooks
      → New Webhook**.
   2. Pick the channel you want notifications in, then **Copy Webhook
      URL** — you'll paste it in step 4.

   </details>

   <details>
   <summary>Telegram</summary>

   1. In Telegram, open a chat with **@BotFather** and send `/newbot`,
      then follow the prompts (pick a name and a username). It replies
      with a **bot token** — you'll paste it in step 4.
   2. Start a chat with your new bot (search for its username and press
      *Start*), and send it any message.
   3. Open `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` in a
      browser (with your real token in the URL) and look for
      `"chat":{"id": ...}` in the response — that number is your chat ID,
      you'll also paste it in step 4.

   </details>
4. **Add the secrets to the repo** → **Settings → Secrets and variables →
   Actions → New repository secret**, one by one:

   | Secret | What it is | Needed for |
   |---|---|---|
   | `GH_STARS_PAT` | The fine-grained PAT from step 2 | **Required**, always |
   | `GMAIL_USER` | Your Gmail address (the sender) | Email (all three email secrets together) |
   | `GMAIL_APP_PASSWORD` | The App Password from step 3 | Email (all three email secrets together) |
   | `NOTIFY_EMAIL` | The address that receives the notifications (can be the same as `GMAIL_USER`) | Email (all three email secrets together) |
   | `DISCORD_WEBHOOK_URL` | The webhook URL from step 3 | Optional — Discord |
   | `TELEGRAM_BOT_TOKEN` | The bot token from step 3 | Optional — Telegram (both this and the next one) |
   | `TELEGRAM_CHAT_ID` | The chat ID from step 3 | Optional — Telegram (both this and the previous one) |

   `GH_STARS_PAT` is always required. Beyond that, you need **at least
   one** fully-configured channel — all three email secrets together, or
   `DISCORD_WEBHOOK_URL`, or both Telegram secrets together. Set up more
   than one if you want notifications in more than one place.
5. **Test it right away** — go to **Actions → star-ping → Run workflow**
   instead of waiting for the daily cron (if Actions aren't enabled yet
   you'll see a banner there — click to turn them on first, repos created
   from a template usually have them on already). The very first run
   always sends a confirmation notification on whichever channel(s) you
   configured — "star-ping is active", plus the list of any repos that
   already have stars, if any — so you immediately know it's wired up
   correctly. From the second run onward, it only notifies when something
   actually changes. It runs automatically every day at 08:00 UTC.

If `GH_STARS_PAT` is missing, or no channel is fully configured, the
workflow **doesn't fail silently**: it automatically opens an Issue in
your repository explaining exactly what's missing.

## 🔍 How it works

1. Once a day (cron `0 8 * * *`, or manually via *Run workflow*), the
   workflow uses the `GH_STARS_PAT` to list all your public, non-fork
   repositories along with their star counts.
2. It compares that list against the `data.json` saved from the previous
   run.
3. If there are differences, it notifies you on whichever channel(s) you
   configured — email (via Gmail SMTP), Discord, and/or Telegram — listing
   which repositories changed and by how much.
4. It force-pushes the updated `data.json` to a dedicated `data` branch,
   using the workflow's automatic `GITHUB_TOKEN` — never the PAT. That
   branch is created automatically on the first run, only ever holds
   `data.json`, and is always a single commit (today's snapshot replaces
   yesterday's, not stacked on top of it) — keeping it off `main` and
   history-free means these automated updates never clutter your actual
   commit history. You don't need to create it yourself.

## 🔐 Security

- **`GH_STARS_PAT` is read-only.** It's a fine-grained PAT with the
  **"Metadata: read-only"** permission on all repositories — the minimum
  needed to list public repositories and see their star counts. It never
  has write access to anything.
- **Committing `data.json` uses the automatic `GITHUB_TOKEN`**, not the
  PAT. The workflow explicitly declares `permissions: contents: write`
  (and `issues: write`, only so it can open the missing-configuration
  Issue) — and nothing else.
- **All third-party actions are pinned to a commit SHA**, not a tag
  (`actions/checkout`, `actions/setup-node`, `actions/github-script`,
  `dawidd6/action-send-mail`). A tag can be moved; a SHA can't.
- **The workflow never modifies itself** — no step edits its own `.yml`
  file.
- **No `workflow_dispatch` inputs** — the manual button exists only for
  testing, runs exactly the same logic as the cron, with no dynamic
  configuration options.

## ➕ Adding other notification channels

Email, Discord, and Telegram are all optional and independent — each only
runs if its own secrets are set (see the [Quick Start](#-quick-start) for
how to get them), and you need at least one of the three configured. Skip
whichever you don't want; those steps are simply skipped, nothing else
changes. Remove the secret(s) later to turn a channel back off (as long as
at least one other channel stays configured).

`scripts/check-stars.js` doesn't know anything about email, Discord, or
Telegram specifically — it only computes the diff and writes it out in two
channel-agnostic files: `changes.json` (the raw list of what changed) and
`email_body.html` (pre-rendered HTML, built for convenience since email
needs HTML anyway). To add another channel (Slack, a generic webhook,
whatever), add a new step in `.github/workflows/star-ping.yml`, gated on
`steps.stars.outputs.notify == 'true'`, that reads `changes.json` and
formats it however that channel needs — the same pattern the Discord and
Telegram steps already follow. No need to touch the script.

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
