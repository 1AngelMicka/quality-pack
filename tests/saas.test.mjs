// Tests of the 0.6.0 commands: craft, dast, mobile, supply, threats, auth. Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile, execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QP = join(ROOT, "plugins/core/scripts/qp.mjs");
const lib = (f) => import(`../plugins/core/scripts/lib/${f}`);

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "qp-"));
  cpSync(join(ROOT, "tests/fixtures/app"), dir, { recursive: true });
  return dir;
}
const setProject = (dir, patch) => {
  const f = join(dir, ".quality/project.json");
  writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, "utf8")), ...patch }));
};
// Async on purpose: the test's own HTTP server must keep answering while the CLI runs.
const run = (cwd, args, env = {}) => new Promise((resolve) => execFile("node", [QP, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } },
  (e, stdout, stderr) => resolve({ code: e?.code ?? 0, out: stdout ? JSON.parse(stdout) : null, stderr })));

test("craft: a rough page fails on finish, a polished one passes", async (t) => {
  const { loadBrowserTools } = await lib("browser.mjs");
  if (!(await loadBrowserTools(ROOT))) return t.skip("Playwright not installed (run qp.mjs browser-setup)");
  const dir = mkdtempSync(join(tmpdir(), "qp-craft-"));
  const page = (f) => join(ROOT, "tests/fixtures/craft", f);
  const rough = (await run(dir, ["craft", page("rough.html")])).out.pages[0];
  for (const k of ["tabular_numbers", "input_font_size", "focus_visible", "image_distortion", "image_sharpness", "viewport_zoom"]) assert.ok(rough.summary.must_failed.includes(k), `must ${k}`);
  for (const k of ["heading_wrap", "typographic_characters", "caps_tracking", "label_case", "shadow_quality", "nested_radius", "hover_states", "transition_all"]) assert.ok(rough.summary.should_failed.includes(k), `should ${k}`);
  assert.ok(rough.failed.focus_visible.samples.length >= 3);
  const polished = (await run(dir, ["craft", page("polished.html")])).out.pages[0];
  assert.deepEqual(polished.summary.must_failed, [], JSON.stringify(polished.failed));
  assert.deepEqual(polished.summary.should_failed, [], JSON.stringify(polished.failed));
});

test("craft: site icon, share image and 404 page are checked on a served site", async (t) => {
  const { loadBrowserTools } = await lib("browser.mjs");
  if (!(await loadBrowserTools(ROOT))) return t.skip("Playwright not installed (run qp.mjs browser-setup)");
  const html = readFileSync(join(ROOT, "tests/fixtures/craft/polished.html"), "utf8");
  // Every address answers 200 with the same page (a "soft 404"), and there is no icon.
  const soft = createServer((req, res) => { res.setHeader("content-type", "text/html"); res.end(html); }).listen(0);
  // A site that answers properly.
  const good = createServer((req, res) => {
    if (req.url === "/") { res.setHeader("content-type", "text/html"); return res.end(html.replace("<title>", `<link rel="icon" href="/icon.svg"><link rel="apple-touch-icon" href="/icon.svg"><meta property="og:image" content="http://localhost:${good.address().port}/icon.svg"><title>`)); }
    if (req.url === "/icon.svg") { res.setHeader("content-type", "image/svg+xml"); return res.end("<svg xmlns='http://www.w3.org/2000/svg'/>"); }
    res.statusCode = 404; res.setHeader("content-type", "text/html");
    res.end("<h1>We could not find that page</h1><p>The address may be wrong, or the page was moved somewhere else.</p><a href=\"/\">Back to the start</a>");
  }).listen(0);
  try {
    const dir = mkdtempSync(join(tmpdir(), "qp-craft-"));
    const a = (await run(dir, ["craft", `http://localhost:${soft.address().port}/`, "--mode", "persuade"])).out.pages[0];
    assert.ok(a.summary.must_failed.includes("not_found_status"));
    assert.ok(a.summary.must_failed.includes("favicon"));
    assert.ok(a.summary.must_failed.includes("share_image"));
    const b = (await run(dir, ["craft", `http://localhost:${good.address().port}/`, "--mode", "persuade"])).out.pages[0];
    assert.deepEqual(b.summary.must_failed, [], JSON.stringify(b.failed));
    assert.ok(b.passed.includes("not_found_page") && b.passed.includes("share_image") && b.passed.includes("touch_icon"));
  } finally { soft.close(); good.close(); }
});

