// Tests of the desktop check, flows in an attached window, performance, webhooks and facts. Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QP = join(ROOT, "plugins/core/scripts/qp.mjs");
const lib = (f) => import(`../plugins/core/scripts/lib/${f}`);
const fixture = () => { const dir = mkdtempSync(join(tmpdir(), "qp-")); cpSync(join(ROOT, "tests/fixtures/app"), dir, { recursive: true }); return dir; };
const run = (cwd, args) => new Promise((resolve) => execFile("node", [QP, ...args], { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, env: { ...process.env, QP_NO_CALIBRATION: "1" } },
  (e, stdout, stderr) => resolve({ code: e?.code ?? 0, out: stdout ? JSON.parse(stdout) : null, stderr })));
const browser = async (t) => { const { loadBrowserTools } = await lib("browser.mjs"); if (await loadBrowserTools(ROOT)) return true; t.skip("Playwright not installed (run qp.mjs browser-setup)"); return false; };
const setProject = (dir, patch) => { const f = join(dir, ".quality/project.json"); writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, "utf8")), ...patch })); };

test("desktop check: an open Tauri app and an unsafe Electron window are reported, careful ones pass", async () => {
  const { desktopChecks } = await lib("desktop.mjs");
  const mk = () => mkdtempSync(join(tmpdir(), "qp-desk-"));
  const w = (dir, p, text) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), typeof text === "string" ? text : JSON.stringify(text)); };
  // Tauri 2, wide open.
  const t = mk();
  w(t, "package.json", { devDependencies: { "@tauri-apps/cli": "2" } });
  w(t, "src-tauri/tauri.conf.json", { identifier: "com.tauri.dev", app: { security: { csp: null } }, plugins: { updater: { endpoints: ["http://updates.example.com/latest.json"] } } });
  w(t, "src-tauri/capabilities/default.json", { permissions: ["core:default", "fs:default", "shell:allow-execute"], remote: { urls: ["https://*.example.com"] } });
  w(t, "src-tauri/src/lib.rs", "#[tauri::command]\nfn read(path: String) {}\n#[tauri::command]\nfn save() {}\n");
  const bad = desktopChecks(t);
  assert.equal(bad.kind, "tauri");
  for (const k of ["tauri_csp", "tauri_remote_access", "app_identifier", "updater_signed", "updater_https"]) assert.ok(bad.summary.must_failed.includes(k), `must ${k}: ${JSON.stringify(bad.summary)}`);
  assert.ok(bad.summary.should_failed.includes("tauri_wide_permissions"));
  assert.match(bad.checks.commands_listed.value, /^2 command/);
  // The same app, tightened.
  w(t, "src-tauri/tauri.conf.json", { identifier: "fr.atelier.facto", app: { security: { csp: "default-src 'self'; img-src 'self' asset:" } }, plugins: { updater: { pubkey: "dW50cnVzdGVk", endpoints: ["https://updates.example.com/latest.json"] } },
    bundle: { windows: { certificateThumbprint: "ABCD" }, macOS: { signingIdentity: "Developer ID Application: Atelier" } } });
  w(t, "src-tauri/capabilities/default.json", { permissions: ["core:default", { identifier: "fs:allow-read-file", allow: [{ path: "$APPDATA/**" }] }] });
  const good = desktopChecks(t);
  assert.deepEqual(good.summary.must_failed, [], JSON.stringify(good.checks));
  assert.deepEqual(good.summary.should_failed, [], JSON.stringify(good.checks));
  // Electron.
  const e = mk();
  w(e, "package.json", { devDependencies: { electron: "^39.0.0" }, build: { appId: "com.electron.app" } });
  w(e, "main.js", "const { BrowserWindow, shell } = require('electron');\nconst win = new BrowserWindow({ webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false, webSecurity: false } });\nwin.loadURL('http://app.example.com');\nshell.openExternal(url);\n");
  const eb = desktopChecks(e);
  assert.equal(eb.kind, "electron");
  for (const k of ["electron_node_integration", "electron_context_isolation", "electron_web_security", "electron_remote_content", "electron_csp", "app_identifier"]) assert.ok(eb.summary.must_failed.includes(k), `must ${k}`);
  for (const k of ["electron_sandbox", "electron_open_external", "electron_preload", "updater_present", "signing"]) assert.ok(eb.summary.should_failed.includes(k), `should ${k}`);
  w(e, "package.json", { dependencies: { "electron-updater": "6" }, devDependencies: { electron: "^39.0.0" }, build: { appId: "fr.atelier.facto", win: { certificateSubjectName: "Atelier" }, mac: { notarize: true } } });
  w(e, "main.js", "const { BrowserWindow, session } = require('electron');\nconst win = new BrowserWindow({ webPreferences: { preload: __dirname + '/preload.js' } });\nsession.defaultSession.webRequest.onHeadersReceived((d, cb) => cb({ responseHeaders: { ...d.responseHeaders, 'Content-Security-Policy': [\"default-src 'self'\"] } }));\nwin.loadFile('index.html');\n");
  const eg = desktopChecks(e);
  assert.deepEqual(eg.summary.must_failed, [], JSON.stringify(eg.checks));
  assert.deepEqual(eg.summary.should_failed, [], JSON.stringify(eg.checks));
  assert.equal(desktopChecks(mk()).kind, "unknown");
});

