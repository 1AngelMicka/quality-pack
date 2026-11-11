// Key tasks ("flows") declared in .quality/project.json, played step by step with Playwright on a phone
// and on a desktop. After every step: a screenshot, axe-core, and measures of the effort the task asks
// (pages to scroll, controls on screen, where the main action and the result are). The audit judges the
// interface on these states, not on the empty screen a page shows when it first loads.
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname, basename, isAbsolute, resolve, relative } from "node:path";

const rel = (root, p) => relative(root, p).split("\\").join("/");
import { loadBrowserTools, launch } from "./browser.mjs";

export const DEVICES = {
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
};

// Used when the referential gives none (older referential.json).
export const DEFAULT_BUDGETS = { page_screens: { mobile: 3, desktop: 2 }, controls_rendered: { mobile: 30, desktop: 40 },
  scroll_screens: { mobile: 4, desktop: 2 }, actions: { mobile: 15, desktop: 15 } };

const ACTIONS = ["goto", "click", "fill", "select", "check", "upload", "press", "hover", "wait_for", "wait", "expect", "scroll"];
const COUNTED = new Set(["click", "fill", "select", "check", "upload", "press"]); // what the user does by hand

// Keystroke-level model (Card, Moran and Newell): P point 1.1 s, B click 0.1 s, K key 0.28 s (average typist),
// H hand to keyboard 0.4 s, M mental preparation 1.35 s before each decision. Scrolling is counted as one
// pointing move per screen. KLM is about 21 % off on average: compare designs with it, never promise a time.
export function klmSeconds(steps) {
  const P = 1.1, B = 0.1, K = 0.28, H = 0.4, M = 1.35;
  let t = 0;
  for (const s of steps) {
    if (s.decision) t += M;
    t += (s.scrolled_screens || 0) * P;
    switch (s.action) {
      case "click": case "check": t += P + B; break;
      case "select": t += 2 * (P + B); break;
      case "upload": t += 2 * (P + B) + M; break;
      case "fill": t += P + B + H + (s.chars || 0) * K + H; break;
      case "press": t += K; break;
      default: break;
    }
  }
  return Math.round(t * 10) / 10;
}
const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "step";

// Check the flows of a project file. Returns normalised flows and readable errors; never throws.
export function validateFlows(project) {
  const errors = [];
  const raw = project?.flows;
  if (raw == null) return { flows: [], errors };
  if (!Array.isArray(raw)) return { flows: [], errors: ["flows must be a list"] };
  const ids = new Set();
  const flows = [];
  raw.forEach((f, i) => {
    const where = `flows[${i}]${f?.id ? ` (${f.id})` : ""}`;
    if (!f || typeof f !== "object") { errors.push(`${where}: must be an object`); return; }
    if (!f.id || !/^[a-z0-9][a-z0-9-]*$/.test(f.id)) errors.push(`${where}: id must be lower-case letters, digits and dashes`);
    if (ids.has(f.id)) errors.push(`${where}: duplicate id`);
    ids.add(f.id);
    if (!f.name) errors.push(`${where}: name is required (the task in the user's words)`);
    const devices = f.devices || ["mobile", "desktop"];
    for (const d of devices) if (!DEVICES[d]) errors.push(`${where}: unknown device "${d}" (mobile, desktop)`);
    if (!Array.isArray(f.steps) || !f.steps.length) { errors.push(`${where}: steps must be a non-empty list`); return; }
    f.steps.forEach((s, j) => {
      const keys = Object.keys(s || {}).filter((k) => ACTIONS.includes(k));
      if (keys.length !== 1) errors.push(`${where}.steps[${j}]: exactly one action among ${ACTIONS.join(", ")}`);
      const v = s?.[keys[0]];
      if (["fill", "select"].includes(keys[0]) && (!v?.selector || v.value == null)) errors.push(`${where}.steps[${j}]: ${keys[0]} needs selector and value`);
      if (keys[0] === "upload" && (!v?.selector || !Array.isArray(v.files) || !v.files.length)) errors.push(`${where}.steps[${j}]: upload needs selector and files`);
    });
    flows.push({ ...f, devices });
  });
  return { flows, errors };
}