test("dast: the ZAP command reaches a local site from the container, and its report is summarised", async () => {
  const { zapCommand, parseZap, runZap } = await lib("dast.mjs");
  const linux = zapCommand("http://localhost:3000/app", "/tmp/out", { platform: "linux" });
  assert.ok(linux.args.includes("--add-host") && linux.args.includes("http://host.docker.internal:3000/app"));
  assert.ok(!zapCommand("https://staging.example.com", "/tmp/out", { platform: "linux" }).args.includes("--add-host"));
  const parsed = parseZap({ site: [{ "@name": "http://x", alerts: [
    { pluginid: "10038", name: "Content Security Policy (CSP) Header Not Set", riskcode: "2", confidence: "3", count: "4", cweid: "693", solution: "<p>Set the header.</p>", instances: [{ uri: "http://x/", method: "GET" }] },
    { pluginid: "10096", name: "Timestamp Disclosure", riskcode: "0", confidence: "1", count: "1", cweid: "-1", instances: [] },
    { pluginid: "40012", name: "Cross Site Scripting (Reflected)", riskcode: "3", confidence: "2", count: "1", cweid: "79", instances: [{ uri: "http://x/s", method: "GET", param: "q" }] }] }] });
  assert.deepEqual(parsed.summary, { info: 1, low: 0, medium: 1, high: 1, alerts: 3 });
  assert.equal(parsed.alerts[0].risk, "high");
  assert.equal(parsed.alerts[0].examples[0], "GET http://x/s (q)");
  assert.equal(parsed.alerts[1].solution, "Set the header.");
  assert.match(runZap("https://shop.example.com/", { outDir: tmpdir(), production: "https://shop.example.com" }).errors[0], /production/);
});

