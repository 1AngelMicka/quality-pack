// Three security checks with no dependency:
//  - supplyChecks: what the repository says about its supply chain (lockfile, release cooldown, install
//    scripts, pinned CI actions, env files). The 2025-2026 npm incidents all lived a few hours and ran in
//    install scripts: a cooldown and blocked scripts stop them.
//  - validateThreats: the threat model of the project (.quality/threats.json) is complete enough to be useful.
//  - authProbe: the login of the running app resists guessing and does not say which accounts exist.
//    This one sends wrong passwords on purpose: local or staging only, on a disposable test account.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const read = (p) => { try { return readFileSync(p, "utf8"); } catch { return null; } };

// ---------------------------------------------------------------------------------------------------------
export function supplyChecks(root) {
  const checks = {};
  const add = (id, level, ok, value, rule, where) => { checks[id] = { level, ok, value, rule, ...(where ? { where } : {}) }; };
  const has = (f) => existsSync(join(root, f));
  const pkg = read(join(root, "package.json"));
  if (pkg) {
    const locks = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock", "bun.lockb", "npm-shrinkwrap.json"].filter(has);
    const ignored = (f) => spawnSync("git", ["check-ignore", "-q", f], { cwd: root }).status === 0;
    const committed = locks.filter((f) => !ignored(f));
    add("lockfile", "must", committed.length > 0, committed.length ? committed.join(", ") : locks.length ? `${locks.join(", ")} is ignored by git` : "no lockfile",
      "a lockfile is committed, and CI installs from it (npm ci, pnpm install --frozen-lockfile)");
    const pm = has("pnpm-lock.yaml") ? "pnpm" : has("yarn.lock") ? "yarn" : has("bun.lock") || has("bun.lockb") ? "bun" : "npm";
    const npmrc = read(join(root, ".npmrc")) || "";
    const ws = read(join(root, "pnpm-workspace.yaml")) || "";
    const yarnrc = read(join(root, ".yarnrc.yml")) || "";
    const bunfig = read(join(root, "bunfig.toml")) || "";
    // Cooldown in days, whatever the manager's unit.
    let days = null, src = null;
    const m1 = /^\s*min-release-age\s*=\s*(\d+)/m.exec(npmrc);
    const m2 = /^\s*minimumReleaseAge\s*:\s*(\d+)/m.exec(ws) || /^\s*minimum-release-age\s*=\s*(\d+)/m.exec(npmrc);
    const m3 = /^\s*npmMinimalAgeGate\s*:\s*["']?(\d+)\s*([dhm]?)/m.exec(yarnrc);
    const m4 = /^\s*minimumReleaseAge\s*=\s*(\d+)/m.exec(bunfig);
    if (m1) { days = Number(m1[1]); src = ".npmrc min-release-age"; }
    else if (m2) { days = Number(m2[1]) / 1440; src = "pnpm minimumReleaseAge"; }
    else if (m3) { days = Number(m3[1]) / (m3[2] === "d" ? 1 : m3[2] === "h" ? 24 : 1440); src = ".yarnrc.yml npmMinimalAgeGate"; }
    else if (m4) { days = Number(m4[1]) / 86400; src = "bunfig.toml minimumReleaseAge"; }
    const shown = days == null ? null : Math.round(days * 10) / 10;
    add("release_cooldown", days == null && pm === "pnpm" ? "should" : "must", days != null && days >= 1,
      days == null ? `no cooldown set for ${pm}${pm === "pnpm" ? " (recent pnpm versions default to 1 day: set it explicitly)" : ""}` : `${shown} day(s) (${src})`,
      "new package versions wait before they can be installed: at least 1 day, 7 recommended (npm min-release-age=7, pnpm minimumReleaseAge: 10080)");
    if (days != null && days >= 1) add("release_cooldown_week", "should", days >= 7, `${shown} day(s)`, "a 7-day cooldown: the malicious versions of 2025-2026 were all removed within days");
    const scriptsOff = /^\s*ignore-scripts\s*=\s*true/m.test(npmrc) || /^\s*strict-allow-scripts\s*=\s*true/m.test(npmrc) || /^\s*enableScripts\s*:\s*false/m.test(yarnrc);
    const pnpmOpen = /dangerouslyAllowAllBuilds\s*:\s*true/.test(ws) || /^\s*dangerously-allow-all-builds\s*=\s*true/m.test(npmrc);
    add("install_scripts", pm === "pnpm" ? "must" : "should", pm === "pnpm" ? !pnpmOpen : scriptsOff,
      pm === "pnpm" ? (pnpmOpen ? "dangerouslyAllowAllBuilds is on" : "pnpm blocks dependency build scripts unless listed in allowBuilds") : scriptsOff ? "install scripts restricted" : `install scripts of every dependency run freely (${pm})`,
      "dependencies cannot run install scripts unless explicitly allowed (npm: ignore-scripts=true or strict-allow-scripts=true; pnpm: allowBuilds list)");
  }
  // GitHub Actions: third-party actions pinned to a commit, token read-only by default.
  const wfDir = join(root, ".github", "workflows");
  if (existsSync(wfDir)) {
    const unpinned = [], firstParty = [], noPerms = [], prTarget = [], injected = [];
    for (const f of readdirSync(wfDir).filter((x) => /\.ya?ml$/.test(x))) {
      const text = read(join(wfDir, f)) || "";
      for (const m of text.matchAll(/^\s*-?\s*uses:\s*["']?([^\s"'#]+)/gm)) {
        const u = m[1];
        if (u.startsWith("./") || u.startsWith("docker://")) continue;
        if (/@[0-9a-f]{40}$/.test(u)) continue;
        (/^(actions|github)\//.test(u) ? firstParty : unpinned).push(`${f}: ${u}`);
      }
      if (!/^permissions:/m.test(text) && !/^\s+permissions:/m.test(text)) noPerms.push(f);
      if (/pull_request_target/.test(text)) prTarget.push(f);
      if (/run:[^\n]*\$\{\{\s*github\.event\.(issue|pull_request|comment|review|head_commit)\.[^}]*(title|body|message|name|ref)\b/.test(text)) injected.push(f);
    }
    add("actions_pinned", "must", unpinned.length === 0, `${unpinned.length} third-party action(s) not pinned to a commit`, "third-party GitHub Actions are pinned to a full commit SHA (a tag can be moved: it happened to a security scanner's own action in March 2026)", unpinned.slice(0, 6).join("; "));
    if (firstParty.length) add("actions_pinned_first_party", "should", false, `${firstParty.length} GitHub-owned action(s) pinned by tag`, "GitHub's own actions are pinned to a commit SHA too", firstParty.slice(0, 4).join("; "));
    add("actions_permissions", "must", noPerms.length === 0, noPerms.length ? `${noPerms.length} workflow(s) without a permissions block` : "every workflow sets permissions", "each workflow sets permissions, so the job token is read-only unless a job needs more", noPerms.join(", "));
    if (prTarget.length) add("actions_pr_target", "should", false, "pull_request_target is used", "pull_request_target runs with secrets on code from a fork: avoid it, or never check out the pull request's code under it", prTarget.join(", "));
    if (injected.length) add("actions_injection", "must", false, "text from an issue, pull request or commit is pasted into a run: script", "untrusted text never goes straight into a shell line: pass it through env:", injected.join(", "));
  }
  // Env files.
  const gi = read(join(root, ".gitignore")) || "";
  const envIgnored = /^\s*\.env(\*|\.\*|\.local)?\s*$/m.test(gi) || /^\s*\.env\b/m.test(gi);
  const tracked = spawnSync("git", ["ls-files", "--", ".env", ".env.local", ".env.production", ".env.development"], { cwd: root, encoding: "utf8" });
  const trackedEnv = (tracked.stdout || "").split(/\r?\n/).filter(Boolean);
  if (pkg || has(".env") || has(".env.example")) add("env_files", "must", trackedEnv.length === 0 && (envIgnored || !has(".env")), trackedEnv.length ? `tracked by git: ${trackedEnv.join(", ")}` : envIgnored ? ".env files are ignored" : has(".env") ? ".env exists and is not in .gitignore" : "no .env file",
    ".env files are never committed (.env.example with empty values is the only one in the repository)");
  const bots = ["dependabot.yml", "dependabot.yaml"].some((f) => has(join(".github", f))) || ["renovate.json", "renovate.json5", ".renovaterc", ".renovaterc.json"].some(has) || has(join(".github", "renovate.json"));
  if (pkg) add("update_bot", "should", bots, bots ? "Dependabot or Renovate configured" : "no update bot", "dependency updates arrive as pull requests (Dependabot or Renovate), with a cooldown that matches the package manager's");
  const must = Object.entries(checks).filter(([, c]) => c.level === "must" && !c.ok).map(([k]) => k);
  const should = Object.entries(checks).filter(([, c]) => c.level === "should" && !c.ok).map(([k]) => k);
  return { summary: { checks: Object.keys(checks).length, must_failed: must, should_failed: should }, checks,
    note: "Read from the repository files. Known vulnerabilities in dependencies are a separate check (deps_audit)." };
}

// ---------------------------------------------------------------------------------------------------------
const RESPONSES = ["mitigate", "eliminate", "transfer", "accept"];
const PRIORITIES = ["before-launch", "before-paying-customers", "accepted"];

// .quality/threats.json: assets, actors, entry_points, abuse_cases. Complete means: every entry point has at
// least one abuse case, every abuse case says what is done about it, and a mitigation names its test.
export function validateThreats(model) {
  const errors = [], warnings = [];
  if (!model || typeof model !== "object") return { ok: false, errors: ["no threat model: copy the template to .quality/threats.json and fill it (security-testing skill)"], warnings };
  for (const k of ["assets", "actors", "entry_points", "abuse_cases"]) if (!Array.isArray(model[k]) || !model[k].length) errors.push(`${k}: must be a non-empty list`);
  if (errors.length) return { ok: false, errors, warnings };
  if (!model.system || /^one sentence|^<|\bTODO\b/i.test(model.system)) errors.push("system: one sentence saying what the product does and for whom");
  const entries = new Map(model.entry_points.map((e) => [e.id, e]));
  if (entries.size !== model.entry_points.length || [...entries.keys()].some((k) => !k)) errors.push("entry_points: each needs a unique id");
  const covered = new Set();
  const open = [];
  model.abuse_cases.forEach((a, i) => {
    const where = `abuse_cases[${i}]${a?.id ? ` (${a.id})` : ""}`;
    if (!a?.text || a.text.length < 15) errors.push(`${where}: text says who tries what ("As a member I read another team's invoices by changing the id")`);
    for (const e of [].concat(a?.entry || [])) { if (!entries.has(e)) errors.push(`${where}: unknown entry point ${e}`); covered.add(e); }
    if (!a?.entry || ![].concat(a.entry).length) errors.push(`${where}: entry names the entry point(s) it goes through`);
    if (!RESPONSES.includes(a?.response)) errors.push(`${where}: response must be one of ${RESPONSES.join(", ")}`);
    if (a?.response === "mitigate" && !a.test) errors.push(`${where}: a mitigation names its test (an access check id, a test file, or "manual: how")`);
    if (a?.response === "accept" && !a.why) errors.push(`${where}: an accepted risk says why and who decided`);
    if (a?.priority && !PRIORITIES.includes(a.priority)) errors.push(`${where}: priority must be one of ${PRIORITIES.join(", ")}`);
    if (a?.status === "open" && a.priority !== "accepted" && a.response !== "accept") open.push({ id: a.id || `#${i + 1}`, priority: a.priority || "before-launch", text: a.text });
  });
  const uncovered = [...entries.keys()].filter((id) => !covered.has(id));
  if (uncovered.length) errors.push(`entry points without any abuse case: ${uncovered.join(", ")}`);
  if (model.reviewed) {
    const age = (Date.now() - Date.parse(model.reviewed)) / 86400000;
    if (Number.isNaN(age)) errors.push("reviewed: must be a date (YYYY-MM-DD)");
    else if (age > 180) warnings.push(`last reviewed ${model.reviewed}: review it again (new entry point, new kind of data, new role or new third party)`);
  } else errors.push("reviewed: date of the last review (YYYY-MM-DD)");
  const manual = model.abuse_cases.filter((a) => /^manual\b/i.test(a.test || "")).length;
  return { ok: !errors.length, errors, warnings,
    summary: { assets: model.assets.length, entry_points: model.entry_points.length, abuse_cases: model.abuse_cases.length,
      open_before_launch: open.filter((o) => o.priority === "before-launch").map((o) => `${o.id}: ${o.text}`), open_later: open.filter((o) => o.priority !== "before-launch").length,
      tested_by_hand: manual, accepted: model.abuse_cases.filter((a) => a.response === "accept").length } };
}

// ---------------------------------------------------------------------------------------------------------
const LOCAL = (h) => h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".localhost") || h.endsWith(".test");
const STAGING = /(^|[.-])(staging|stage|dev|test|qa|preview|sandbox)([.-]|$)/i;

// Where a URL points: "local", "staging" (declared as urls.staging, or a host labelled as a test environment),
// or "production" (everything else). Active tests only run on the first two.
export function classifyTarget(url, project) {
  let u;
  try { u = new URL(url); } catch { return "invalid"; }
  if (LOCAL(u.hostname)) return "local";
  const same = (other) => { try { return new URL(other).host === u.host; } catch { return false; } };
  if (project?.urls?.production && same(project.urls.production)) return "production";
  if (project?.urls?.staging && same(project.urls.staging)) return "staging";
  return STAGING.test(u.hostname.split(".").slice(0, -2).join(".")) ? "staging" : "production";
}

const fill = (v, vars) => typeof v === "string" ? v.replace(/\{(email|password)\}/g, (_, k) => vars[k]) : Array.isArray(v) ? v.map((x) => fill(x, vars))
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x, vars)])) : v;

