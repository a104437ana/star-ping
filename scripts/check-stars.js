#!/usr/bin/env node
// Fetches star counts for the authenticated user's public, non-fork repos,
// diffs them against data.json, writes the updated file, and exposes the
// result through GITHUB_OUTPUT so the workflow can decide whether to commit
// and/or notify. Notification delivery itself lives in the workflow, not
// here: this script only computes the diff and writes it out in two forms —
// email_body.html (ready-made HTML for the email step) and changes.json
// (the raw diff, for any other channel to format however it needs). Adding
// a new channel is just a new workflow step reading changes.json; this file
// never needs to change for that.

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(process.cwd(), "data.json");
const EMAIL_BODY_FILE = path.join(process.cwd(), "email_body.html");
const CHANGES_FILE = path.join(process.cwd(), "changes.json");
const API_ROOT = "https://api.github.com";

async function githubRequest(pat, url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "star-ping",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `GitHub API request failed (${res.status} ${res.statusText}) for ${url}: ${body}`
    );
  }
  return res.json();
}

async function fetchPublicOwnedRepos(pat) {
  const repos = [];
  let page = 1;
  for (;;) {
    const url = `${API_ROOT}/user/repos?affiliation=owner&visibility=public&per_page=100&page=${page}`;
    const batch = await githubRequest(pat, url);
    repos.push(...batch.filter((repo) => !repo.fork));
    if (batch.length < 100) break;
    page += 1;
  }
  return repos;
}

function loadPreviousStars() {
  if (!fs.existsSync(DATA_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return null;
  }
}

function setOutput(name, value) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function renderEmailBody(changes) {
  const rows = changes
    .map(({ repo, previous, current, diff, isNew }) => {
      const sign = diff > 0 ? "+" : "";
      const color = diff > 0 ? "#1a7f37" : "#cf222e";
      const countCell = isNew ? `new → ${current}` : `${previous} → ${current}`;
      const badge = isNew
        ? ' <span style="font-size:11px;font-weight:600;color:#1a7f37;border:1px solid #1a7f37;border-radius:3px;padding:1px 4px;">NEW</span>'
        : "";
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">
          <a href="https://github.com/${repo}">${repo}</a>${badge}
        </td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${countCell}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;color:${color};font-weight:600;">${sign}${diff}</td>
      </tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html>
  <body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;">
    <h2>⭐ star-ping</h2>
    <p>Your public repositories had some star changes:</p>
    <table style="border-collapse:collapse;width:100%;max-width:480px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333;">Repository</th>
          <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #333;">Stars</th>
          <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #333;">Δ</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </body>
</html>`;
}

async function main() {
  const pat = process.env.GH_STARS_PAT;
  if (!pat) {
    throw new Error("GH_STARS_PAT is not set in the environment.");
  }

  const repos = await fetchPublicOwnedRepos(pat);
  const current = {};
  for (const repo of repos) {
    current[repo.full_name] = repo.stargazers_count;
  }

  const previous = loadPreviousStars();
  // On the very first run ever, there's no previous data.json at all —
  // treated the same as an empty baseline, so every repo goes through the
  // same "newly-discovered repo" path below instead of a special case.
  const previousForDiff = previous ?? {};
  const changes = [];

  for (const [repoName, currentCount] of Object.entries(current)) {
    const isNew = !(repoName in previousForDiff);
    if (isNew) {
      // Newly-discovered repo (just created, just made public, or this is
      // the first run ever). It may already have stars, so it still gets
      // notified — just with an implicit baseline of 0 rather than a true
      // previous count. A repo that debuts with 0 stars is baselined
      // silently, nothing to tell.
      if (currentCount > 0) {
        changes.push({
          repo: repoName,
          previous: 0,
          current: currentCount,
          diff: currentCount,
          isNew: true,
        });
      }
      continue;
    }
    const previousCount = previousForDiff[repoName];
    if (previousCount !== currentCount) {
      changes.push({
        repo: repoName,
        previous: previousCount,
        current: currentCount,
        diff: currentCount - previousCount,
        isNew: false,
      });
    }
  }

  const sortedCurrent = Object.fromEntries(
    Object.entries(current).sort(([a], [b]) => a.localeCompare(b))
  );
  const changed = JSON.stringify(sortedCurrent) !== JSON.stringify(previous ?? {});

  if (changed) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(sortedCurrent, null, 2) + "\n");
  }

  const notify = changes.length > 0;
  if (notify) {
    fs.writeFileSync(EMAIL_BODY_FILE, renderEmailBody(changes));
    fs.writeFileSync(CHANGES_FILE, JSON.stringify(changes, null, 2) + "\n");
  }

  setOutput("changed", changed);
  setOutput("notify", notify);
  setOutput(
    "subject",
    notify
      ? `⭐ star-ping: ${changes.length} repositor${changes.length === 1 ? "y" : "ies"} changed`
      : ""
  );

  console.log(`Repositories checked: ${Object.keys(current).length}`);
  console.log(`First run: ${previous === null}`);
  console.log(`Changes to notify: ${changes.length}`);
  for (const c of changes) {
    console.log(`  ${c.repo}: ${c.previous} -> ${c.current} (${c.diff > 0 ? "+" : ""}${c.diff})`);
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