test("mobile: flows become Maestro files, and a JUnit report is read", async () => {
  const { toMaestro, validateMobile, parseJunit } = await lib("mobile.mjs");
  const flow = { id: "login", name: "Log in", steps: [
    { tap: "Log in" }, { type: { into: { id: "email" }, text: "demo@example.com" } }, { tap: { id: "submit" }, snapshot: false },
    { wait_for: { visible: "Welcome", timeout: 5000 } }, { expect: "Welcome" }, { offline: true }, { back: true }, { open_link: "https://app.example.com/item/1" }] };
  const yaml = toMaestro(flow, "com.example.app");
  assert.match(yaml, /^# Generated[^\n]*\nappId: com\.example\.app\n---\n- launchApp:\n    clearState: true\n/);
  assert.ok(yaml.includes('- tapOn: "Log in"\n'));
  assert.ok(yaml.includes('- tapOn:\n    id: "email"\n- inputText: "demo@example.com"\n'));
  assert.ok(yaml.includes('- extendedWaitUntil:\n    visible: "Welcome"\n    timeout: 5000\n'));
  assert.ok(yaml.includes("- setAirplaneMode: enabled\n") && yaml.includes("- back\n") && yaml.includes('- openLink: "https://app.example.com/item/1"\n'));
  assert.equal((yaml.match(/takeScreenshot/g) || []).length, 6); // launch, tap, type, offline, back, open_link (the tap with snapshot: false is skipped)
  assert.ok(validateMobile({ mobile: { flows: [flow] } }).errors.some((e) => e.includes("app_id")));
  assert.ok(validateMobile({ mobile: { app_id: "x.y", flows: [{ id: "a", name: "A", steps: [{ tap: {} }] }] } }).errors.length);
  const cases = parseJunit(`<testsuites><testsuite name="Test Suite" tests="2" failures="1"><testcase id="login" name="login" classname="login" time="12.5" status="SUCCESS"/>
    <testcase id="pay" name="pay" time="3.0" status="ERROR"><failure>Element not found: Text matching regex: Pay now</failure></testcase></testsuite></testsuites>`);
  assert.deepEqual(cases.map((c) => [c.name, c.ok]), [["login", true], ["pay", false]]);
  assert.match(cases[1].error, /Pay now/);
});

test("mobile check: release blockers are read from the project files", async () => {
  const dir = fixture();
  const w = (p, text) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), text); };
  w("android/app/build.gradle", "android {\n  defaultConfig {\n    applicationId 'com.example.app'\n    targetSdkVersion 34\n  }\n}\n");
  w("android/app/src/main/AndroidManifest.xml", '<manifest><application android:debuggable="true" android:usesCleartextTraffic="true" android:allowBackup="true"></application></manifest>');
  w("ios/App/App/Info.plist", "<plist><dict><key>NSCameraUsageDescription</key><string>Camera</string><key>NSAppTransportSecurity</key><dict><key>NSAllowsArbitraryLoads</key><true/></dict></dict></plist>");
  w("capacitor.config.json", JSON.stringify({ appId: "com.example.app", server: { allowNavigation: ["*"], url: "https://app.example.com" } }));
  setProject(dir, { flags: ["has_ui", "has_auth"], mobile: { app_id: "com.example.app" }, urls: {} });
  const bad = await run(dir, ["mobile", "check", "--run", "2026-06-01"]);
  assert.equal(bad.code, 2);
  for (const k of ["android_target_api", "android_debuggable", "android_cleartext", "ios_privacy_manifest", "ios_ats", "ios_permission_texts", "webview_navigation", "account_deletion_page"])
    assert.ok(bad.out.summary.must_failed.includes(k), `must ${k}: ${JSON.stringify(bad.out.summary)}`);
  assert.ok(bad.out.summary.should_failed.includes("webview_live_url") && bad.out.summary.should_failed.includes("android_backup"));
  assert.equal(bad.out.approach, "unknown");
  assert.ok(existsSync(join(dir, ".quality/audits/2026-06-01/mobile-check.json")));
  // The same project, fixed.
  w("android/app/build.gradle", "android {\n  defaultConfig {\n    targetSdk = 36\n  }\n}\n");
  w("android/app/src/main/AndroidManifest.xml", '<manifest><application android:allowBackup="false"></application></manifest>');
  w("ios/App/App/Info.plist", "<plist><dict><key>NSCameraUsageDescription</key><string>Take a photo of the receipt to attach it to an expense.</string></dict></plist>");
  w("ios/App/App/PrivacyInfo.xcprivacy", "<plist/>");
  w("capacitor.config.json", JSON.stringify({ appId: "com.example.app", server: { allowNavigation: ["app.example.com"] } }));
  const page = createServer((_, res) => res.end("Delete your account")).listen(0);
  try {
    setProject(dir, { mobile: { app_id: "com.example.app", account_deletion_url: `http://localhost:${page.address().port}/delete-account` } });
    const good = await run(dir, ["mobile", "check", "--run", "2026-06-01"]);
    assert.deepEqual(good.out.summary.must_failed, [], JSON.stringify(good.out.failed));
    assert.equal(good.code, 0);
  } finally { page.close(); }
  // Flows are written even when Maestro is not installed.
  setProject(dir, { mobile: { app_id: "com.example.app", flows: [{ id: "open", name: "Open the app", steps: [{ expect: "Welcome" }] }] } });
  const flows = await run(dir, ["mobile", "flows", "--check"]);
  assert.equal(flows.out.ok, true);
});

