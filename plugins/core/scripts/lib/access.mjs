// Access control played for real: every resource declared in .quality/project.json › access is requested
// by its owner (must work) and by every account that must not see it (must be refused), plus a visitor
// with no session. Broken access control is the first risk of a multi-account app (OWASP Top 10 A01,
// API Security Top 10 API1 "broken object level authorization"): reading the code does not prove it holds.
//
// Sessions come from headers or cookies given in the project file (values may use ${env:NAME}), or from
// login steps played in a browser (same step syntax as flows), after which the cookies are reused.
// Requests are plain HTTP (fetch, redirects not followed), so the result does not depend on what a page hides.
import { loadBrowserTools, launch } from "./browser.mjs";

const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"];
const WRITES = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DENIED = new Set([401, 403, 404, 405, 410]);
export const ANONYMOUS = "anonymous";

const env = (v) => typeof v !== "string" ? v : v.replace(/\$\{env:([A-Z0-9_]+)\}/g, (_, n) => {
  if (process.env[n] == null) throw new Error(`environment variable ${n} is not set`);
  return process.env[n];
});

// Check the access block of a project file. Returns normalised accounts and checks, and readable errors; never throws.
export function validateAccess(project) {
  const errors = [];
  const a = project?.access;
  if (a == null) return { accounts: {}, checks: [], errors };
  if (typeof a !== "object" || Array.isArray(a)) return { accounts: {}, checks: [], errors: ["access must be an object with accounts and checks"] };
  const accounts = a.accounts && typeof a.accounts === "object" ? a.accounts : {};
  const names = Object.keys(accounts);
  if (names.length < 2) errors.push("access.accounts: at least two accounts are needed (one that owns the data, one that must not see it)");
  for (const n of names) {
    const acc = accounts[n];
    if (n === ANONYMOUS) errors.push(`access.accounts: "${ANONYMOUS}" is built in (a visitor with no session), do not declare it`);
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(n)) errors.push(`access.accounts.${n}: name must be lower-case letters, digits, dashes or underscores`);
    if (!acc || typeof acc !== "object" || !(acc.headers || acc.cookies || Array.isArray(acc.login))) errors.push(`access.accounts.${n}: needs headers, cookies or login steps`);
    if (acc?.login && (!Array.isArray(acc.login) || !acc.login.length)) errors.push(`access.accounts.${n}.login: must be a non-empty list of steps (same syntax as flows)`);
  }
  const checks = [];
  const ids = new Set();
  if (!Array.isArray(a.checks) || !a.checks.length) errors.push("access.checks: must be a non-empty list");
  else a.checks.forEach((c, i) => {
    const where = `access.checks[${i}]${c?.id ? ` (${c.id})` : ""}`;
    if (!c || typeof c !== "object") { errors.push(`${where}: must be an object`); return; }
    const id = c.id || `check-${i + 1}`;
    if (ids.has(id)) errors.push(`${where}: duplicate id`);
    ids.add(id);
    const method = String(c.method || "GET").toUpperCase();
    if (!METHODS.includes(method)) errors.push(`${where}: unknown method ${c.method}`);
    if (!c.path || typeof c.path !== "string") errors.push(`${where}: path is required (for example /api/invoices/123)`);
    if (!c.owner || !(c.owner in accounts)) errors.push(`${where}: owner must be one of the declared accounts`);
    const denied = c.denied_to || [];
    if (!Array.isArray(denied) || !denied.length) errors.push(`${where}: denied_to must list at least one account (or "${ANONYMOUS}")`);
    for (const d of Array.isArray(denied) ? denied : []) {
      if (d !== ANONYMOUS && !(d in accounts)) errors.push(`${where}: denied_to names an unknown account "${d}"`);
      if (d === c.owner) errors.push(`${where}: the owner cannot also be in denied_to`);
    }
    checks.push({ id, name: c.name || `${method} ${c.path}`, method, path: c.path, owner: c.owner, denied_to: Array.isArray(denied) ? denied : [],
      body: c.body, secret: c.secret, owner_status: c.owner_status });
  });
  return { accounts, checks, errors, login_path: a.login_path || null };
}

