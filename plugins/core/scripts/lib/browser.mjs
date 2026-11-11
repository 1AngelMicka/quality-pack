// Browser checks: overflow at 5 widths, console errors, axe-core violations, touch targets, cookies and
// third-party requests before consent, screenshots.
// Playwright and axe-core come from the project if it has them, otherwise from the pack's own cache
// (installed once by `qp.mjs browser-setup`, outside the project). The pack never adds them to the project.
import { createRequire } from "node:module";
import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const WIDTHS = [360, 390, 768, 1024, 1440];

// Where `browser-setup` installs Playwright and axe-core. QP_CACHE_DIR wins, then the plugin data
// folder Claude Code gives plugins, then ~/.cache/quality-pack.
export function cacheDir() {
  if (process.env.QP_CACHE_DIR) return process.env.QP_CACHE_DIR;
  return join(process.env.CLAUDE_PLUGIN_DATA || join(homedir(), ".cache", "quality-pack"), "browser");
}

function resolveFrom(base, names) {
  const req = createRequire(join(base, "package.json"));
  for (const n of names) {
    try { return { name: n, path: req.resolve(n) }; } catch { /* next */ }
  }
  return null;
}

const SETUP_HINT = "Playwright is not available. Run `node <qp.mjs> browser-setup` once (ask the user first: it downloads Playwright, axe-core and Chromium into the pack's cache, not into the project).";

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
      if (!axePath) res.axe = { unavailable: "axe-core not found: run `node <qp.mjs> browser-setup` (pack cache, not the project)." };
      pages.push(res);
    }
  } finally {
    await browser.close();
  }
  return { available: true, playwright: tools.playwright, from: tools.source, widths: WIDTHS, pages,
    note: "Only the pages as they load. What happens after the user acts (files added, tabs, dialogs) is in flows.json (`qp.mjs flows`)." };
}

// One-time install of Playwright, axe-core and Chromium into the pack's cache.
export function setupCommands() {
  return [
    ["browser-setup-npm", "npm install --no-audit --no-fund --loglevel=error playwright@1 axe-core@4"],
    ["browser-setup-chromium", "npx playwright install chromium"],
  ];
}