test("supply: cooldown, install scripts, pinned actions and env files are read from the repository", async () => {
  const { supplyChecks } = await lib("security.mjs");
  const dir = mkdtempSync(join(tmpdir(), "qp-supply-"));
  const w = (p, text) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), text); };
  spawnSync("git", ["init", "-q"], { cwd: dir });
  w("package.json", "{}");
  w(".env", "SECRET=1");
  w(".github/workflows/ci.yml", "on: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: some-org/some-action@v2\n      - run: echo \"${{ github.event.pull_request.title }}\"\n");
  const bad = supplyChecks(dir);
  for (const k of ["lockfile", "release_cooldown", "actions_pinned", "actions_permissions", "actions_injection", "env_files"]) assert.ok(bad.summary.must_failed.includes(k), `must ${k}: ${JSON.stringify(bad.summary)}`);
  assert.ok(bad.summary.should_failed.includes("install_scripts") && bad.summary.should_failed.includes("update_bot"));
  w("package-lock.json", "{}");
  w(".npmrc", "min-release-age=7\nignore-scripts=true\n");
  w(".gitignore", ".env\n");
  w(".github/dependabot.yml", "version: 2\n");
  w(".github/workflows/ci.yml", "on: push\npermissions:\n  contents: read\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683\n      - uses: some-org/some-action@0123456789abcdef0123456789abcdef01234567\n");
  const good = supplyChecks(dir);
  assert.deepEqual(good.summary.must_failed, [], JSON.stringify(good.checks));
  assert.deepEqual(good.summary.should_failed, []);
  // pnpm counts its cooldown in minutes.
  w("pnpm-lock.yaml", "");
  w("pnpm-workspace.yaml", "minimumReleaseAge: 1440\n");
  writeFileSync(join(dir, ".npmrc"), "");
  const pnpm = supplyChecks(dir);
  assert.equal(pnpm.checks.release_cooldown.ok, true);
  assert.equal(pnpm.checks.release_cooldown_week.ok, false);
});

test("threats: a model is complete when every entry point has an abuse case with a response and a test", async () => {
  const { validateThreats } = await lib("security.mjs");
  const model = JSON.parse(readFileSync(join(ROOT, "plugins/core/templates/threats.json"), "utf8"));
  // The template is an example to rewrite: its placeholder sentence is refused.
  assert.ok(validateThreats(model).errors.some((e) => e.startsWith("system")));
  model.system = "Teams keep their client invoices here and share them with their accountant.";
  model.reviewed = new Date().toISOString().slice(0, 10);
  const ok = validateThreats(model);
  assert.deepEqual(ok.errors, []);
  assert.ok(ok.summary.abuse_cases >= 5);
  const broken = structuredClone(model);
  broken.entry_points.push({ id: "E99", what: "GET /api/export" });
  broken.abuse_cases[0].test = "";
  broken.abuse_cases[1].response = "ignore";
  const errs = validateThreats(broken).errors.join("\n");
  assert.match(errs, /E99/);
  assert.match(errs, /names its test/);
  assert.match(errs, /response must be/);
  assert.equal(validateThreats(null).ok, false);
  const dir = fixture();
  assert.equal((await run(dir, ["threats"])).code, 2);
});

