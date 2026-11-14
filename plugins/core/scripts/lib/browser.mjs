// Browser checks: overflow at 5 widths, console errors, axe-core violations, touch targets, cookies and
// third-party requests before consent, screenshots.
// Playwright and axe-core come from the project if it has them, otherwise from the pack's own cache
// (installed once by `sw.mjs browser-setup`, outside the project). The pack never adds them to the project.
import { createRequire } from "node:module";
import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// 1920: layouts that only break on wide screens (gutters that grow with the viewport)
export const WIDTHS = [360, 390, 768, 1024, 1440, 1920];

// Where `browser-setup` installs Playwright and axe-core. QP_CACHE_DIR wins, then the plugin data
// folder Claude Code gives plugins, then ~/.cache/shipwright (or ~/.cache/quality-pack if it was installed under the old name).
export function cacheDir() {
  if (process.env.QP_CACHE_DIR) return process.env.QP_CACHE_DIR;
  if (process.env.CLAUDE_PLUGIN_DATA) return join(process.env.CLAUDE_PLUGIN_DATA, "browser");
  // The pack was called quality-pack before 0.8.0: a cache installed under that name keeps working.
  const old = join(homedir(), ".cache", "quality-pack", "browser");
  const now = join(homedir(), ".cache", "shipwright", "browser");
  return !existsSync(now) && existsSync(old) ? old : now;
}

function resolveFrom(base, names) {
  const req = createRequire(join(base, "package.json"));
  for (const n of names) {
    try { return { name: n, path: req.resolve(n) }; } catch { /* next */ }
  }
  return null;
}

const SETUP_HINT = "Playwright is not available. Run `node <sw.mjs> browser-setup` once (ask the user first: it downloads Playwright, axe-core and Chromium into the pack's cache, not into the project).";

// Playwright's chromium and the path of axe.min.js, from the project first, then from the cache.
export async function loadBrowserTools(cwd) {
  for (const [source, base] of [["project", cwd], ["cache", cacheDir()]]) {
    const pw = resolveFrom(base, ["playwright", "@playwright/test"]);
    if (!pw) continue;
    const mod = await import(pathToFileURL(pw.path).href);
    const chromium = mod.chromium || mod.default?.chromium;
    const axe = resolveFrom(cwd, ["axe-core"]) || resolveFrom(cacheDir(), ["axe-core"]);
    const axePath = axe ? axe.path.replace(/axe(\.min)?\.js$|index\.js$/, "axe.min.js") : null;
    return { source, playwright: pw.name, path: pw.path, chromium, axePath: axePath && existsSync(axePath) ? axePath : null };
  }
  return null;
}

export async function launch(chromium) {
  try { return await chromium.launch(); } catch (first) {
    try { return await chromium.launch({ channel: "chrome" }); } catch { throw first; }
  }
}

const slug = (u) => u.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "page";