// Play the login steps of the accounts that have some, and return their cookies and optional bearer token.
async function browserSessions(accounts, { root, base }) {
  const need = Object.entries(accounts).filter(([, a]) => Array.isArray(a.login));
  if (!need.length) return {};
  const tools = await loadBrowserTools(root);
  if (!tools) throw Object.assign(new Error("Playwright is not available. Run `node <sw.mjs> browser-setup` once (ask the user first), or give the accounts headers or cookies instead of login steps."), { unavailable: true });
  const { act } = await import("./flows.mjs");
  const browser = await launch(tools.chromium);
  const out = {};
  try {
    for (const [name, acc] of need) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, baseURL: base });
      const page = await ctx.newPage();
      try {
        for (const [i, step] of acc.login.entries()) {
          try { await act(page, step, root); await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {}); }
          catch (e) { throw new Error(`login step ${i + 1} failed: ${String(e.message).split("\n")[0].slice(0, 200)}`); }
        }
        const cookies = await ctx.cookies(base);
        const headers = {};
        if (cookies.length) headers.cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
        // Apps that keep a token in the browser instead of a cookie: name the storage key in bearer_from_storage.
        if (acc.bearer_from_storage) {
          const token = await page.evaluate((k) => localStorage.getItem(k) || sessionStorage.getItem(k), acc.bearer_from_storage);
          if (!token) throw new Error(`no "${acc.bearer_from_storage}" in localStorage or sessionStorage after login`);
          headers.authorization = `Bearer ${String(token).replace(/^"|"$/g, "")}`;
        }
        if (!Object.keys(headers).length) throw new Error("login left no cookie: add bearer_from_storage if the app keeps its token in the browser storage");
        out[name] = { headers };
      } catch (e) { out[name] = { error: String(e.message).slice(0, 240) }; }
      await ctx.close();
    }
  } finally { await browser.close(); }
  return out;
}

function staticSession(acc) {
  const headers = {};
  for (const [k, v] of Object.entries(acc.headers || {})) headers[k.toLowerCase()] = String(env(v));
  if (acc.cookies) {
    const c = typeof acc.cookies === "string" ? env(acc.cookies) : Object.entries(acc.cookies).map(([k, v]) => `${k}=${env(v)}`).join("; ");
    headers.cookie = headers.cookie ? `${headers.cookie}; ${c}` : c;
  }
  return { headers };
}

async function request(base, check, session) {
  const headers = { accept: "application/json, text/html;q=0.9, */*;q=0.5", ...(session?.headers || {}) };
  const init = { method: check.method, headers, redirect: "manual", signal: AbortSignal.timeout(20000) };
  if (check.body != null && check.method !== "GET" && check.method !== "HEAD") {
    init.body = typeof check.body === "string" ? check.body : JSON.stringify(check.body);
    if (!headers["content-type"]) headers["content-type"] = typeof check.body === "string" ? "text/plain" : "application/json";
  }
  try {
    const res = await fetch(new URL(check.path, base), init);
    const text = check.method === "HEAD" ? "" : await res.text().catch(() => "");
    return { status: res.status, location: res.headers.get("location"), body: text, bytes: text.length };
  } catch (e) { return { error: String(e.cause?.code || e.message).slice(0, 160) }; }
}

// Was the request refused? "denied", "leak" (the data came back), or "unclear" (a 200 that is neither the owner's
// answer nor an obvious refusal: usually an app shell or a soft error page — read it).
export function verdict(check, res, ownerRes) {
  if (res.error) return { verdict: "error", why: res.error };
  if (DENIED.has(res.status)) return { verdict: "denied", why: `HTTP ${res.status}` };
  if (res.status >= 300 && res.status < 400) return { verdict: "denied", why: `redirected to ${res.location || "another page"}` };
  if (res.status >= 500) return { verdict: "unclear", why: `HTTP ${res.status}: the server failed instead of refusing` };
  if (check.secret) return res.body.includes(check.secret)
    ? { verdict: "leak", why: `HTTP ${res.status} and the answer contains "${check.secret}"` }
    : { verdict: "denied", why: `HTTP ${res.status} without "${check.secret}"` };
  if (WRITES.has(check.method)) return { verdict: "leak", why: `HTTP ${res.status}: the write was accepted` };
  if (ownerRes && !ownerRes.error && res.body === ownerRes.body && res.bytes > 0) return { verdict: "leak", why: `HTTP ${res.status} with the same answer as the owner` };
  return { verdict: "unclear", why: `HTTP ${res.status} with a different answer from the owner's: add "secret" (a text only the owner should get) to decide` };
}