// "photos/*.jpg" → matching files; plain paths are returned as they are. Paths are relative to the project root.
export function expandFiles(root, patterns) {
  const out = [];
  for (const p of patterns) {
    const abs = isAbsolute(p) ? p : resolve(root, p);
    const name = basename(abs);
    if (!name.includes("*")) { out.push(abs); continue; }
    const re = new RegExp(`^${name.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`, "i");
    const dir = dirname(abs);
    if (existsSync(dir)) out.push(...readdirSync(dir).filter((f) => re.test(f)).sort().map((f) => join(dir, f)));
  }
  return out;
}

const env = (v) => typeof v !== "string" ? v : v.replace(/\$\{env:([A-Z0-9_]+)\}/g, (_, n) => {
  if (process.env[n] == null) throw new Error(`environment variable ${n} is not set`);
  return process.env[n];
});

// Measures taken in the page after each step. Kept as one function so it runs in a single evaluate call.
function measure() {
  const vh = window.innerHeight, vw = window.innerWidth;
  const shown = (e) => {
    if (e.closest("[hidden], [inert], [aria-hidden='true']")) return false;
    const s = getComputedStyle(e);
    if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false;
    const r = e.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const inView = (r) => Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) * Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
  const CONTROL = "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=slider], [role=switch], [role=checkbox], [role=radio], [role=option], [role=menuitem], [role=menuitemradio], [role=combobox], [role=spinbutton], [contenteditable=true], [tabindex]:not([tabindex='-1'])";
  const controls = [...document.querySelectorAll(CONTROL)].filter(shown);
  const inViewport = controls.filter((e) => inView(e.getBoundingClientRect()) > 0);
  // The tallest scrolling area: the page itself, or a panel that scrolls inside it.
  let scroller = { height: document.documentElement.scrollHeight, client: vh, what: "page" };
  for (const e of document.querySelectorAll("body *")) {
    if (e.clientHeight < 80) continue;
    const s = getComputedStyle(e);
    if (!/(auto|scroll)/.test(s.overflowY) || e.scrollHeight <= e.clientHeight + 2) continue;
    if (e.scrollHeight / e.clientHeight > scroller.height / scroller.client) scroller = { height: e.scrollHeight, client: e.clientHeight, what: e.tagName.toLowerCase() + (e.id ? `#${e.id}` : "") };
  }
  const el = document.documentElement;
  return {
    viewport: { width: vw, height: vh },
    page_screens: Math.round((scroller.height / scroller.client) * 10) / 10, scroller: scroller.what,
    controls_rendered: controls.length, controls_in_viewport: inViewport.length,
    disclosure: { tabs: document.querySelectorAll("[role=tab]").length, tablists: document.querySelectorAll("[role=tablist]").length,
      collapsibles: document.querySelectorAll("details, [aria-expanded]").length, dialogs_open: [...document.querySelectorAll("dialog[open], [role=dialog], [role=alertdialog]")].filter(shown).length },
    horizontal_overflow: el.scrollWidth > el.clientWidth + 1,
  };
}

// Where an element declared by the flow (preview, primary action) sits in the viewport. Same selector syntax as the steps.
async function locate(page, sel, { width, height }) {
  if (!sel) return null;
  const loc = page.locator(sel).first();
  if (!(await loc.isVisible().catch(() => false))) return { found: false };
  const r = await loc.boundingBox().catch(() => null);
  if (!r || r.width * r.height === 0) return { found: false };
  const seen = Math.max(0, Math.min(r.y + r.height, height) - Math.max(r.y, 0)) * Math.max(0, Math.min(r.x + r.width, width) - Math.max(r.x, 0));
  return { found: true, visible_ratio: Math.round((seen / (r.width * r.height)) * 100) / 100, top: Math.round(r.y), bottom: Math.round(r.y + r.height),
    center_y_ratio: Math.round(((r.y + r.height / 2) / height) * 100) / 100 };
}

