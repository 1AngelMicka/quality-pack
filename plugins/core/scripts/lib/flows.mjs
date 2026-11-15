// Key tasks ("flows") declared in .quality/project.json, played step by step with Playwright on a phone
// and on a desktop. After every step: a screenshot, axe-core, and measures of the effort the task asks
// (pages to scroll, controls on screen, where the main action and the result are). The audit judges the
// interface on these states, not on the empty screen a page shows when it first loads.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, dirname, basename, isAbsolute, resolve, relative } from "node:path";
import { spawnSync } from "node:child_process";

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
// Actions that act on the first element their selector matches (Playwright's .first()).
const ON_SELECTOR = new Set(["click", "hover", "check", "fill", "select", "upload", "press", "wait_for", "expect", "scroll"]);
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

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

// Cheap checks of a Playwright selector, without a browser: what is surely broken is an error, what looks like a
// typo (a backslash lost in JSON: /F-d+/ for /F-\d+/) is a warning. A selector that parses can still match nothing:
// the run then says how many elements it found.
export function selectorProblems(sel) {
  const errors = [], warnings = [];
  if (typeof sel !== "string" || !sel.trim()) return { errors: ["selector is empty"], warnings };
  let depth = { "[": 0, "(": 0 }, quote = null;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === "\\") { i++; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === "\"") { quote = c; continue; }
    if (c === "[" || c === "(") depth[c]++;
    if (c === "]" && --depth["["] < 0) break;
    if (c === ")" && --depth["("] < 0) break;
  }
  if (quote) errors.push(`unclosed " in ${sel}`);
  else if (depth["["] !== 0) errors.push(`unbalanced [ ] in ${sel}`);
  else if (depth["("] !== 0) errors.push(`unbalanced ( ) in ${sel}`);
  const parts = sel.split(">>").map((p) => p.trim());
  if (parts.some((p) => !p)) errors.push(`empty part around >> in ${sel}`);
  for (const p of parts) {
    const nth = /^nth=(.*)$/.exec(p);
    if (nth && !/^-?\d+$/.test(nth[1].trim())) errors.push(`nth= needs a whole number in ${sel}`);
    if (/^role=/.test(p) && !/^role=[a-z]+(\[|$)/.test(p)) errors.push(`role= needs an ARIA role name (button, link, textbox…) in ${sel}`);
    for (const m of p.matchAll(/=\s*\/((?:\\.|[^/\\])+)\/([a-z]*)/g)) {
      try { new RegExp(m[1], m[2].replace(/[^dgimsuvy]/g, "")); } catch (e) { errors.push(`invalid regular expression /${m[1]}/ in ${sel}`); continue; }
      if (/(^|[^\\a-zA-Z])[dwsb][+*?{]/.test(m[1])) warnings.push(`/${m[1]}/ in ${sel}: a backslash looks lost (\\d, \\w, \\s): in JSON write "\\\\d"`);
    }
  }
  return { errors, warnings };
}

// Check the flows of a project file. Returns normalised flows, readable errors and warnings; never throws.
// A flow with "status": "planned" is declared but not built yet: it is not played unless named, and it is
// reported as not built.
export function validateFlows(project) {
  const errors = [], warnings = [];
  const raw = project?.flows;
  const setup = project?.flows_setup;
  if (setup != null && !(typeof setup === "string" && setup.trim()) && !(Array.isArray(setup) && setup.every((c) => typeof c === "string" && c.trim())))
    errors.push("flows_setup must be a command or a list of commands");
  if (raw == null) return { flows: [], errors, warnings, planned: [] };
  if (!Array.isArray(raw)) return { flows: [], errors: [...errors, "flows must be a list"], warnings, planned: [] };
  const ids = new Set();
  const flows = [];
  const sel = (where, s) => { if (s == null) return; const p = selectorProblems(s); errors.push(...p.errors.map((e) => `${where}: ${e}`)); warnings.push(...p.warnings.map((w) => `${where}: ${w}`)); };
  raw.forEach((f, i) => {
    const where = `flows[${i}]${f?.id ? ` (${f.id})` : ""}`;
    if (!f || typeof f !== "object") { errors.push(`${where}: must be an object`); return; }
    if (!f.id || !ID_RE.test(f.id)) errors.push(`${where}: id must be lower-case letters, digits and dashes`);
    if (ids.has(f.id)) errors.push(`${where}: duplicate id`);
    ids.add(f.id);
    if (!f.name) errors.push(`${where}: name is required (the task in the user's words)`);
    if (f.status != null && !["planned", "built"].includes(f.status)) errors.push(`${where}: status is "planned" (not built yet) or "built"`);
    const planned = f.status === "planned";
    const devices = f.devices || ["mobile", "desktop"];
    for (const d of devices) if (!DEVICES[d]) errors.push(`${where}: unknown device "${d}" (mobile, desktop)`);
    if (f.setup != null && !(typeof f.setup === "string" && f.setup.trim())) errors.push(`${where}: setup must be a command`);
    const isStorage = (o) => o && typeof o === "object" && !Array.isArray(o);
    if (f.storage != null && !isStorage(f.storage)) errors.push(`${where}: storage must be an object { "key": "value" }`);
    if (f.variants != null) {
      if (!Array.isArray(f.variants) || !f.variants.length) errors.push(`${where}: variants must be a non-empty list`);
      else {
        const vids = new Set();
        f.variants.forEach((v, k) => {
          if (!v || !ID_RE.test(v.id || "")) errors.push(`${where}.variants[${k}]: id must be lower-case letters, digits and dashes`);
          else if (vids.has(v.id)) errors.push(`${where}.variants[${k}]: duplicate id`);
          vids.add(v?.id);
          if (v && v.storage != null && !isStorage(v.storage)) errors.push(`${where}.variants[${k}]: storage must be an object { "key": "value" }`);
        });
      }
    }
    sel(`${where}.preview`, f.preview);
    sel(`${where}.primary`, f.primary);
    if (planned && (!Array.isArray(f.steps) || !f.steps.length)) { flows.push({ ...f, devices, steps: [] }); return; }
    if (!Array.isArray(f.steps) || !f.steps.length) { errors.push(`${where}: steps must be a non-empty list`); return; }
    f.steps.forEach((s, j) => {
      const keys = Object.keys(s || {}).filter((k) => ACTIONS.includes(k));
      if (keys.length !== 1) errors.push(`${where}.steps[${j}]: exactly one action among ${ACTIONS.join(", ")}`);
      const v = s?.[keys[0]];
      if (["fill", "select"].includes(keys[0]) && (!v?.selector || v.value == null)) errors.push(`${where}.steps[${j}]: ${keys[0]} needs selector and value`);
      if (keys[0] === "upload" && (!v?.selector || !Array.isArray(v.files) || !v.files.length)) errors.push(`${where}.steps[${j}]: upload needs selector and files`);
      if (keys.length === 1 && ON_SELECTOR.has(keys[0]) && !(keys[0] === "press" && typeof v === "string")) {
        const target = typeof v === "string" ? v : v?.selector;
        if (target != null) sel(`${where}.steps[${j}]`, target);
      }
    });
    if (f.steps.some((s) => s?.login) && f.steps.findLastIndex((s) => s?.login) === f.steps.length - 1)
      warnings.push(`${where}: the last step is a login step: nothing of the task is left to play in the next colour scheme`);
    flows.push({ ...f, devices });
  });
  return { flows, errors, warnings, planned: flows.filter((f) => f.status === "planned").map((f) => f.id) };
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

// A value that differs at every run of a task (each device, variant and colour scheme): lower-case letters and
// digits, so it fits in an e-mail address or a name ("test+${unique}@example.com").
export const uniqueValue = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ${env:NAME} comes from the environment, ${unique} from the run (the same value for every step of one run).
export const expandValue = (v, vars = {}) => typeof v !== "string" ? v : v.replace(/\$\{env:([A-Z0-9_]+)\}/g, (_, n) => {
  if (process.env[n] == null) throw new Error(`environment variable ${n} is not set`);
  return process.env[n];
}).replace(/\$\{unique\}/g, () => (vars.unique ??= uniqueValue()));

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

// Every action on a selector takes the first element it matches.
export async function act(page, step, root, vars = {}) {
  const [action] = Object.keys(step).filter((k) => ACTIONS.includes(k));
  const v = step[action];
  const timeout = step.timeout || 10000;
  switch (action) {
    case "goto": return page.goto(expandValue(v, vars), { waitUntil: "networkidle", timeout: 30000 }).catch(async (e) => { if (!/networkidle|Timeout/i.test(e.message)) throw e; });
    case "click": return page.locator(v).first().click({ timeout });
    case "hover": return page.locator(v).first().hover({ timeout });
    case "check": return page.locator(v).first().check({ timeout });
    case "fill": return page.locator(v.selector).first().fill(String(expandValue(v.value, vars)), { timeout });
    case "select": return page.locator(v.selector).first().selectOption(String(expandValue(v.value, vars)), { timeout });
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
      const text = v?.text != null ? String(expandValue(v.text, vars)) : null;
      if (text && !(await loc.innerText()).includes(text)) throw new Error(`"${sel}" does not contain "${text}"`);
      return;
    }
    case "scroll": return page.locator(v).first().scrollIntoViewIfNeeded({ timeout });
  }
}

// Visible texts that show a programming value instead of data: "undefined F-0004", "NaN €", "[object Object]".
// All measures can be green while a title says "undefined"; only the screen shows it.
function suspectTexts() {
  const RE = /(^|[^\w$.])(undefined|null|NaN|\[object Object\])(?![\w])/;
  const SKIP = "script, style, noscript, code, pre, kbd, samp, var, textarea, [hidden], [aria-hidden='true'], [contenteditable=true]";
  const visible = (e) => {
    const s = getComputedStyle(e);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = e.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode() && out.length < 5) {
    const t = w.currentNode.nodeValue;
    if (!t || !RE.test(t)) continue;
    const e = w.currentNode.parentElement;
    if (!e || e.closest(SKIP) || !visible(e)) continue;
    out.push({ text: t.trim().replace(/\s+/g, " ").slice(0, 80), in: e.tagName.toLowerCase() });
  }
  for (const i of document.querySelectorAll("input:not([type=hidden]):not([type=password]), select")) {
    if (out.length >= 5) break;
    const v = String(i.value ?? "").trim();
    if (/^(undefined|null|NaN|\[object Object\])$/.test(v) && visible(i)) out.push({ text: v, in: `${i.tagName.toLowerCase()} value` });
  }
  return out;
}

// What an empty screen looks like when a step cannot find its element: lists or tables with no item, and
// short texts such as "No results" or "Rien dans cette catégorie".
function emptyScreen() {
  const EMPTY = /^(no |nothing|empty|aucun|aucune|rien|vide|pas de |pas d'|keine |nada|ningún|ninguna|nessun)/i;
  const shown = (e) => { const s = getComputedStyle(e); return s.display !== "none" && s.visibility !== "hidden" && !e.closest("[hidden]"); };
  const lists = [...document.querySelectorAll("ul, ol, [role=list], [role=listbox], [role=grid], [role=table], tbody")].filter(shown)
    .filter((e) => !e.querySelector("li, [role=listitem], [role=option], [role=row], [role=gridcell], tr")).length;
  const texts = [];
  for (const e of document.querySelectorAll("body *")) {
    if (texts.length >= 2 || e.children.length || !shown(e)) continue;
    const t = (e.textContent || "").trim();
    if (t.length > 2 && t.length < 80 && EMPTY.test(t) && e.getBoundingClientRect().height > 1) texts.push(t);
  }
  return { lists, texts };
}

// A fingerprint of the colours on screen, to tell whether the page changes in prefers-color-scheme: dark.
function colourPrint() {
  const els = [document.documentElement, document.body, ...[...document.querySelectorAll("body *")].slice(0, 300)];
  return els.map((e) => { const s = getComputedStyle(e); return `${s.backgroundColor}|${s.color}|${s.borderTopColor}`; }).join(";");
}

// Why a step on a selector failed, in words: how many elements matched (0 or n, the first is taken), whether the
// first one is hidden or disabled, and whether the screen looks empty (test data used up by an earlier run).
async function explainFailure(page, action, target, message) {
  const short = String(message).split("\n")[0].replace(/^[a-zA-Z.]+: /, "").slice(0, 160);
  if (!target || !ON_SELECTOR.has(action)) return { error: short };
  const n = await page.locator(target).count().catch(() => null);
  if (n == null) return { error: `selector ${target} cannot be read: ${short}` };
  if (n === 0) {
    const empty = await page.evaluate(emptyScreen).catch(() => ({ lists: 0, texts: [] }));
    const looksEmpty = empty.texts.length || empty.lists;
    return { error: `no element matches ${target} on this screen (0 found)${looksEmpty ? `; the screen looks empty${empty.texts.length ? ` ("${empty.texts[0]}")` : ` (${empty.lists} list without items)`}: test data used up by an earlier run? Reset it with flows_setup or the task's setup` : ""}. ${short}`,
      matched: 0, ...(looksEmpty ? { empty_screen: empty } : {}) };
  }
  const first = page.locator(target).first();
  const visible = await first.isVisible().catch(() => false);
  const enabled = visible ? await first.isEnabled().catch(() => true) : true;
  return { error: `${n} element${n > 1 ? "s" : ""} match ${target}; the first is taken and it is ${!visible ? "hidden" : !enabled ? "disabled" : "visible"}. ${short}`, matched: n };
}

// A shell command from project.json (seeding the test data), run from the project root.
export function runCommand(command, root) {
  const t = Date.now();
  const r = spawnSync(command, { cwd: root, shell: true, encoding: "utf8", timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
  const output = `${r.stdout || ""}${r.stderr || ""}`.trim();
  return { command, ok: r.status === 0 && !r.error, exit: r.status, seconds: Math.round((Date.now() - t) / 100) / 10,
    ...(r.status === 0 ? {} : { output: (r.error ? String(r.error.message) : output).slice(-400) }) };
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
  const b = (k) => run.budget?.[k] ?? budgets[k]?.[run.device] ?? budgets[k]?.desktop;
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
    suspect_text_steps: run.steps.filter((x) => x.suspect_texts?.length).map((x) => x.index),
    console_errors: run.console.length,
  };
  const over = [];
  if (s.max_page_screens > b("page_screens")) over.push(`longest page is ${s.max_page_screens} screens (budget ${b("page_screens")})`);
  if (s.max_controls_rendered > b("controls_rendered")) over.push(`${s.max_controls_rendered} controls on one screen (budget ${b("controls_rendered")})`);
  if (s.scroll_screens > b("scroll_screens")) over.push(`${s.scroll_screens} screens scrolled during the task (budget ${b("scroll_screens")})`);
  if (s.actions > b("actions")) over.push(`${s.actions} actions (budget ${b("actions")})`);
  return { summary: s, over_budget: over };
}

// The label of one run in summaries: "<task> <device>[ <variant>][ dark]".
const runLabel = (id, r) => `${id} ${r.device}${r.variant ? ` ${r.variant}` : ""}${r.scheme === "dark" ? " dark" : ""}`;

// Totals over the played tasks; tasks marked "planned" are counted as not built, never as failed.
export function summarizeFlows(flows, notBuilt = []) {
  const runs = flows.flatMap((f) => f.runs.map((r) => ({ id: f.id, r })));
  return { flows: flows.length, runs: runs.length, completed: runs.filter(({ r }) => r.completed).length,
    failed: runs.filter(({ r }) => !r.completed).map(({ id, r }) => `${runLabel(id, r)}: step ${r.failed_step}`),
    not_built: notBuilt,
    states: runs.reduce((t, { r }) => t + r.steps.length, 0), axe_states_with_serious: runs.reduce((t, { r }) => t + r.summary.axe_states_with_serious, 0),
    suspect_texts: runs.flatMap(({ id, r }) => r.steps.filter((s) => s.suspect_texts?.length).map((s) => `${runLabel(id, r)} step ${s.index}: "${s.suspect_texts[0].text}"`)),
    over_budget: runs.flatMap(({ id, r }) => r.over_budget.map((o) => `${runLabel(id, r)}: ${o}`)) };
}

// attach: a port where an app already running exposes the Chrome DevTools Protocol (a Tauri app started with
// WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222, an Electron app started with
// --remote-debugging-port=9222). The flows are then played in the app's own window, once, as it is.
// pause: seconds to wait between two tasks, for an app that limits sign-ins per minute.
export async function playFlows(project, { root, outDir, base, only = [], budgets = DEFAULT_BUDGETS, attach = null, pause = 0, log = () => {} }) {
  const { flows, errors, warnings } = validateFlows(project);
  if (errors.length) return { available: true, errors };
  const unknown = only.filter((id) => !flows.some((f) => f.id === id));
  if (unknown.length) return { available: true, errors: [`no flow named ${unknown.join(", ")}`] };
  // A planned task is played only when it is named: the author is building it.
  const selected = only.length ? flows.filter((f) => only.includes(f.id)) : flows.filter((f) => f.status !== "planned");
  const notBuilt = flows.filter((f) => f.status === "planned" && !selected.includes(f)).map((f) => f.id);
  if (!selected.length) return { available: true, errors: [flows.length
    ? `every key task is planned (status "planned"): ${notBuilt.join(", ")}. Build one and remove its status, or name it: sw flows <id>`
    : "no flows in .quality/project.json: declare 2 to 5 key tasks (see /sw:kickoff)"] };
  const emptyPlanned = selected.filter((f) => !f.steps.length).map((f) => f.id);
  if (emptyPlanned.length) return { available: true, errors: [`${emptyPlanned.join(", ")}: planned with no steps yet, nothing to play`] };
  const tools = await loadBrowserTools(root);
  if (!tools) return { available: false, hint: "Playwright is not available. Run `node <sw.mjs> browser-setup` once (ask the user first: it installs into the pack's cache, not the project)." };
  const baseUrl = base || project.urls?.local || project.urls?.staging || project.urls?.production || (attach ? "app://window" : null);
  if (!baseUrl) return { available: true, errors: ["no URL: pass --base <url> or set urls.local in .quality/project.json"] };
  // flows_setup: commands run once before the tasks (seeding the test data), so a replayed audit starts from the same data.
  const setup = [];
  for (const command of [project.flows_setup ?? []].flat()) {
    log(`setup: ${command}`);
    const r = runCommand(command, root);
    setup.push(r);
    if (!r.ok) return { available: true, errors: [`flows_setup failed (exit ${r.exit}): ${command}${r.output ? `: ${r.output.slice(-200)}` : ""}`], setup };
  }
  const darkFlag = Array.isArray(project.flags) && project.flags.includes("dark_mode");
  const schemes = darkFlag ? ["light", "dark"] : ["light"];
  // Without the dark_mode flag, the first screen is looked at once in dark: if its colours change, dark is played too.
  let darkProbe = attach || darkFlag ? null : "pending";
  let darkTheme = darkFlag ? { flag: true, played: true } : null;
  const shots = outDir ? join(outDir, "flows") : null;
  if (shots) mkdirSync(shots, { recursive: true });
  let browser;
  try { browser = attach ? await tools.chromium.connectOverCDP(`http://127.0.0.1:${attach}`) : await launch(tools.chromium); }
  catch (e) { if (!attach) throw e; return { available: true, errors: [`nothing answers on port ${attach}: start the app with its remote debugging port open (see the desktop-app skill). ${String(e.message).split("\n")[0].slice(0, 120)}`] }; }
  const results = [];
  const origin = (() => { try { return new URL(baseUrl).origin; } catch { return null; } })();
  try {
    for (const [fi, flow] of selected.entries()) {
      if (fi > 0 && pause > 0) { log(`pause ${pause} s`); await new Promise((r) => setTimeout(r, pause * 1000)); }
      const entry = { id: flow.id, name: flow.name, played_at: new Date().toISOString(), ...(flow.status === "planned" ? { status: "planned" } : {}), runs: [] };
      if (flow.setup) entry.setup = [];
      const lastLogin = flow.steps.findLastIndex((s) => s.login);
      const variants = attach ? [null] : flow.variants || [null];
      for (const device of attach ? ["window"] : flow.devices) for (const variant of variants) {
        // A task that signs in keeps its browser context from one colour scheme to the next: the session is reused
        // and the sign-in steps are not played again (an app that limits sign-ins per minute would refuse them).
        let session = null;
        const schemeList = attach ? ["as shown"] : schemes;
        for (let k = 0; k < schemeList.length; k++) {
          const scheme = schemeList[k];
          const vars = { unique: uniqueValue() };
          const run = { device, ...(variant ? { variant: variant.id } : {}), scheme, budget: flow.budget, primary: flow.primary, completed: false, steps: [], console: [], dialogs: [] };
          if (flow.setup) {
            const r = runCommand(flow.setup, root);
            entry.setup.push({ device, scheme, ...r });
            if (!r.ok) {
              run.steps.push({ index: 1, name: "setup", action: "setup", target: flow.setup, ok: false, error: `setup failed (exit ${r.exit}): ${r.output || ""}`.slice(0, 300) });
              run.failed_step = 1;
              Object.assign(run, summarizeRun(run, budgets));
              entry.runs.push(run);
              continue;
            }
          }
          let ctx, page;
          if (attach) {
            ctx = browser.contexts()[0];
            page = ctx?.pages().find((p) => !/^(devtools|chrome-extension|about):/.test(p.url()));
            if (!page) return { available: true, errors: [`the app on port ${attach} shows no window to drive`] };
          } else if (session) {
            ctx = session.ctx;
            page = await ctx.newPage();
            await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
            run.session_reused = true;
          } else {
            ctx = await browser.newContext({ ...DEVICES[device], colorScheme: scheme, reducedMotion: "reduce", acceptDownloads: true, baseURL: baseUrl });
            // storage: values put in localStorage before the first step (a theme, a dismissed tour), once per tab, so
            // that what the task changes later is kept.
            const items = Object.fromEntries(Object.entries({ ...(flow.storage || {}), ...(variant?.storage || {}) })
              .map(([key, val]) => [key, typeof val === "string" ? String(expandValue(val, vars)) : JSON.stringify(val)]));
            if (Object.keys(items).length) {
              await ctx.addInitScript(({ items, origin }) => {
                try {
                  if (window.top !== window || (origin && location.origin !== origin) || sessionStorage.getItem("__sw_storage")) return;
                  for (const [key, val] of Object.entries(items)) localStorage.setItem(key, val);
                  sessionStorage.setItem("__sw_storage", "1");
                } catch { /* about:blank or storage blocked */ }
              }, { items, origin });
              run.storage = items;
            }
            page = await ctx.newPage();
          }
          const viewport = attach ? await page.evaluate(() => ({ width: innerWidth, height: innerHeight })) : DEVICES[device].viewport;
          page.on("console", (m) => { if (m.type() === "error" && run.console.length < 30) run.console.push(m.text().slice(0, 200)); });
          page.on("pageerror", (e) => { if (run.console.length < 30) run.console.push(`page error: ${String(e.message).slice(0, 200)}`); });
          page.on("dialog", (d) => { run.dialogs.push(`${d.type()}: ${d.message().slice(0, 120)}`); d.accept().catch(() => {}); });
          // In an attached window the app is already on screen: nothing is opened unless the flow says so, and a
          // relative address is resolved against the page the window shows.
          let steps = (Object.keys(flow.steps[0]).includes("goto") || attach ? flow.steps : [{ name: "Open", goto: flow.start || "/" }, ...flow.steps])
            .map((st) => (attach && typeof st.goto === "string" && !/^[a-z][a-z0-9+.-]*:/i.test(st.goto) ? { ...st, goto: new URL(st.goto, page.url()).href } : st));
          if (session) {
            const skip = steps.findLastIndex((s) => s.login) + 1;
            run.skipped_login_steps = skip;
            steps = [{ name: "Signed in (session kept)", goto: session.url }, ...steps.slice(skip)];
          }
          let signedIn = lastLogin >= 0 && !attach && !session;
          for (const [i, step] of steps.entries()) {
            const action = Object.keys(step).find((k) => ACTIONS.includes(k));
            const target = typeof step[action] === "string" ? step[action] : step[action]?.selector || "";
            const rec = { index: i + 1, name: step.name || `${action} ${target}`.trim(), action, target, decision: !!step.decision };
            if (step.login) rec.login = true;
            if (action === "fill") rec.chars = String(expandValue(step.fill.value ?? "", vars)).length;
            const before = action === "goto" ? null : await page.evaluate(scrollPositions).catch(() => null);
            try {
              await act(page, step, root, vars);
              await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
              await page.waitForTimeout(300);
              rec.ok = true;
            } catch (e) {
              rec.ok = false;
              const why = action === "press" && typeof step.press === "string" ? { error: String(e.message).split("\n")[0].slice(0, 240) }
                : await explainFailure(page, action, target, e.message);
              Object.assign(rec, why);
              rec.error = rec.error.slice(0, 400);
            }
            if (before) {
              const after = await page.evaluate(scrollPositions).catch(() => ({}));
              const px = Object.entries(before).reduce((t, [key, y]) => t + Math.abs((after[key] ?? y) - y), 0);
              rec.scrolled_screens = Math.round((px / viewport.height) * 10) / 10;
            }
            if (darkProbe === "pending" && rec.ok && action === "goto" && scheme === "light") {
              const light = await page.evaluate(colourPrint).catch(() => null);
              await page.emulateMedia({ colorScheme: "dark" }).catch(() => {});
              await page.waitForTimeout(200);
              const dark = await page.evaluate(colourPrint).catch(() => null);
              await page.emulateMedia({ colorScheme: "light" }).catch(() => {});
              await page.waitForTimeout(350);
              if (light && dark) {
                darkProbe = light !== dark ? "found" : "none";
                if (darkProbe === "found") {
                  schemes.push("dark");
                  darkTheme = { flag: false, detected_on: `${flow.id}, ${page.url()}`, played: true,
                    note: "The page changes colours with prefers-color-scheme: dark but project.json › flags has no dark_mode: dark was played too. Add dark_mode to the flags." };
                } else darkTheme = { flag: false, detected: false };
              }
            }
            rec.metrics = await page.evaluate(measure).catch(() => null);
            if (rec.metrics) {
              rec.metrics.preview = await locate(page, flow.preview, viewport);
              rec.metrics.primary = await locate(page, flow.primary, viewport);
            } else delete rec.metrics;
            if (step.snapshot !== false || !rec.ok) {
              rec.axe = await runAxe(page, tools.axePath);
              const odd = await page.evaluate(suspectTexts).catch(() => []);
              if (odd.length) rec.suspect_texts = odd;
              if (shots) {
                const name = `${flow.id}-${device}${variant ? `-${variant.id}` : ""}${scheme === "dark" ? "-dark" : ""}-${String(i + 1).padStart(2, "0")}-${slug(rec.name)}`;
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
            if (signedIn && rec.ok && step === flow.steps[lastLogin]) session = { ctx, url: page.url() };
            if (!rec.ok) { run.failed_step = rec.index; break; }
          }
          run.completed = run.steps.every((s) => s.ok);
          Object.assign(run, summarizeRun(run, budgets));
          entry.runs.push(run);
          if (attach) continue;
          if (session?.ctx === ctx && k < schemeList.length - 1) await page.close().catch(() => {});
          else { await ctx.close(); if (session?.ctx === ctx) session = null; }
        }
        if (session) { await session.ctx.close().catch(() => {}); session = null; }
      }
      results.push(entry);
    }
  } finally {
    await browser.close();
  }
  if (darkProbe === "pending") darkTheme = { flag: false, detected: null, note: "No first screen loaded: dark theme not checked." };
  return { available: true, playwright: tools.playwright, from: tools.source, base: baseUrl, attached: attach ? `port ${attach}` : undefined, schemes,
    ...(darkTheme ? { dark_theme: darkTheme } : {}), ...(setup.length ? { setup } : {}), ...(warnings.length ? { warnings } : {}),
    budgets, flows: results, not_built: notBuilt, summary: summarizeFlows(results, notBuilt) };
}

// Results of a new play merged into an earlier flows.json, by task id: tasks played now replace their earlier
// results, the others are kept (playing tasks in batches builds one complete file). Tasks no longer declared, or
// planned again, are dropped. keep: ids of the tasks still declared and built.
export function mergeFlowResults(previous, fresh, keep) {
  if (!previous?.flows || !Array.isArray(previous.flows) || !fresh?.flows) return fresh;
  const now = new Map(fresh.flows.map((f) => [f.id, f]));
  const kept = previous.flows.filter((f) => !now.has(f.id) && keep.has(f.id));
  if (!kept.length) return fresh;
  const flows = [...previous.flows.filter((f) => now.has(f.id) || kept.includes(f)).map((f) => now.get(f.id) || f),
    ...fresh.flows.filter((f) => !previous.flows.some((p) => p.id === f.id))];
  const notBuilt = fresh.not_built || [];
  return { ...fresh, schemes: [...new Set([...(previous.schemes || []), ...(fresh.schemes || [])])], flows, not_built: notBuilt,
    kept_from_earlier: kept.map((f) => ({ id: f.id, played_at: f.played_at || previous.played_at || null })), summary: summarizeFlows(flows, notBuilt) };
}

// Screenshots of the earlier results that the merged file no longer points to (a task replayed with fewer steps).
export function staleShots(previous, merged) {
  const paths = (r) => (r?.flows || []).flatMap((f) => f.runs.flatMap((x) => x.steps.flatMap((s) => [s.screenshot, s.screenshot_full]))).filter(Boolean);
  const live = new Set(paths(merged));
  return [...new Set(paths(previous))].filter((p) => !live.has(p));
}

export function removeShots(root, list) {
  for (const p of list) if (!isAbsolute(p) && !p.includes("..")) rmSync(join(root, p), { force: true });
}

// What the CLI prints: one line per run, no step details (they are in flows.json).
export function compactFlows(result, { report = "flows.json", screenshots = "flows/" } = {}) {
  if (!result.flows) return result;
  return { summary: result.summary, full_report: report, screenshots,
    ...(result.dark_theme?.note ? { dark_theme: result.dark_theme.note } : {}),
    ...(result.warnings ? { warnings: result.warnings } : {}),
    ...(result.kept_from_earlier ? { kept_from_earlier: result.kept_from_earlier } : {}),
    runs: result.flows.flatMap((f) => f.runs.map((r) => ({ flow: f.id, device: r.device, ...(r.variant ? { variant: r.variant } : {}), scheme: r.scheme,
      ...(r.session_reused ? { session_reused: true } : {}), completed: r.completed,
      failed_step: r.failed_step ? `${r.failed_step}: ${r.steps.at(-1)?.error}` : undefined, ...r.summary, over_budget: r.over_budget }))) };
}

export const FLOW_ACTIONS = ACTIONS;