export async function browserChecks(urls, { cwd = process.cwd(), outDir } = {}) {
  const tools = await loadBrowserTools(cwd);
  if (!tools) return { available: false, hint: SETUP_HINT };
  const { chromium, axePath } = tools;
  const browser = await launch(chromium);
  const shots = outDir ? join(outDir, "screens") : null;
  if (shots) mkdirSync(shots, { recursive: true });
  const pages = [];
  try {
    for (const url of urls) {
      const origin = new URL(url).hostname;
      const res = { url, widths: {}, console: [], page_errors: [], axe: null, touch_targets_under_44: null,
        cookies_before_consent: [], storage_keys_before_consent: [], third_party_hosts: [] };
      for (const width of WIDTHS) {
        const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 800 : 900 },
          isMobile: width < 768, hasTouch: width < 768 });
        const page = await ctx.newPage();
        const hosts = new Set();
        if (width === WIDTHS[0]) {
          page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && res.console.length < 50) res.console.push({ type: m.type(), text: m.text().slice(0, 300) }); });
          page.on("pageerror", (e) => { if (res.page_errors.length < 20) res.page_errors.push(String(e.message).slice(0, 300)); });
          page.on("request", (r) => { try { const h = new URL(r.url()).hostname; if (h && h !== origin && !h.endsWith(`.${origin}`)) hosts.add(h); } catch {} });
        }
        let status = null;
        try {
          const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
          status = resp?.status() ?? null;
        } catch (e) {
          res.widths[width] = { error: String(e.message).slice(0, 200) };
          await ctx.close();
          continue;
        }
        const overflow = await page.evaluate(() => {
          const el = document.documentElement;
          const wide = [...document.querySelectorAll("body *")].filter((n) => n.getBoundingClientRect().right > el.clientWidth + 1)
            .slice(0, 5).map((n) => n.tagName.toLowerCase() + (n.id ? `#${n.id}` : "") + (n.className && typeof n.className === "string" ? "." + n.className.trim().split(/\s+/).slice(0, 2).join(".") : ""));
          return { scroll_width: el.scrollWidth, client_width: el.clientWidth, overflow: el.scrollWidth > el.clientWidth + 1, offenders: wide };
        });
        res.widths[width] = { status, ...overflow };
        if (shots) {
          const file = join(shots, `${slug(url)}-${width}.png`);
          await page.screenshot({ path: file, fullPage: false });
          res.widths[width].screenshot = file;
        }
        if (width === WIDTHS[0]) {
          res.cookies_before_consent = (await ctx.cookies()).map((c) => ({ name: c.name, domain: c.domain }));
          res.storage_keys_before_consent = await page.evaluate(() => { try { return Object.keys(localStorage); } catch { return []; } });
          res.third_party_hosts = [...hosts].sort();
        }
        if (width === 390) {
          res.touch_targets_under_44 = await page.evaluate(() => {
            const els = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link]")];
            const small = els.filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
              return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && (r.width < 44 || r.height < 44); });
            return { total: els.length, small: small.length,
              samples: small.slice(0, 8).map((e) => `${e.tagName.toLowerCase()} "${(e.innerText || e.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`) };
          });
        }
        if (width === 1440 && axePath) {
          try {
            await page.evaluate(readFileSync(axePath, "utf8")); // not blocked by a strict CSP, unlike addScriptTag
            res.axe = await page.evaluate(async () => {
              const r = await window.axe.run(document, { resultTypes: ["violations"] });
              return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
            });
          } catch (e) { res.axe = { error: String(e.message).slice(0, 200) }; }
        }
        await ctx.close();
      }
      if (!axePath) res.axe = { unavailable: "axe-core not found: run `node <sw.mjs> browser-setup` (pack cache, not the project)." };
      pages.push(res);
    }
  } finally {
    await browser.close();
  }
  return { available: true, playwright: tools.playwright, from: tools.source, widths: WIDTHS, pages,
    note: "Only the pages as they load. What happens after the user acts (files added, tabs, dialogs) is in flows.json (`sw.mjs flows`)." };
}

// --- Shared by look, craft, stress and deslop: what the page really showed, --before and --as <account> -------

// A local address: a development server, where some rules (404 status, absolute share image) cannot hold yet.
export const isLocalUrl = (u) => { try { return /^(localhost|127(\.\d+){3}|\[::1\]|0\.0\.0\.0)$|\.(localhost|test)$/i.test(new URL(u).hostname); } catch { return false; } };

// Two addresses show the same screen when origin, path (trailing slash aside) and hash route match. A query
// added on the way (?next=/app) is ignored, a different path or hash route (#/login) is not.
export function sameScreen(requested, final) {
  try {
    const a = new URL(requested), b = new URL(final);
    const path = (u) => u.pathname.replace(/\/+$/, "") || "/";
    const route = (u) => u.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
    const hashRoute = (u) => /^#\//.test(u.hash);
    return a.origin === b.origin && path(a) === path(b) && (!(hashRoute(a) || hashRoute(b)) || route(a) === route(b));
  } catch { return requested === final; }
}

// Responses that say the page was not the one meant: refused (401, 403) or rate-limited (429).
export function watchDenied(page, list) {
  page.on("response", (res) => { const s = res.status(); if ([401, 403, 429].includes(s) && list.length < 20) list.push({ status: s, url: res.url().slice(0, 200) }); });
}

