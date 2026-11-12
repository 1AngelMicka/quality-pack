// Record a key task by doing it: Playwright's recorder (codegen) opens a browser, the user does the task and
// closes the window, and the recorded script is turned into a flow for .quality/project.json.
// Writing selectors by hand was the main friction of flows; codegen picks robust ones (roles, labels, test ids).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

// File name of a recorded path, whatever the system it was recorded on (path.basename ignores "\" on Linux).
const basename = (f) => String(f).split(/[\\/]/).pop();

// A JavaScript string literal at the start of s ('…', "…" or `…`): its value and its length.
function literal(s) {
  const q = s[0];
  if (!["'", '"', "`"].includes(q)) return null;
  let out = "";
  for (let i = 1; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") { const n = s[++i]; out += { n: "\n", t: "\t", r: "\r" }[n] ?? n; continue; }
    if (c === q) return { value: out, length: i + 1 };
    out += c;
  }
  return null;
}

// Arguments of a call, given the text right after "(": string literals, string arrays and { name, exact } options.
function args(s) {
  const list = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ")") return { list, length: i + 1 };
    if (c === "," || c === " ") { i++; continue; }
    if (["'", '"', "`"].includes(c)) { const l = literal(s.slice(i)); if (!l) break; list.push(l.value); i += l.length; continue; }
    if (c === "[") {
      const arr = []; i++;
      while (i < s.length && s[i] !== "]") { if (["'", '"', "`"].includes(s[i])) { const l = literal(s.slice(i)); arr.push(l.value); i += l.length; } else i++; }
      list.push(arr); i++; continue;
    }
    if (c === "{") {
      const end = s.indexOf("}", i);
      const body = s.slice(i + 1, end);
      const o = {};
      const name = /name:\s*(['"`])((?:\\.|(?!\1).)*)\1/.exec(body);
      if (name) o.name = literal(name[1] + name[2] + name[1]).value;
      if (/exact:\s*true/.test(body)) o.exact = true;
      const key = /key:\s*(['"`])((?:\\.|(?!\1).)*)\1/.exec(body);
      if (key) o.key = key[2];
      list.push(o); i = end + 1; continue;
    }
    if (/\d/.test(c)) { const m = /^\d+/.exec(s.slice(i)); list.push(Number(m[0])); i += m[0].length; continue; }
    break;
  }
  return null;
}

const q = (v) => JSON.stringify(v);
// Playwright locator calls → a selector string that page.locator() understands.
function selectorOf(method, a) {
  const [v, o = {}] = a;
  const flagged = (x) => `${q(x)}${o.exact ? "s" : "i"}`;
  switch (method) {
    case "getByRole": return `role=${v}${o.name != null ? `[name=${q(o.name)}${o.exact ? "s" : ""}]` : ""}`;
    case "getByText": return o.exact ? `text=${q(v)}` : `text=${v}`;
    case "getByLabel": return `internal:label=${flagged(v)}`;
    case "getByPlaceholder": return `internal:attr=[placeholder=${flagged(v)}]`;
    case "getByAltText": return `internal:attr=[alt=${flagged(v)}]`;
    case "getByTitle": return `internal:attr=[title=${flagged(v)}]`;
    case "getByTestId": return `internal:testid=[data-testid=${q(v)}s]`;
    case "locator": return v;
    case "first": return "nth=0";
    case "last": return "nth=-1";
    case "nth": return `nth=${v}`;
    case "filter": return null;
    default: return undefined;
  }
}

const ACTIONS = { click: "click", dblclick: "click", check: "check", uncheck: "click", fill: "fill", press: "press", selectOption: "select", setInputFiles: "upload", hover: "hover" };

// Turn the JavaScript written by `playwright codegen` into flow steps.
export function parseCodegen(code, { base = "" } = {}) {
  const steps = [];
  const warnings = [];
  let origin = "";
  try { origin = base ? new URL(base).origin : ""; } catch { /* no base */ }
  for (const raw of code.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith("await ")) continue;
    let s = line.slice(6).replace(/;$/, "");
    if (/^(context|browser)\./.test(s) || /^page\.close\(/.test(s)) continue;
    let m = /^page\.goto\(/.exec(s);
    if (m) {
      const a = args(s.slice(m[0].length));
      let url = a?.list[0] || "/";
      try { const u = new URL(url); if (!origin) origin = u.origin; if (u.origin === origin) url = u.pathname + u.search + u.hash; } catch { /* relative */ }
      steps.push({ goto: url });
      continue;
    }
    m = /^page\.keyboard\.press\(/.exec(s);
    if (m) { steps.push({ press: args(s.slice(m[0].length)).list[0] }); continue; }
    const expect = /^expect\((.*)\)\.(toBeVisible|toContainText|toHaveText)\((.*)\)$/.exec(s);
    if (expect) s = `${expect[1]}.__expect(${expect[3]})`;
    if (!/^page\d*\./.test(s)) { warnings.push(`skipped: ${line.slice(0, 120)}`); continue; }
    if (/^page\d+\./.test(s)) warnings.push(`a step happens in a new tab or popup, flows play one page only: ${line.slice(0, 80)}`);
    s = s.replace(/^page\d*/, "");
    const parts = [];
    let action = null, actionArgs = [];
    let ok = true;
    while (s.startsWith(".")) {
      const call = /^\.(\w+)\(/.exec(s);
      if (!call) { ok = false; break; }
      const a = args(s.slice(call[0].length));
      if (!a) { ok = false; break; }
      s = s.slice(call[0].length + a.length);
      const method = call[1];
      if (method === "__expect" || ACTIONS[method]) { action = method; actionArgs = a.list; break; }
      const sel = selectorOf(method, a.list);
      if (sel === undefined) { ok = false; break; }
      if (sel) parts.push(sel);
    }
    if (!ok || !action || !parts.length) { warnings.push(`not understood: ${line.slice(0, 120)}`); continue; }
    const selector = parts.join(" >> ");
    if (action === "__expect") { steps.push({ expect: actionArgs[0] ? { selector, text: actionArgs[0] } : selector }); continue; }
    const kind = ACTIONS[action];
    if (kind === "click" || kind === "check" || kind === "hover") steps.push({ [kind]: selector });
    else if (kind === "fill" || kind === "select") steps.push({ [kind]: { selector, value: Array.isArray(actionArgs[0]) ? actionArgs[0][0] : actionArgs[0] } });
    else if (kind === "press") steps.push({ press: { selector, key: actionArgs[0] } });
    else if (kind === "upload") {
      const files = (Array.isArray(actionArgs[0]) ? actionArgs[0] : [actionArgs[0]]).filter(Boolean).map((f) => `.quality/fixtures/${basename(String(f))}`);
      steps.push({ upload: { selector, files } });
      warnings.push(`copy the uploaded test files into .quality/fixtures/: ${files.map((f) => basename(f)).join(", ")}`);
    }
  }
  // Typing letter by letter after a fill is recorded as repeated fills of the same field: keep the last one.
  const merged = steps.filter((st, i) => !(st.fill && steps[i + 1]?.fill?.selector === st.fill.selector));
  return { steps: merged, warnings };
}

// The Playwright command-line entry point next to the resolved package.
export function playwrightCli(pwPath) {
  let dir = dirname(pwPath);
  for (let i = 0; i < 4; i++) {
    if (existsSync(join(dir, "cli.js")) && existsSync(join(dir, "package.json"))) return join(dir, "cli.js");
    dir = dirname(dir);
  }
  return null;
}

// Open the recorder and wait until the user closes the browser. Returns the recorded JavaScript.
export function runRecorder(cli, url, { device = "desktop" } = {}) {
  const out = join(mkdtempSync(join(tmpdir(), "qp-record-")), "flow.js");
  const deviceArgs = device === "mobile" ? ["--device", "iPhone 13"] : ["--viewport-size", "1440,900"];
  const r = spawnSync(process.execPath, [cli, "codegen", "--target", "javascript", "--output", out, ...deviceArgs, url], { stdio: "inherit" });
  if (r.status !== 0 && !existsSync(out)) throw new Error(`the recorder stopped with exit code ${r.status}`);
  return existsSync(out) ? readFileSync(out, "utf8") : "";
}