// Scroll positions of the page and of every scrolling panel, to know how far the user had to scroll.
function scrollPositions() {
  const out = { page: window.scrollY };
  let i = 0;
  for (const e of document.querySelectorAll("body *")) {
    if (e.scrollHeight <= e.clientHeight + 2 || !/(auto|scroll)/.test(getComputedStyle(e).overflowY)) continue;
    if (!e.dataset.qpScroll) e.dataset.qpScroll = String(++i) + "-" + Math.random().toString(36).slice(2, 6);
    out[e.dataset.qpScroll] = e.scrollTop;
  }
  return out;
}

async function act(page, step, root) {
  const [action] = Object.keys(step).filter((k) => ACTIONS.includes(k));
  const v = step[action];
  const timeout = step.timeout || 10000;
  switch (action) {
    case "goto": return page.goto(v, { waitUntil: "networkidle", timeout: 30000 }).catch(async (e) => { if (!/networkidle|Timeout/i.test(e.message)) throw e; });
    case "click": return page.locator(v).first().click({ timeout });
    case "hover": return page.locator(v).first().hover({ timeout });
    case "check": return page.locator(v).first().check({ timeout });
    case "fill": return page.locator(v.selector).first().fill(String(env(v.value)), { timeout });
    case "select": return page.locator(v.selector).first().selectOption(String(env(v.value)), { timeout });
    case "upload": {
      const files = expandFiles(root, v.files);
      const missing = files.filter((f) => !existsSync(f));
      if (!files.length || missing.length) throw new Error(`test files not found: ${(missing.length ? missing : v.files).join(", ")}`);
      return page.locator(v.selector).first().setInputFiles(files, { timeout });
    }
    case "press": return typeof v === "string" ? page.keyboard.press(v) : page.locator(v.selector).first().press(v.key, { timeout });
    case "wait_for": return page.locator(v).first().waitFor({ state: "visible", timeout });
    case "wait": return page.waitForTimeout(Number(v) || 500);
    case "expect": {
      const sel = typeof v === "string" ? v : v.selector;
      const loc = page.locator(sel).first();
      await loc.waitFor({ state: "visible", timeout });
      if (v?.text && !(await loc.innerText()).includes(v.text)) throw new Error(`"${sel}" does not contain "${v.text}"`);
      return;
    }
    case "scroll": return page.locator(v).first().scrollIntoViewIfNeeded({ timeout });
  }
}

async function runAxe(page, axePath) {
  if (!axePath) return null;
  try {
    // evaluate() is not subject to the page's Content-Security-Policy, unlike addScriptTag (an inline <script>):
    // a site with a strict CSP must still be measured, and keep its own CSP errors visible
    if (!(await page.evaluate(() => !!window.axe))) await page.evaluate(readFileSync(axePath, "utf8"));
    const v = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations
      .map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, targets: x.nodes.slice(0, 3).map((n) => n.target.join(" ")) })));
    return { violations: v, critical: v.filter((x) => x.impact === "critical").length, serious: v.filter((x) => x.impact === "serious").length };
  } catch (e) { return { error: String(e.message).slice(0, 200) }; }
}

