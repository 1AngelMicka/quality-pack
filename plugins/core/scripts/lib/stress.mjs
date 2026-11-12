// Finishing passes: the same screen shown in the conditions where average products break, with a screenshot
// of each and what can be detected without judgement. A screen is usually built and looked at once, with
// short sample data, a fast network and a mouse; these passes are everything else:
//   slow      every data request answers late: is there something on screen while waiting?
//   failing   every data request fails: does the screen say so and offer a way out, or stay blank or crash?
//   long      every label, heading and cell three times longer: does the layout hold?
//   narrow    320 px wide (WCAG 1.4.10 reflow): no sideways scrolling
//   dark      dark colour scheme requested
//   keyboard  Tab only: is focus trapped, how many stops before the main content?
//   no_script scripts off: is there any content at all (public pages)?
// What a tool cannot do is decide whether the empty state is good or the error message kind: read the screenshots.
import { mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { loadBrowserTools, launch } from "./browser.mjs";

export const PASSES = ["slow", "failing", "long", "narrow", "dark", "keyboard", "no_script"];
const DESKTOP = { width: 1440, height: 900 };

// What is on screen: amount of text, signs of waiting, signs of an error message, overflow.
function look() {
  const shown = (e) => { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight * 3; };
  const text = (document.body.innerText || "").replace(/\s+/g, " ").trim();
  const waiting = [...document.querySelectorAll("[aria-busy=true], [role=progressbar], [role=status], progress, [class*=skeleton i], [class*=spinner i], [class*=loading i], [class*=loader i], [class*=shimmer i], [class*=placeholder-glow i], .animate-pulse, .animate-spin")].filter(shown).length;
  const errorWords = /\b(error|erreur|failed|échec|echec|went wrong|could not|couldn[’']t|unable|impossible|problème|probleme|try again|retry|réessayer|reessayer|offline|hors[- ]ligne|unavailable|indisponible)\b/i;
  const alerts = [...document.querySelectorAll("[role=alert], [aria-live=assertive]")].filter(shown).filter((e) => e.textContent.trim().length > 3).length;
  const retry = [...document.querySelectorAll("button, a[href], [role=button]")].filter(shown).some((e) => /try again|retry|réessayer|reessayer|recharger|reload|refresh|actualiser/i.test(e.textContent || e.getAttribute("aria-label") || ""));
  const el = document.documentElement;
  const bg = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g)?.map(Number) || [255, 255, 255];
  const rootBg = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)?.map(Number) || [255, 255, 255, 0];
  const c = (bg[3] ?? 1) > 0.1 ? bg : (rootBg[3] ?? 1) > 0.1 ? rootBg : [255, 255, 255];
  return { chars: text.length, sample: text.slice(0, 120), waiting, error_message: errorWords.test(text) || alerts > 0, retry,
    horizontal_overflow: el.scrollWidth > el.clientWidth + 1, luminance: Math.round(((0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255) * 100) / 100 };
}

// Triple the short texts a user or a translation can make longer, then report what broke.
function lengthen() {
  const shown = (e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && r.width > 1 && r.height > 1; };
  const targets = [...document.querySelectorAll("h1, h2, h3, h4, button, a, label, th, td, li, [role=tab], [role=button], [class*=badge i], [class*=chip i], [class*=tag i], [class*=title i], [class*=name i]")].filter(shown);
  let changed = 0;
  for (const e of targets) for (const n of e.childNodes) {
    if (n.nodeType !== 3) continue;
    const t = n.textContent.trim();
    if (t.length < 2 || t.length > 80) continue;
    n.textContent = `${t} ${t} ${t}`;
    changed++;
  }
  const name = (e) => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""} "${e.textContent.trim().slice(0, 30)}"`;
  const clipped = [], escaped = [];
  for (const e of targets) {
    if (!shown(e)) continue;
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    const hides = /hidden|clip/.test(s.overflowX) || /hidden|clip/.test(s.overflowY);
    const ellipsis = s.textOverflow === "ellipsis" || s.webkitLineClamp !== "none";
    if (hides && !ellipsis && (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2)) clipped.push(name(e));
    const p = e.parentElement?.getBoundingClientRect();
    if (p && (r.right > p.right + 2 || r.left < p.left - 2) && r.width > 0 && getComputedStyle(e.parentElement).overflowX === "visible" && r.right > innerWidth) escaped.push(name(e));
  }
  const el = document.documentElement;
  return { changed, clipped: [...new Set(clipped)].slice(0, 8), clipped_count: new Set(clipped).size, horizontal_overflow: el.scrollWidth > el.clientWidth + 1, overflow_px: Math.max(0, el.scrollWidth - el.clientWidth), escaped: [...new Set(escaped)].slice(0, 5) };
}

const isData = (req) => ["xhr", "fetch"].includes(req.resourceType());

async function open(browser, url, { context = {}, before } = {}) {
  const ctx = await browser.newContext({ viewport: DESKTOP, ...context });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => { if (errors.length < 10) errors.push(String(e.message).split("\n")[0].slice(0, 160)); });
  if (before) await before(page, ctx);
  return { ctx, page, errors };
}

export async function stressAt(url, { cwd, outDir, root = cwd, only = PASSES, darkExpected = false, publicPage = false } = {}) {
  const tools = await loadBrowserTools(cwd);
  if (!tools) return { available: false, hint: "Playwright is not available. Run `node <qp.mjs> browser-setup` once (pack cache, not the project)." };
  const shots = outDir ? join(outDir, "stress") : null;
  if (shots) mkdirSync(shots, { recursive: true });
  const slug = (url.startsWith("file:") ? url.split("/").pop() : url.replace(/^[a-z]+:\/\//, "")).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "page";
  const shot = async (page, name) => { if (!shots) return undefined; const f = join(shots, `${slug}-${name}.png`); return (await page.screenshot({ path: f }).then(() => true, () => false)) ? relative(root, f).split("\\").join("/") : undefined; };
  const goto = (page, wait = "networkidle") => page.goto(url, { waitUntil: wait, timeout: 30000 }).catch((e) => { if (!/Timeout|networkidle/i.test(e.message)) throw e; });
  const browser = await launch(tools.chromium);
  const passes = {};
  const add = (id, level, ok, value, rule, extra = {}) => { passes[id] = { level, ok, value, rule, ...extra }; };
  try {
    // Baseline: the page as it normally loads, and whether it asks a server for data.
    let dataRequests = 0;
    const base = await open(browser, url, { before: (page) => page.on("request", (r) => { if (isData(r)) dataRequests++; }) });
    try { await goto(base.page); } catch (e) { await base.ctx.close(); return { available: true, url, errors: [`the page does not load: ${String(e.message).split("\n")[0].slice(0, 200)}`] }; }
    await base.page.waitForTimeout(400);
    const normal = await base.page.evaluate(look);
    const baseline = { chars: normal.chars, data_requests: dataRequests, screenshot: await shot(base.page, "normal") };
    await base.ctx.close();

    if (only.includes("slow") && dataRequests > 0) {
      const s = await open(browser, url, { before: (page) => page.route("**/*", async (route) => { if (isData(route.request())) await new Promise((r) => setTimeout(r, 3000)); await route.continue().catch(() => {}); }) });
      await goto(s.page, "domcontentloaded");
      await s.page.waitForTimeout(900);
      const mid = await s.page.evaluate(look).catch(() => null);
      const img = await shot(s.page, "slow");
      await s.ctx.close();
      if (mid) {
        add("slow_not_blank", "must", mid.chars >= 20 || mid.waiting > 0, mid.chars < 20 && !mid.waiting ? "a blank screen while data loads" : `${mid.chars} characters and ${mid.waiting} waiting indicator(s) on screen after 0.9 s`,
          "while data loads, the screen shows its structure or a waiting indicator, never nothing", { screenshot: img });
        add("slow_indicator", "should", mid.waiting > 0 || mid.chars >= normal.chars * 0.9, mid.waiting > 0 ? `${mid.waiting} waiting indicator(s)` : mid.chars >= normal.chars * 0.9 ? "the content is already there (rendered on the server)" : "content missing and nothing says it is loading",
          "a block that waits for data says so (skeleton that matches the layout, or a spinner for a single block)", { screenshot: img });
      }
    }

    if (only.includes("failing") && dataRequests > 0) {
      const f = await open(browser, url, { before: (page) => page.route("**/*", (route) => (isData(route.request()) ? route.abort("failed") : route.continue())) });
      await goto(f.page);
      await f.page.waitForTimeout(800);
      const st = await f.page.evaluate(look).catch(() => null);
      const img = await shot(f.page, "failing");
      await f.ctx.close();
      if (st) {
        add("failing_not_blank", "must", st.chars >= 20, st.chars < 20 ? "a blank screen when data requests fail" : `${st.chars} characters on screen`, "when the server does not answer, the screen still shows something", { screenshot: img });
        add("failing_no_crash", "must", f.errors.length === 0, f.errors.length ? `${f.errors.length} uncaught error(s): ${f.errors[0]}` : "no uncaught error", "a failed request is caught: no uncaught exception", { screenshot: img });
        add("failing_message", "should", st.error_message, st.error_message ? `an error message is shown${st.retry ? ", with a way to retry" : ""}` : "nothing on screen says that loading failed",
          "a failed load says what happened and offers a way out (retry, go back)", { screenshot: img });
        if (st.error_message) add("failing_retry", "should", st.retry, st.retry ? "retry offered" : "no retry or reload action", "the error state offers to try again", { screenshot: img });
      }
    }

    if (only.includes("long")) {
      const l = await open(browser, url);
      await goto(l.page);
      await l.page.waitForTimeout(300);
      const r = await l.page.evaluate(lengthen).catch(() => null);
      await l.page.waitForTimeout(200);
      const img = await shot(l.page, "long");
      await l.ctx.close();
      if (r && r.changed) {
        add("long_no_overflow", "must", !r.horizontal_overflow, r.horizontal_overflow ? `the page scrolls sideways by ${r.overflow_px} px with texts three times longer` : `${r.changed} texts tripled, no sideways scrolling`,
          "labels three times longer (a long name, a translation) do not push the page wider than the screen", { screenshot: img, samples: r.escaped });
        add("long_no_clipping", "should", r.clipped_count === 0, `${r.clipped_count} text(s) cut without an ellipsis`, "a text too long for its box wraps or ends with an ellipsis, it is not cut mid-letter", { screenshot: img, samples: r.clipped });
      }
    }

    if (only.includes("narrow")) {
      const n = await open(browser, url, { context: { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true } });
      await goto(n.page);
      await n.page.waitForTimeout(300);
      const st = await n.page.evaluate(look).catch(() => null);
      const img = await shot(n.page, "narrow");
      await n.ctx.close();
      if (st) add("narrow_reflow", "must", !st.horizontal_overflow, st.horizontal_overflow ? "sideways scrolling at 320 px" : "no sideways scrolling at 320 px", "at 320 px wide the content reflows into one column without sideways scrolling (WCAG 1.4.10)", { screenshot: img });
    }

    if (only.includes("dark")) {
      const d = await open(browser, url, { context: { colorScheme: "dark" } });
      await goto(d.page);
      await d.page.waitForTimeout(300);
      const st = await d.page.evaluate(look).catch(() => null);
      const img = await shot(d.page, "dark");
      await d.ctx.close();
      if (st) {
        const follows = st.luminance < 0.4 || normal.luminance < 0.4;
        if (darkExpected) add("dark_followed", "must", follows, follows ? `page background luminance ${st.luminance} with a dark scheme requested` : `the page stays light (luminance ${st.luminance}) although the project declares a dark theme`,
          "a project with a dark theme follows the system's dark colour scheme", { screenshot: img });
        else passes.dark_followed = { level: "info", ok: true, value: follows ? "the page follows the dark colour scheme" : "the page has no dark theme (not declared in project.json: nothing to check)", screenshot: img };
      }
    }

    if (only.includes("keyboard")) {
      const k = await open(browser, url);
      await goto(k.page);
      await k.page.waitForTimeout(300);
      const seen = [];
      let trapped = null, reachedMain = null, lost = 0;
      const total = await k.page.evaluate(() => document.querySelectorAll("a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])").length);
      for (let i = 1; i <= Math.min(60, total + 5); i++) {
        await k.page.keyboard.press("Tab");
        const st = await k.page.evaluate(() => {
          const e = document.activeElement;
          if (!e || e === document.body) return { none: true };
          if (!e.dataset.qpK) e.dataset.qpK = Math.random().toString(36).slice(2, 8);
          const r = e.getBoundingClientRect(), s = getComputedStyle(e);
          const main = document.querySelector("main, [role=main], #main, #content, article");
          // A page without a main landmark has no header to skip: every stop counts as content.
          const stops = "a[href], button:not([disabled]), input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex='-1'])";
          return { id: e.dataset.qpK, in_main: !main || !main.querySelector(stops) || main.contains(e), visible: r.width > 0 && r.height > 0 && s.visibility !== "hidden", skip: /skip|aller au contenu|passer/i.test(e.textContent || "") };
        }).catch(() => ({ none: true }));
        if (st.none) { lost++; continue; }
        if (!st.visible) lost++;
        if (seen.length >= 3 && seen.slice(-3).every((x) => x === st.id)) { trapped = i; break; }
        if (reachedMain == null && st.in_main) reachedMain = i;
        if (seen.includes(st.id) && seen[0] === st.id) break; // back to the first stop
        seen.push(st.id);
        if (i === 1 && st.skip) reachedMain = reachedMain ?? 1;
      }
      const img = await shot(k.page, "keyboard");
      await k.ctx.close();
      if (total > 0) {
        add("keyboard_no_trap", "must", trapped == null, trapped ? `focus stops moving after ${trapped} presses of Tab` : `${new Set(seen).size} stops, focus keeps moving`, "the Tab key goes through every control and never gets stuck", { screenshot: img });
        add("keyboard_reaches_content", "should", reachedMain != null && reachedMain <= 15, reachedMain == null ? "no stop inside the main content in the first presses" : `main content reached after ${reachedMain} press(es) of Tab`,
          "the main content is reached within 15 presses of Tab, or a skip link comes first", { screenshot: img });
        if (lost > 2) add("keyboard_focus_visible_target", "should", false, `${lost} presses of Tab land on nothing visible`, "focus never goes to a hidden or off-screen element");
      }
    }

    if (only.includes("no_script")) {
      const j = await open(browser, url, { context: { javaScriptEnabled: false } });
      await goto(j.page, "load");
      const st = await j.page.evaluate(look).catch(() => null);
      const img = await shot(j.page, "no-script");
      await j.ctx.close();
      if (st) {
        const has = st.chars >= Math.min(200, normal.chars * 0.3);
        if (publicPage) add("no_script_content", "should", has, has ? `${st.chars} characters readable without scripts` : `almost nothing without scripts (${st.chars} characters)`,
          "a public page delivers its content in the HTML: readable before scripts run, by search engines and on a bad connection", { screenshot: img });
        else passes.no_script_content = { level: "info", ok: true, value: has ? "content readable without scripts" : "the screen needs scripts (expected for an application screen)", screenshot: img };
      }
    }
    const must = Object.entries(passes).filter(([, c]) => c.level === "must" && !c.ok).map(([k]) => k);
    const should = Object.entries(passes).filter(([, c]) => c.level === "should" && !c.ok).map(([k]) => k);
    const skipped = [];
    if (!dataRequests) skipped.push("slow and failing: the page made no data request while loading (static page, or data rendered on the server)");
    return { available: true, url, baseline, summary: { checks: Object.values(passes).filter((c) => c.level !== "info").length, must_failed: must, should_failed: should }, passes, skipped,
      by_eye: ["empty state: a fresh account or an empty list shows one clear action", "the error message says what happened in the user's words", "the skeleton matches the real layout", "dark theme: no black shadow on black, hairlines visible",
        "very long real data: 500 rows, a 3-line title, a name with no space"],
      note: "One screen in the state it loads in. Run it on each key screen, and after the steps that fill it when the screen starts empty." };
  } finally { await browser.close(); }
}