test("flows --attach: key tasks are played in the window of an app that is already running", async (t) => {
  if (!(await browser(t))) return;
  const { loadBrowserTools } = await lib("browser.mjs");
  const tools = await loadBrowserTools(ROOT);
  const html = `<!doctype html><html lang="en"><title>App</title><body><main><h1>Notes</h1><input aria-label="Title"><button onclick="document.getElementById('ok').hidden=false">Save</button><p id="ok" hidden>Saved</p></main></body></html>`;
  const server = createServer((req, res) => { res.setHeader("content-type", "text/html"); res.end(html); }).listen(0);
  // Stands for a Tauri or Electron app started with its remote debugging port open.
  const port = 9300 + Math.floor(Math.random() * 500);
  const app = await tools.chromium.launch({ args: [`--remote-debugging-port=${port}`] });
  try {
    const page = await app.newPage();
    await page.goto(`http://localhost:${server.address().port}/`);
    const dir = fixture();
    setProject(dir, { urls: {}, flows: [{ id: "save-note", name: "Save a note", primary: 'role=button[name="Save"]',
      steps: [{ fill: { selector: 'role=textbox[name="Title"]', value: "Groceries" } }, { click: 'role=button[name="Save"]' }, { expect: "text=Saved" }] }] });
    const r = await run(dir, ["flows", "--attach", String(port), "--run", "2026-10-02"]);
    assert.equal(r.out.summary.completed, 1, JSON.stringify(r.out));
    assert.equal(r.out.runs.length, 1);
    assert.equal(r.out.runs[0].device, "window");
    // The app's own window was driven, not a new one.
    assert.equal(await page.locator("#ok").isVisible(), true);
    const none = await run(dir, ["flows", "--attach", "1", "--run", "2026-10-02"]);
    assert.match(none.out.errors[0], /nothing answers on port 1/);
  } finally { await app.close(); server.close(); }
});