export function summarizeRun(run, budgets) {
  const done = run.steps.filter((s) => s.ok && s.metrics);
  const max = (k) => done.reduce((m, s) => Math.max(m, s.metrics[k] ?? 0), 0);
  const withPreview = done.filter((s) => s.metrics.preview?.found);
  const adjusting = withPreview.filter((s) => COUNTED.has(s.action));
  // The main action is judged where the user needs it: in the state just before they click it
  // (after the click, the browser has scrolled to it, so it is always visible). Not clicked: the last state.
  const clickAt = run.steps.findIndex((x) => x.action === "click" && run.primary && x.target === run.primary);
  const before = clickAt > 0 ? run.steps.slice(0, clickAt) : run.steps;
  const lastPrimary = before.filter((x) => x.ok && x.metrics?.primary?.found).at(-1)?.metrics.primary;
  const b = (k) => run.budget?.[k] ?? budgets[k]?.[run.device];
  const s = {
    actions: run.steps.filter((x) => COUNTED.has(x.action)).length,
    decisions: run.steps.filter((x) => x.decision).length,
    scroll_screens: Math.round(run.steps.reduce((t, x) => t + (x.scrolled_screens || 0), 0) * 10) / 10,
    klm_seconds: klmSeconds(run.steps),
    max_page_screens: max("page_screens"),
    max_controls_rendered: max("controls_rendered"),
    max_controls_in_viewport: max("controls_in_viewport"),
    uses_disclosure: done.some((x) => x.metrics.disclosure.tablists > 0 || x.metrics.disclosure.collapsibles > 0),
    preview_visible_while_adjusting: adjusting.length ? Math.round((adjusting.filter((x) => x.metrics.preview.visible_ratio >= 0.5).length / adjusting.length) * 100) / 100 : null,
    primary_visible: lastPrimary ? lastPrimary.visible_ratio >= 0.9 : null,
    primary_in_thumb_zone: lastPrimary && run.device === "mobile" ? lastPrimary.center_y_ratio >= 0.5 && lastPrimary.center_y_ratio <= 1 : null,
    axe_states_with_serious: run.steps.filter((x) => x.axe?.critical || x.axe?.serious).length,
    horizontal_overflow_steps: done.filter((x) => x.metrics.horizontal_overflow).map((x) => x.index),
    console_errors: run.console.length,
  };
  const over = [];
  if (s.max_page_screens > b("page_screens")) over.push(`longest page is ${s.max_page_screens} screens (budget ${b("page_screens")})`);
  if (s.max_controls_rendered > b("controls_rendered")) over.push(`${s.max_controls_rendered} controls on one screen (budget ${b("controls_rendered")})`);
  if (s.scroll_screens > b("scroll_screens")) over.push(`${s.scroll_screens} screens scrolled during the task (budget ${b("scroll_screens")})`);
  if (s.actions > b("actions")) over.push(`${s.actions} actions (budget ${b("actions")})`);
  return { summary: s, over_budget: over };
}