async function attempt(base, login, vars) {
  const headers = { accept: "application/json, text/html;q=0.9", ...(login.headers || {}) };
  const form = login.form === true;
  const body = fill(login.body || { email: "{email}", password: "{password}" }, vars);
  headers["content-type"] = form ? "application/x-www-form-urlencoded" : "application/json";
  const started = performance.now();
  try {
    const res = await fetch(new URL(login.path, base), { method: login.method || "POST", headers, redirect: "manual", signal: AbortSignal.timeout(20000),
      body: form ? new URLSearchParams(body).toString() : JSON.stringify(body) });
    const text = await res.text().catch(() => "");
    return { status: res.status, ms: Math.round(performance.now() - started), bytes: text.length, location: res.headers.get("location") || "",
      shape: text.replace(/[0-9a-f]{16,}|\d{6,}/gi, "#").slice(0, 400), cookies: res.headers.getSetCookie?.() || [], retry_after: res.headers.get("retry-after") };
  } catch (e) { return { error: String(e.cause?.code || e.message).slice(0, 120) }; }
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

// project.json › auth_probe: { login: { path, method?, body?, form? }, known_email, unknown_email?, attempts? }
export async function authProbe(project, { base } = {}) {
  const cfg = project?.auth_probe;
  if (!cfg?.login?.path || !cfg.known_email) return { available: true, errors: ["no auth_probe in .quality/project.json: declare login.path and known_email (a disposable test account: it may get locked)"] };
  const baseUrl = base || project.urls?.local || project.urls?.staging;
  if (!baseUrl) return { available: true, errors: ["no URL: pass --base <url> or set urls.local or urls.staging in .quality/project.json"] };
  const where = classifyTarget(baseUrl, project);
  if (where !== "local" && where !== "staging") return { available: true, errors: [`${baseUrl} is not a local or staging address. This check sends wrong passwords on purpose and can lock accounts: it only runs on localhost or on the staging URL declared in project.json.`] };
  const n = Math.min(Math.max(Number(cfg.attempts) || 20, 5), 50);
  const unknown = cfg.unknown_email || `qp-nobody-${Date.now().toString(36)}@example.invalid`;
  const wrong = () => `qp-wrong-${Math.random().toString(36).slice(2, 10)}`;
  const checks = {};
  const add = (id, level, ok, value, rule) => { checks[id] = { level, ok, value, rule }; };

  // 1. Does the answer differ between an account that exists and one that does not?
  const k = [], u = [];
  for (let i = 0; i < 4; i++) { k.push(await attempt(baseUrl, cfg.login, { email: cfg.known_email, password: wrong() })); u.push(await attempt(baseUrl, cfg.login, { email: unknown, password: wrong() })); }
  if (k[0].error) return { available: true, errors: [`login request failed: ${k[0].error}`] };
  const sameStatus = k[0].status === u[0].status, sameShape = k[0].shape === u[0].shape && k[0].location === u[0].location;
  const dk = median(k.map((x) => x.ms)), du = median(u.map((x) => x.ms));
  const timing = Math.abs(dk - du) > Math.max(80, Math.min(dk, du));
  add("account_enumeration", "must", sameStatus && sameShape, sameStatus && sameShape ? `same answer for a known and an unknown account (HTTP ${k[0].status})` : `known account: HTTP ${k[0].status}, unknown account: HTTP ${u[0].status}${sameStatus ? ", different message" : ""}`,
    "a failed login answers the same way whether the account exists or not (same status, same message)");
  add("login_timing", "should", !timing, `median ${dk} ms for a known account, ${du} ms for an unknown one`, "a failed login takes about the same time whether the account exists or not (hash a dummy password for unknown accounts)");

  // 2. Session cookie flags, when the test account's password is given through the environment. Done before the
  // wrong passwords: a login that defends itself would refuse the right one afterwards.
  const pwEnv = cfg.password_env;
  if (pwEnv && process.env[pwEnv]) {
    const ok = await attempt(baseUrl, cfg.login, { email: cfg.known_email, password: process.env[pwEnv] });
    const session = (ok.cookies || []).filter((c) => /sess|sid|token|auth|jwt/i.test(c.split("=")[0]));
    if (session.length) {
      const bad = session.filter((c) => !/;\s*httponly/i.test(c) || !/;\s*samesite=(lax|strict)/i.test(c) || (new URL(baseUrl).protocol === "https:" && !/;\s*secure/i.test(c))).map((c) => c.split("=")[0]);
      add("session_cookie_flags", "must", bad.length === 0, bad.length ? `missing flags on: ${bad.join(", ")}` : `${session.length} session cookie(s) with HttpOnly and SameSite${new URL(baseUrl).protocol === "https:" ? " and Secure" : ""}`,
        "session cookies are HttpOnly, SameSite=Lax or Strict, and Secure over HTTPS");
    }
  }

  // 3. Guessing: wrong passwords in a row on the test account must be slowed or refused.
  let limitedAt = null, last = null;
  for (let i = 1; i <= n; i++) {
    last = await attempt(baseUrl, cfg.login, { email: cfg.known_email, password: wrong() });
    if (last.error) break;
    if (last.status === 429 || last.status === 423 || last.retry_after || (last.status !== k[0].status && last.status >= 400) || last.ms > Math.max(2000, dk * 8)) { limitedAt = i + 4; break; }
  }
  add("login_rate_limit", "must", limitedAt != null, limitedAt != null ? `refused or slowed after ${limitedAt} wrong passwords (HTTP ${last.status}${last.retry_after ? `, Retry-After ${last.retry_after}` : ""})` : `${n + 4} wrong passwords in a row, all answered normally`,
    "wrong passwords in a row on one account are slowed, refused or locked (counted per account, not only per IP)");

  const must = Object.entries(checks).filter(([, c]) => c.level === "must" && !c.ok).map(([x]) => x);
  const should = Object.entries(checks).filter(([, c]) => c.level === "should" && !c.ok).map(([x]) => x);
  return { available: true, base: baseUrl, target: where, summary: { checks: Object.keys(checks).length, must_failed: must, should_failed: should }, checks,
    note: `Sent ${8 + (limitedAt ? limitedAt - 4 : n)} failed logins to ${cfg.login.path}. The test account may now be locked. Not covered: password reset, signup, one-time codes, session invalidation on logout (see the security-testing skill).` };
}