test("perf: a heavy page fails its budgets, a light one passes", async (t) => {
  const { scorePerf, BUDGETS } = await lib("perf.mjs");
  const light = scorePerf({ lcp_ms: 1200, cls: 0.01, tbt_ms: 40, long_tasks: 1, js_bytes: 90 * 1024, total_bytes: 400 * 1024, requests: 18, hosts: 2, largest_image_kb: 120 });
  assert.deepEqual([light.summary.must_failed, light.summary.should_failed], [[], []]);
  const heavy = scorePerf({ lcp_ms: 5200, cls: 0.3, tbt_ms: 900, long_tasks: 9, js_bytes: 900 * 1024, total_bytes: 4000 * 1024, requests: 140, hosts: 12, largest_image_kb: 1800 });
  assert.deepEqual(heavy.summary.must_failed.sort(), ["blocking_time_poor", "largest_paint_poor", "layout_shift", "script_weight_poor"]);
  // A budget crossed past its "poor" line is reported once, as the must.
  assert.deepEqual(heavy.summary.should_failed.sort(), ["image_weight", "page_weight", "requests"]);
  const middle = scorePerf({ lcp_ms: 3000, cls: 0, tbt_ms: 400, long_tasks: 3, js_bytes: 400 * 1024, total_bytes: 900 * 1024, requests: 30, hosts: 3, largest_image_kb: null });
  assert.deepEqual([middle.summary.must_failed, middle.summary.should_failed.sort()], [[], ["blocking_time", "largest_paint", "script_weight"]]);
  assert.equal(BUDGETS.lcp_ms, 2500);
  if (!(await browser(t))) return;
  const big = "x".repeat(900 * 1024);
  const server = createServer((req, res) => {
    if (req.url === "/big.js") { res.setHeader("content-type", "application/javascript"); return res.end(`/*${big}*/ const t = Date.now(); while (Date.now() - t < 400) {}`); }
    res.setHeader("content-type", "text/html");
    res.end(`<!doctype html><html lang="en"><title>P</title><body><h1>Page</h1><p>Some text to paint.</p>${req.url === "/heavy" ? '<script src="/big.js"></script>' : ""}</body></html>`);
  }).listen(0);
  try {
    const dir = fixture();
    const base = `http://localhost:${server.address().port}`;
    const r = await run(dir, ["perf", `${base}/light`, `${base}/heavy`, "--run", "2026-10-03"]);
    const [a, b] = r.out.pages;
    assert.deepEqual(a.summary.must_failed, [], JSON.stringify(a));
    assert.ok(b.summary.must_failed.includes("script_weight_poor"), JSON.stringify(b.summary));
    assert.ok(b.measures.js_bytes > 800 * 1024 && b.measures.tbt_ms > a.measures.tbt_ms);
    assert.equal(r.code, 2);
    assert.ok(existsSync(join(dir, ".quality/audits/2026-10-03/perf.json")));
  } finally { server.close(); }
});

test("webhooks: an endpoint that accepts an unsigned event fails, one that refuses passes", async () => {
  const server = createServer((req, res) => {
    req.on("data", () => {}).on("end", () => {
      if (req.url === "/open") { res.statusCode = 200; return res.end("ok"); }
      if (req.url === "/crash") { res.statusCode = req.headers["stripe-signature"] ? 500 : 400; return res.end(); }
      // Refuses anything whose signature it cannot verify.
      res.statusCode = 400; res.end("invalid signature");
    });
  }).listen(0);
  try {
    const dir = fixture();
    setProject(dir, { urls: { local: `http://localhost:${server.address().port}` }, webhooks: [{ path: "/open", provider: "stripe" }, { path: "/crash", provider: "stripe" }, { path: "/strict", provider: "stripe" }] });
    const r = await run(dir, ["webhooks", "--run", "2026-10-04"]);
    assert.equal(r.code, 2);
    assert.deepEqual(r.out.summary.must_failed.sort(), ["crash_forged", "open_forged", "open_unsigned"]);
    assert.match(r.out.checks.crash_forged.value, /failed instead of refusing/);
    assert.equal(r.out.checks.strict_unsigned.ok && r.out.checks.strict_forged.ok, true);
    setProject(dir, { webhooks: [{ path: "/strict", provider: "stripe" }] });
    assert.equal((await run(dir, ["webhooks", "--run", "2026-10-04"])).code, 0);
    setProject(dir, { urls: { production: "https://shop.example.com" } });
    assert.match((await run(dir, ["webhooks", "--base", "https://shop.example.com"])).out.errors[0], /not a local or staging address/);
  } finally { server.close(); }
});

