// Browser checks with the project's own Playwright install (no dependency in the pack):
// overflow at 5 widths, console errors, axe-core violations, touch targets, cookies and third-party
// requests before consent, screenshots. If Playwright is missing, returns how to install it.
import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const WIDTHS = [360, 390, 768, 1024, 1440];

function resolveFrom(cwd, names) {
  const req = createRequire(join(cwd, "package.json"));
  for (const n of names) {
    try { return { name: n, path: req.resolve(n) }; } catch { /* next */ }
  }
  return null;
}

async function launch(chromium) {
  try { return await chromium.launch(); } catch (first) {
    try { return await chromium.launch({ channel: "chrome" }); } catch { throw first; }
  }
}

const slug = (u) => u.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "page";

export async function browserChecks(urls, { cwd = process.cwd(), outDir } = {}) {
  const pw = resolveFrom(cwd, ["playwright", "@playwright/test"]);
  if (!pw) return { available: false, hint: "Install Playwright in the project: npm i -D @playwright/test && npx playwright install chromium" };
  const mod = await import(pathToFileURL(pw.path).href);
  const chromium = mod.chromium || mod.default?.chromium;
  const axePath = (() => { const r = resolveFrom(cwd, ["axe-core"]); return r ? r.path.replace(/axe(\.min)?\.js$|index\.js$/, "axe.min.js") : null; })();
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
        if (width === 1440 && axePath && existsSync(axePath)) {
          try {
            await page.addScriptTag({ path: axePath });
            res.axe = await page.evaluate(async () => {
              const r = await window.axe.run(document, { resultTypes: ["violations"] });
              return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
            });
          } catch (e) { res.axe = { error: String(e.message).slice(0, 200) }; }
        }
        await ctx.close();
      }
      if (!axePath) res.axe = { unavailable: "Install axe-core in the project to enable accessibility checks: npm i -D axe-core" };
      pages.push(res);
    }
  } finally {
    await browser.close();
  }
  return { available: true, playwright: pw.name, widths: WIDTHS, pages };
}