export async function playFlows(project, { root, outDir, base, only = [], budgets = DEFAULT_BUDGETS }) {
  const { flows, errors } = validateFlows(project);
  if (errors.length) return { available: true, errors };
  const selected = only.length ? flows.filter((f) => only.includes(f.id)) : flows;
  if (!selected.length) return { available: true, errors: [flows.length ? `no flow named ${only.join(", ")}` : "no flows in .quality/project.json: declare 2 to 5 key tasks (see /qp:kickoff)"] };
  const tools = await loadBrowserTools(root);
  if (!tools) return { available: false, hint: "Playwright is not available. Run `node <qp.mjs> browser-setup` once (ask the user first: it installs into the pack's cache, not the project)." };
  const baseUrl = base || project.urls?.local || project.urls?.staging || project.urls?.production;
  if (!baseUrl) return { available: true, errors: ["no URL: pass --base <url> or set urls.local in .quality/project.json"] };
  const schemes = project.flags?.includes("dark_mode") ? ["light", "dark"] : ["light"];
  const shots = outDir ? join(outDir, "flows") : null;
  if (shots) mkdirSync(shots, { recursive: true });
  const browser = await launch(tools.chromium);
  const results = [];
  try {
    for (const flow of selected) {
      const entry = { id: flow.id, name: flow.name, runs: [] };
      for (const device of flow.devices) for (const scheme of schemes) {
        const ctx = await browser.newContext({ ...DEVICES[device], colorScheme: scheme, reducedMotion: "reduce", acceptDownloads: true, baseURL: baseUrl });
        const page = await ctx.newPage();
        const run = { device, scheme, budget: flow.budget, primary: flow.primary, completed: false, steps: [], console: [], dialogs: [] };
        page.on("console", (m) => { if (m.type() === "error" && run.console.length < 30) run.console.push(m.text().slice(0, 200)); });
        page.on("pageerror", (e) => { if (run.console.length < 30) run.console.push(`page error: ${String(e.message).slice(0, 200)}`); });
        page.on("dialog", (d) => { run.dialogs.push(`${d.type()}: ${d.message().slice(0, 120)}`); d.accept().catch(() => {}); });
        const steps = Object.keys(flow.steps[0]).includes("goto") ? flow.steps : [{ name: "Open", goto: flow.start || "/" }, ...flow.steps];
        for (const [i, step] of steps.entries()) {
          const action = Object.keys(step).find((k) => ACTIONS.includes(k));
          const target = typeof step[action] === "string" ? step[action] : step[action]?.selector || "";
          const rec = { index: i + 1, name: step.name || `${action} ${target}`.trim(), action, target, decision: !!step.decision };
          if (action === "fill") rec.chars = String(step.fill.value ?? "").length;
          const before = action === "goto" ? null : await page.evaluate(scrollPositions).catch(() => null);
          try {
            await act(page, step, root);
            await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(300);
            rec.ok = true;
          } catch (e) { rec.ok = false; rec.error = String(e.message).split("\n")[0].slice(0, 240); }
          if (before) {
            const after = await page.evaluate(scrollPositions).catch(() => ({}));
            const px = Object.entries(before).reduce((t, [k, y]) => t + Math.abs((after[k] ?? y) - y), 0);
            rec.scrolled_screens = Math.round((px / DEVICES[device].viewport.height) * 10) / 10;
          }
          rec.metrics = await page.evaluate(measure).catch(() => null);
          if (rec.metrics) {
            rec.metrics.preview = await locate(page, flow.preview, DEVICES[device].viewport);
            rec.metrics.primary = await locate(page, flow.primary, DEVICES[device].viewport);
          } else delete rec.metrics;
          if (step.snapshot !== false || !rec.ok) {
            rec.axe = await runAxe(page, tools.axePath);
            if (shots) {
              const name = `${flow.id}-${device}${scheme === "dark" ? "-dark" : ""}-${String(i + 1).padStart(2, "0")}-${slug(rec.name)}`;
              // Paths are stored relative to the project root, so reports and agents work on any machine.
              const shot = join(shots, `${name}.png`);
              if (await page.screenshot({ path: shot }).then(() => true, () => false)) rec.screenshot = rel(root, shot);
              if ((rec.metrics?.page_screens || 0) > 1.2 && rec.metrics?.scroller === "page") {
                const full = join(shots, `${name}-full.png`);
                if (await page.screenshot({ path: full, fullPage: true }).then(() => true, () => false)) rec.screenshot_full = rel(root, full);
              }
            }
          }
          run.steps.push(rec);
          if (!rec.ok) { run.failed_step = rec.index; break; }
        }
        run.completed = run.steps.every((s) => s.ok);
        Object.assign(run, summarizeRun(run, budgets));
        entry.runs.push(run);
        await ctx.close();
      }
      results.push(entry);
    }
  } finally {
    await browser.close();
  }
  const runs = results.flatMap((f) => f.runs);
  return { available: true, playwright: tools.playwright, from: tools.source, base: baseUrl, schemes, budgets, flows: results,
    summary: { flows: results.length, runs: runs.length, completed: runs.filter((r) => r.completed).length,
      failed: runs.filter((r) => !r.completed).map((r) => `${results.find((f) => f.runs.includes(r)).id} ${r.device}${r.scheme === "dark" ? " dark" : ""}: step ${r.failed_step}`),
      states: runs.reduce((t, r) => t + r.steps.length, 0), axe_states_with_serious: runs.reduce((t, r) => t + r.summary.axe_states_with_serious, 0),
      over_budget: runs.flatMap((r) => r.over_budget.map((o) => `${results.find((f) => f.runs.includes(r)).id} ${r.device}: ${o}`)) } };
}

// What the CLI prints: one line per run, no step details (they are in flows.json).
export function compactFlows(result) {
  if (!result.flows) return result;
  return { summary: result.summary, full_report: "flows.json", screenshots: "flows/",
    runs: result.flows.flatMap((f) => f.runs.map((r) => ({ flow: f.id, device: r.device, scheme: r.scheme, completed: r.completed,
      failed_step: r.failed_step ? `${r.failed_step}: ${r.steps.at(-1)?.error}` : undefined, ...r.summary, over_budget: r.over_budget }))) };
}

export const FLOW_ACTIONS = ACTIONS;