test("facts: figures, quotes, customer names and badges on a page must trace to the facts file", async (t) => {
  const { traced } = await lib("facts.mjs");
  const facts = [{ claim: "1,240 freelancers", source: "admin dashboard, 2026-11-10" }, { claim: "Marie Dupont, Atelier Nord", source: "email of 2026-10-02, agreed to be quoted" }];
  assert.ok(traced({ kind: "figure", text: "We serve 1,240 freelancers" }, facts));
  assert.equal(traced({ kind: "figure", text: "12,000+ teams" }, facts), null);
  assert.ok(traced({ kind: "quote", text: "Marie Dupont, Atelier Nord: “We send every invoice…”" }, facts));
  assert.equal(traced({ kind: "customers", text: "Trusted by: Acme, Globex" }, facts), null);
  if (!(await browser(t))) return;
  const dir = fixture();
  const page = join(ROOT, "tests/fixtures/facts/claims.html");
  const none = await run(dir, ["facts", page, "--run", "2026-10-05"]);
  assert.equal(none.code, 2);
  const kinds = none.out.summary.by_kind;
  assert.ok(kinds.figure >= 3 && kinds.rating >= 1 && kinds.quote >= 1 && kinds.customers >= 1 && kinds.badge >= 1, JSON.stringify(none.out.pages[0].claims));
  assert.equal(none.out.summary.traced, 0);
  writeFileSync(join(dir, ".quality/facts.json"), JSON.stringify({ facts: [...facts, { claim: "undocumented", source: "" }] }));
  const some = await run(dir, ["facts", page, "--run", "2026-10-05"]);
  const claims = some.out.pages[0].claims;
  assert.ok(claims.find((c) => /1,240/.test(c.text)).traced);
  assert.ok(claims.find((c) => c.kind === "quote").traced);
  assert.equal(claims.find((c) => /12,000/.test(c.text)).traced, false);
  assert.equal(claims.find((c) => c.kind === "badge").traced, false);
  assert.deepEqual(some.out.summary.facts_without_source, ["undocumented"]);
  assert.equal(some.code, 2);
});

test("mobile audit: small, unnamed and crowded touch targets are read from the Android view hierarchy", async () => {
  const { parseHierarchy, auditHierarchy } = await lib("mobile-audit.mjs");
  // 420 dpi: 1 dp = 2.625 px. A 48 dp target is 126 px.
  const node = (cls, bounds, extra = "", inner = "") => `<node class="android.widget.${cls}" package="com.example.app" bounds="${bounds}" enabled="true" ${extra}>${inner}</node>`;
  const xml = `<?xml version='1.0'?><hierarchy rotation="0">${node("FrameLayout", "[0,0][1080,2340]", 'clickable="false"',
    node("Button", "[40,200][400,340]", 'clickable="true" text="Save &amp; send"') +
    node("ImageButton", "[420,200][480,260]", 'clickable="true" content-desc=""') +
    node("ImageButton", "[485,200][545,260]", 'clickable="true" content-desc="Share"') +
    node("LinearLayout", "[0,400][1080,600]", 'clickable="true"', node("TextView", "[40,420][600,480]", 'clickable="false" text="Notifications"')) +
    node("ImageView", "[900,900][950,950]", 'clickable="true" content-desc="Close" resource-id="com.example.app:id/close"') +
    node("RecyclerView", "[0,1000][1080,2000]", 'clickable="false"', node("LinearLayout", "[0,1980][1080,2000]", 'clickable="true"', node("TextView", "[40,1985][400,2000]", 'text="Cut row"'))))}</hierarchy>`;
  const nodes = parseHierarchy(xml);
  assert.equal(nodes.length, 10);
  assert.equal(nodes[1].text, "Save & send");
  const a = auditHierarchy(nodes, { density: 420 });
  // The row cut by the bottom of its list is not counted.
  assert.equal(a.targets, 5);
  assert.equal(a.checks.tiny_targets.ok, false);
  assert.match(a.checks.tiny_targets.samples.join(" | "), /ImageButton .*23×23 dp/);
  assert.match(a.checks.tiny_targets.samples.join(" | "), /ImageView#close "Close" 19×19 dp/);
  assert.equal(a.checks.unnamed_controls.ok, false);
  assert.equal(a.checks.unnamed_controls.samples.length, 1);
  assert.equal(a.checks.crowded_targets.ok, false);
  assert.match(a.checks.crowded_targets.samples[0], /2 dp apart/);
  // A row is named by the text inside it, and is a full-size target.
  assert.ok(!JSON.stringify(a.checks).includes("Notifications"));
  const fine = auditHierarchy(parseHierarchy(`<hierarchy>${node("Button", "[40,200][400,340]", 'clickable="true" text="Save"')}</hierarchy>`), { density: 420 });
  assert.deepEqual(Object.values(fine.checks).map((c) => c.ok), [true, true, true, true]);
});
