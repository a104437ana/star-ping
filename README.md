# ⭐ star-ping

A GitHub Action that runs once a day and emails you when one of your public
repositories gains (or loses) stars.

No server, no database, no external service running 24/7 — just GitHub
Actions itself, a `data.json` file versioned in the repo, and an email via
Gmail SMTP whenever there's a difference.

## 🚀 Quick Start

1. **Use this template** → click the green *"Use this template"* button at
   the top of this repository and create your own repository from it (not
   a fork — the repository is entirely yours, with no history tied back to
   this one).
2. **Enable Actions** → in your new repository, go to **Actions** and
   confirm it's enabled (repositories created from a template usually have
   it enabled by default).
3. **Add the required secrets** → **Settings → Secrets and variables →
   Actions → New repository secret**, one by one:

   | Secret | What it is |
   |---|---|
   | `GH_STARS_PAT` | Fine-grained, read-only Personal Access Token, used to list your repositories and their star counts |
   | `GMAIL_USER` | Your Gmail address (the sender) |
   | `GMAIL_APP_PASSWORD` | App Password for the Gmail account (not your regular password) |
   | `NOTIFY_EMAIL` | The address that receives the notifications (can be the same as `GMAIL_USER`) |

   See below for how to create the `GH_STARS_PAT` and the
   `GMAIL_APP_PASSWORD`.
4. **Done** — the workflow runs every day at 08:00 UTC. If you want to test
   it without waiting, go to **Actions → star-ping → Run workflow**.

If a secret is missing when the workflow runs, it **doesn't fail
silently**: it automatically opens an Issue in your repository explaining
exactly what's missing.

On the first run you won't get any email — that first run only records the
initial values in `data.json`. From the second run onward, any difference
triggers a notification.

## 🔍 How it works

1. Once a day (cron `0 8 * * *`, or manually via *Run workflow*), the
   workflow uses the `GH_STARS_PAT` to list all your public, non-fork
   repositories along with their star counts.
2. It compares that list against the `data.json` saved from the previous
   run.
3. If there are differences, it sends an email (via Gmail SMTP) listing
   which repositories changed and by how much.
4. It commits the updated `data.json` back to the repo, using the
   workflow's automatic `GITHUB_TOKEN` — never the PAT.

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

### Creating the `GH_STARS_PAT` (fine-grained)

1. GitHub → **Settings** (your account) → **Developer settings** →
   **Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Resource owner**: your personal account.
3. **Repository access**: *All repositories* (it needs to see all public
   repositories in order to list them).
4. **Permissions → Repository permissions → Metadata**: `Read-only`. Don't
   enable any other permission.
5. Generate the token and paste it into the `GH_STARS_PAT` secret.

### Creating the `GMAIL_APP_PASSWORD`

Gmail only accepts SMTP from third-party apps through an **App Password**,
which requires two-step verification to be enabled on the account.

1. Enable two-step verification at
   [myaccount.google.com/security](https://myaccount.google.com/security),
   if it isn't already.
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Create a new App Password (you can name it "star-ping").
4. Copy the generated password (16 characters, no spaces) into the
   `GMAIL_APP_PASSWORD` secret.

## ➕ Adding other notification channels

Email is the only channel implemented, but the workflow is designed to be
easy to extend: the step that computes the diff (`scripts/check-stars.js`)
knows nothing about email — it just writes a result (`changed`, `notify`,
`subject`, `email_body.html`) that the sending step reads. To add, say, a
Discord webhook, just add a new step in
`.github/workflows/star-ping.yml` that reads
`steps.stars.outputs.notify` and `email_body.html` — no need to touch the
script.

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