export async function runAccess(project, { root, base, allowProduction = false } = {}) {
  const v = validateAccess(project);
  if (v.errors.length) return { available: true, errors: v.errors };
  if (!v.checks.length) return { available: true, errors: ["no access block in .quality/project.json: declare two accounts and the resources each must not reach (see /sw:kickoff)"] };
  const baseUrl = base || project.urls?.local || project.urls?.staging;
  if (!baseUrl) return { available: true, errors: ["no URL: pass --base <url> or set urls.local or urls.staging in .quality/project.json"] };
  const prod = project.urls?.production;
  const sameHost = (a, b) => { try { return new URL(a).host === new URL(b).host; } catch { return false; } };
  const writes = v.checks.some((c) => WRITES.has(c.method));
  if (prod && sameHost(baseUrl, prod) && !allowProduction)
    return { available: true, errors: [`${baseUrl} is the production site. Access checks send real requests${writes ? ", including writes" : ""}: run them on local or staging, or pass --allow-production after the user agreed.`] };
  let sessions = {};
  try { sessions = await browserSessions(v.accounts, { root, base: baseUrl }); }
  catch (e) { if (e.unavailable) return { available: false, hint: e.message }; throw e; }
  for (const [name, acc] of Object.entries(v.accounts)) if (!sessions[name]) {
    try { sessions[name] = staticSession(acc); } catch (e) { sessions[name] = { error: String(e.message) }; }
  }
  sessions[ANONYMOUS] = { headers: {} };
  const results = [];
  for (const check of v.checks) {
    const entry = { id: check.id, name: check.name, method: check.method, path: check.path, owner: check.owner, attempts: [] };
    const os = sessions[check.owner];
    let ownerRes = null;
    if (os.error) entry.setup_error = `owner ${check.owner}: ${os.error}`;
    else {
      // A write by the owner would change the data before the others try: the owner is only asked for reads.
      if (!WRITES.has(check.method)) {
        ownerRes = await request(baseUrl, check, os);
        const want = check.owner_status || null;
        const ok = !ownerRes.error && (want ? ownerRes.status === want : ownerRes.status >= 200 && ownerRes.status < 300) && (!check.secret || ownerRes.body.includes(check.secret));
        entry.owner_result = { status: ownerRes.status ?? null, ok, error: ownerRes.error };
        if (!ok) entry.setup_error = ownerRes.error ? `owner ${check.owner}: ${ownerRes.error}`
          : check.secret && ownerRes.status < 300 && !ownerRes.body.includes(check.secret) ? `owner ${check.owner} does not get "${check.secret}": the check proves nothing until it does`
          : `owner ${check.owner} gets HTTP ${ownerRes.status}: the check proves nothing until the owner can reach the resource`;
      }
    }
    if (!entry.setup_error) for (const who of check.denied_to) {
      const s = sessions[who];
      if (s.error) { entry.attempts.push({ as: who, verdict: "error", why: s.error }); continue; }
      const res = await request(baseUrl, check, s);
      entry.attempts.push({ as: who, status: res.status ?? null, ...verdict(check, res, ownerRes) });
    }
    results.push(entry);
  }
  const attempts = results.flatMap((r) => r.attempts.map((a) => ({ ...a, check: r.id })));
  const list = (k) => attempts.filter((a) => a.verdict === k).map((a) => `${a.check} as ${a.as}: ${a.why}`);
  return { available: true, base: baseUrl, accounts: Object.keys(v.accounts).concat(ANONYMOUS),
    session_errors: Object.entries(sessions).filter(([, s]) => s.error).map(([n, s]) => `${n}: ${s.error}`), checks: results,
    summary: { checks: results.length, attempts: attempts.length, denied: attempts.filter((a) => a.verdict === "denied").length,
      leaks: list("leak"), unclear: list("unclear"), errors: list("error"), setup_errors: results.filter((r) => r.setup_error).map((r) => `${r.id}: ${r.setup_error}`) },
    note: "Only the resources declared in project.json › access are tried. A clean result covers those, not every route: declare one check per kind of resource (and per role)." };
}

// What the CLI prints: the summary and one line per check.
export function compactAccess(result) {
  if (!result.checks) return result;
  return { base: result.base, summary: result.summary, session_errors: result.session_errors, full_report: "access.json",
    checks: result.checks.map((c) => ({ id: c.id, request: `${c.method} ${c.path}`, owner: c.owner, setup_error: c.setup_error,
      attempts: c.attempts.map((a) => `${a.as}: ${a.verdict}`).join(", ") })), note: result.note };
}