// What the browser really measured, compared with what was asked. `warnings` is empty when it is the same screen.
export function reachOf(requested, final, denied = []) {
  const r = { requested, final: final || requested, same_screen: !final || sameScreen(requested, final), denied: denied.slice(0, 10), warnings: [] };
  if (!r.same_screen) r.warnings.push(`NOT THE REQUESTED SCREEN: asked for ${requested}, the browser ended on ${r.final} (a redirect, often to the login page). Every measure below is of that page: do not read it as a pass. Use --as <account> (access.accounts in project.json) or --before.`);
  if (r.denied.length) {
    const codes = [...new Set(r.denied.map((d) => d.status))].join(", ");
    r.warnings.push(`${r.denied.length} response(s) ${codes} while measuring, first ${r.denied[0].url}${r.denied.some((d) => d.status === 429) ? ": the app's rate limit refused requests (too many logins?). Wait a minute; --as logs in once per command" : ": part of the page may be missing"}.`);
  }
  return r;
}

// Every value of a repeatable option (--before a --before b), removed from the argument list.
export function takeAll(args, name) {
  const values = [];
  for (let i = args.indexOf(`--${name}`); i !== -1; i = args.indexOf(`--${name}`)) { values.push(args[i + 1]); args.splice(i, 2); }
  return values.filter((v) => v != null);
}

// --before: code, or a file of code, run in the page before its own scripts on every load (same as sw deslop --before).
export function readBefore(list = [], base = process.cwd()) {
  return list.map((b) => { const f = join(base, b); try { return existsSync(b) ? readFileSync(b, "utf8") : existsSync(f) ? readFileSync(f, "utf8") : b; } catch { return b; } });
}

const fromEnv = (v) => typeof v !== "string" ? v : v.replace(/\$\{env:([A-Z0-9_]+)\}/g, (_, n) => {
  if (process.env[n] == null) throw new Error(`environment variable ${n} is not set`);
  return process.env[n];
});

// --as <account>: the session of an account declared in project.json › access.accounts. Login steps (same syntax
// as flows) are played once, in their own context, and the storage they leave (cookies, localStorage) is reused by
// every measure of the command; headers and cookies given in the project file are sent as they are.
export async function accountSession(browser, project, name, { root, base }) {
  const accounts = project?.access?.accounts || {};
  const acc = accounts[name];
  if (!acc) throw new Error(`--as ${name}: no access.accounts.${name} in .quality/project.json (${Object.keys(accounts).join(", ") || "no account declared"})`);
  const headers = {};
  for (const [k, v] of Object.entries(acc.headers || {})) headers[k.toLowerCase()] = String(fromEnv(v));
  if (acc.cookies) headers.cookie = typeof acc.cookies === "string" ? fromEnv(acc.cookies) : Object.entries(acc.cookies).map(([k, v]) => `${k}=${fromEnv(v)}`).join("; ");
  let storageState = null;
  if (Array.isArray(acc.login) && acc.login.length) {
    const { act } = await import("./flows.mjs");
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, baseURL: base, ...(Object.keys(headers).length ? { extraHTTPHeaders: headers } : {}) });
    const page = await ctx.newPage();
    const denied = [];
    watchDenied(page, denied);
    try {
      for (const [i, step] of acc.login.entries()) {
        try { await act(page, step, root); await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {}); }
        catch (e) { throw new Error(`--as ${name}: login step ${i + 1} failed${denied.some((d) => d.status === 429) ? " (the app answered 429: too many logins, wait a minute)" : ""}: ${String(e.message).split("\n")[0].slice(0, 200)}`); }
      }
      storageState = await ctx.storageState();
    } finally { await ctx.close(); }
  }
  return { account: name, storageState, headers };
}

// A browser context for a measure, with the account's session and the --before scripts.
export async function measureContext(browser, options = {}, { session = null, before = [] } = {}) {
  const extra = {};
  if (session?.storageState) extra.storageState = session.storageState;
  if (session?.headers && Object.keys(session.headers).length) extra.extraHTTPHeaders = session.headers;
  const ctx = await browser.newContext({ ...options, ...extra });
  for (const source of before) await ctx.addInitScript(source);
  return ctx;
}

// One-time install of Playwright, axe-core and Chromium into the pack's cache.
export function setupCommands() {
  return [
    ["browser-setup-npm", "npm install --no-audit --no-fund --loglevel=error playwright@1 axe-core@4"],
    ["browser-setup-chromium", "npx playwright install chromium"],
  ];
}