test("auth: a login that names unknown accounts and never slows down fails, a careful one passes", async () => {
  const { classifyTarget } = await lib("security.mjs");
  assert.equal(classifyTarget("http://localhost:3000"), "local");
  assert.equal(classifyTarget("https://staging.example.com"), "staging");
  assert.equal(classifyTarget("https://example.dev"), "production");
  assert.equal(classifyTarget("https://app.example.com", { urls: { staging: "https://app.example.com" } }), "staging");
  assert.equal(classifyTarget("https://staging.example.com", { urls: { production: "https://staging.example.com" } }), "production");
  const body = (req) => new Promise((r) => { let s = ""; req.on("data", (d) => (s += d)).on("end", () => r(JSON.parse(s || "{}"))); });
  let fails = 0;
  const server = createServer(async (req, res) => {
    const b = await body(req);
    const send = (code, o) => { res.statusCode = code; res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); };
    if (req.url === "/weak/login") return b.email === "known@example.com" ? send(401, { error: "Wrong password" }) : send(404, { error: "No account with this email" });
    if (req.url === "/careful/login") { if (++fails > 10) return send(429, { error: "Too many attempts" }); return send(401, { error: "Wrong email or password" }); }
    send(404, {});
  }).listen(0);
  try {
    const dir = fixture();
    const base = `http://localhost:${server.address().port}`;
    setProject(dir, { urls: { local: base }, auth_probe: { login: { path: "/weak/login" }, known_email: "known@example.com", attempts: 8 } });
    const weak = await run(dir, ["auth", "--run", "2026-07-02"]);
    assert.equal(weak.code, 2);
    assert.deepEqual(weak.out.summary.must_failed.sort(), ["account_enumeration", "login_rate_limit"]);
    setProject(dir, { auth_probe: { login: { path: "/careful/login" }, known_email: "known@example.com", attempts: 12 } });
    const careful = await run(dir, ["auth", "--run", "2026-07-02"]);
    assert.deepEqual(careful.out.summary.must_failed, [], JSON.stringify(careful.out.checks));
    assert.equal(careful.code, 0);
    assert.ok(existsSync(join(dir, ".quality/audits/2026-07-02/auth.json")));
    // Never on production.
    setProject(dir, { urls: { production: "https://shop.example.com" } });
    const prod = await run(dir, ["auth", "--base", "https://shop.example.com"]);
    assert.match(prod.out.errors[0], /not a local or staging address/);
  } finally { server.close(); }
});

test("access: login steps played in a browser give the session used for the checks", async (t) => {
  const { loadBrowserTools } = await lib("browser.mjs");
  if (!(await loadBrowserTools(ROOT))) return t.skip("Playwright not installed (run qp.mjs browser-setup)");
  const server = createServer((req, res) => {
    const user = /user=(\w+)/.exec(req.headers.cookie || "")?.[1];
    if (req.url.startsWith("/login")) {
      const name = new URL(req.url, "http://x").searchParams.get("as");
      if (name) { res.setHeader("set-cookie", `user=${name}; Path=/; HttpOnly`); res.statusCode = 302; res.setHeader("location", "/home"); return res.end(); }
      res.setHeader("content-type", "text/html");
      return res.end('<form action="/login"><label>Name <input name="as"></label><button>Sign in</button></form>');
    }
    if (req.url === "/home") { res.setHeader("content-type", "text/html"); return res.end(`<p>Hello ${user || "stranger"}</p>`); }
    if (req.url === "/api/me/notes") { res.setHeader("content-type", "application/json"); res.statusCode = user ? 200 : 401; return res.end(JSON.stringify(user ? { owner: "alice", note: "alice-secret" } : {})); }
    res.statusCode = 404; res.end();
  }).listen(0);
  try {
    const dir = fixture();
    const login = (name) => [{ goto: "/login" }, { fill: { selector: "input[name=as]", value: name } }, { click: "text=Sign in" }, { expect: `text=Hello ${name}` }];
    setProject(dir, { urls: { local: `http://localhost:${server.address().port}` },
      access: { accounts: { alice: { login: login("alice") }, bob: { login: login("bob") } }, checks: [{ id: "notes", path: "/api/me/notes", owner: "alice", denied_to: ["bob", "anonymous"], secret: "alice-secret" }] } });
    const r = await run(dir, ["access", "--run", "2026-07-03"]);
    assert.deepEqual(r.out.session_errors, []);
    // The route only checks that someone is logged in: bob gets alice's notes.
    assert.equal(r.out.checks[0].attempts, "bob: leak, anonymous: denied");
    assert.equal(r.code, 2);
  } finally { server.close(); }
});
