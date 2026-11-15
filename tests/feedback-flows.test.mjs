// Tests of the key-task fixes that came from a pilot project's feedback: ${unique}, planned tasks, storage and
// variants, selector diagnostics, public tasks, merged results and --pause, the working folder, flows_setup and
// empty screens, dark theme found without the flag, sessions kept between colour schemes, visible "undefined".
// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startApp } from "./fixtures/feedback-flows/server.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QP = join(ROOT, "plugins/core/scripts/sw.mjs");
const lib = (f) => import(`../plugins/core/scripts/lib/${f}`);
const fixture = () => { const dir = mkdtempSync(join(tmpdir(), "qp-ff-")); cpSync(join(ROOT, "tests/fixtures/app"), dir, { recursive: true }); return dir; };
const run = (cwd, args) => new Promise((resolve) => execFile("node", [QP, ...args], { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, env: { ...process.env, QP_NO_CALIBRATION: "1" } },
  (e, stdout, stderr) => resolve({ code: e?.code ?? 0, out: stdout ? JSON.parse(stdout) : null, stderr })));
const browser = async (t) => { const { loadBrowserTools } = await lib("browser.mjs"); if (await loadBrowserTools(ROOT)) return true; t.skip("Playwright not installed (run sw.mjs browser-setup)"); return false; };
const setProject = (dir, patch) => { const f = join(dir, ".quality/project.json"); writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, "utf8")), ...patch })); };
const seed = (url, n) => `node -e "fetch('${url}/api/seed?n=${n}')"`;
const login = [{ name: "Sign in", goto: "/login", login: true }, { fill: { selector: "role=textbox[name=\"Email\"]", value: "alice@example.com" }, login: true },
  { click: "role=button[name=\"Sign in\"]", login: true }];

test("flows: planned tasks, selector checks, ${unique} and merged results without a browser", async () => {
  const { validateFlows, selectorProblems, expandValue, mergeFlowResults, staleShots } = await lib("flows.mjs");
  // [23] a planned task needs no steps yet and is listed apart.
  const v = validateFlows({ flows: [{ id: "later", name: "Later", status: "planned" }, { id: "now", name: "Now", steps: [{ goto: "/" }] }, { id: "x", name: "X", status: "soon", steps: [{ goto: "/" }] }] });
  assert.deepEqual(v.planned, ["later"]);
  assert.equal(v.errors.length, 1, v.errors.join("\n"));
  assert.match(v.errors[0], /status/);
  // [30] what is surely broken is refused, a lost backslash is a warning.
  assert.match(selectorProblems("role=link[name=/F-d+/] >> nth=first").errors.join(), /nth=/);
  assert.match(selectorProblems("role=link[name=/F-d+/]").warnings.join(), /backslash/);
  assert.deepEqual(selectorProblems("role=link[name=/F-\\d+/] >> nth=0"), { errors: [], warnings: [] });
  assert.match(selectorProblems("role=button[name=\"Save\"").errors.join(), /unbalanced \[/);
  assert.match(selectorProblems("role=link[name=/F-(/]").errors.join(), /regular expression/);
  assert.deepEqual(selectorProblems("text=L'éditeur"), { errors: [], warnings: [] });
  const steps = validateFlows({ flows: [{ id: "a", name: "A", steps: [{ click: "role=button[name=\"Go\"" }], variants: [{ id: "Bad" }], storage: [] }] });
  assert.equal(steps.errors.length, 3, steps.errors.join("\n"));
  // [22] one value per run, the same for every step of that run.
  const vars = {};
  const a = expandValue("test+${unique}@example.com", vars);
  assert.equal(expandValue("${unique}", vars), vars.unique);
  assert.match(a, /^test\+[a-z0-9]{8,}@example\.com$/);
  assert.notEqual(expandValue("${unique}", {}), vars.unique);
  // [47] merged by task id, tasks no longer declared dropped, stale screenshots listed.
  const r = (id, shot) => ({ id, runs: [{ device: "desktop", scheme: "light", completed: true, steps: [{ index: 1, screenshot: shot }], summary: { axe_states_with_serious: 0 }, over_budget: [] }] });
  const merged = mergeFlowResults({ flows: [r("a", "a1.png"), r("b", "b1.png"), r("gone", "g.png")] }, { flows: [r("b", "b2.png"), r("c", "c1.png")], not_built: ["d"] }, new Set(["a", "b", "c"]));
  assert.deepEqual(merged.flows.map((f) => f.id), ["a", "b", "c"]);
  assert.equal(merged.summary.runs, 3);
  assert.deepEqual(merged.summary.not_built, ["d"]);
  assert.deepEqual(staleShots({ flows: [r("a", "a1.png"), r("b", "b1.png"), r("gone", "g.png")] }, merged).sort(), ["b1.png", "g.png"]);
});

test("flows --check: lists planned tasks and warns about a lost backslash", async () => {
  const dir = fixture();
  setProject(dir, { flows: [{ id: "list", name: "List", steps: [{ goto: "/" }, { click: "role=link[name=/F-d+/]" }] }, { id: "export", name: "Export", status: "planned" }] });
  const r = await run(dir, ["flows", "--check"]);
  assert.equal(r.out.ok, true);
  assert.deepEqual(r.out.planned, ["export"]);
  assert.match(r.out.warnings.join(), /backslash/);
  setProject(dir, { flows: [{ id: "list", name: "List", steps: [{ click: "role=link >> nth=x" }] }] });
  assert.equal((await run(dir, ["flows", "--check"])).out.ok, false);
});

test("flows: public task, fresh sign-ups, storage, dark found without the flag, one sign-in per device, merged runs", async (t) => {
  if (!(await browser(t))) return;
  const app = startApp();
  try {
    const dir = fixture();
    setProject(dir, { flags: ["has_ui", "has_auth"], urls: { local: app.url() }, flows_setup: seed(app.url(), 1), flows: [
      // [46] a task on a public page: no account, no sign-in. Its last screen shows "undefined".
      { id: "demo", name: "Try the demo", devices: ["desktop"], steps: [{ goto: "/" }, { click: "role=button[name=\"Try the demo\"]" }, { expect: "text=Demo works" }] },
      // [22] the address differs at every run: the second device and the dark scheme sign up again.
      { id: "signup", name: "Create an account", steps: [{ goto: "/signup" }, { fill: { selector: "role=textbox[name=\"Email\"]", value: "test+${unique}@example.com" } },
        { click: "role=button[name=\"Sign up\"]" }, { expect: { selector: "role=status", text: "Welcome test+" } }] },
      // [58] [54] [27] signed in once per device, data reset before each run, a theme set in localStorage.
      { id: "accept", name: "Accept a quote", setup: seed(app.url(), 1), storage: { theme: "registre" }, steps: [...login,
        { expect: { selector: "#theme", text: "registre" } }, { click: "role=button[name=\"Accept\"]" }, { expect: "text=Accepted" }] },
      { id: "variant", name: "Theme variants", devices: ["desktop"], variants: [{ id: "atelier", storage: { theme: "atelier" } }], steps: [...login, { expect: { selector: "#theme", text: "atelier" } }] },
      // [23]
      { id: "export", name: "Export a PDF", status: "planned" },
    ] });
    // [47] two batches with --run build one file; --pause between tasks.
    const first = await run(dir, ["flows", "demo", "signup", "--run", "2026-11-14", "--pause", "1"]);
    assert.equal(first.code, 0, first.stderr);
    assert.match(first.stderr, /pause 1 s/);
    // [55] no dark_mode flag, the page changes colours in dark: dark is played and said.
    assert.match(first.out.dark_theme, /dark_mode/);
    assert.equal(first.out.summary.completed, 6, JSON.stringify(first.out.summary));
    assert.ok(first.out.runs.some((r) => r.flow === "signup" && r.scheme === "dark"));
    assert.ok(app.state.users.size >= 4);
    // visible "undefined"
    assert.match(first.out.summary.suspect_texts.join(), /demo desktop step 3: "undefined"/);
    const loginsBefore = app.state.logins;
    const second = await run(dir, ["flows", "accept", "variant", "--run", "2026-11-14"]);
    assert.equal(second.code, 0, second.stderr);
    assert.equal(second.out.summary.completed, second.out.summary.runs, JSON.stringify(second.out.summary.failed));
    const file = JSON.parse(readFileSync(join(dir, ".quality/audits/2026-11-14/flows.json"), "utf8"));
    assert.deepEqual(file.flows.map((f) => f.id), ["demo", "signup", "accept", "variant"]);
    assert.deepEqual(file.summary.not_built, ["export"]);
    assert.ok(file.setup[0].ok);
    // 2 devices for accept + 1 for variant, each played light then dark on the same session.
    assert.equal(app.state.logins - loginsBefore, 3);
    const accept = file.flows.find((f) => f.id === "accept");
    assert.ok(accept.runs.find((r) => r.scheme === "dark").session_reused);
    assert.equal(accept.runs[0].storage.theme, "registre");
    assert.equal(accept.setup.length, 4);
    const variant = file.flows.find((f) => f.id === "variant");
    assert.deepEqual(variant.runs.map((r) => r.variant), ["atelier", "atelier"]);
    assert.ok(readdirSync(join(dir, ".quality/audits/2026-11-14/flows")).some((f) => f.startsWith("variant-desktop-atelier-dark")));

    // [57] without --run: the working folder, never the audit run.
    const before = readFileSync(join(dir, ".quality/audits/2026-11-14/flows.json"), "utf8");
    const work = await run(dir, ["flows", "demo"]);
    assert.equal(work.out.full_report, ".quality/flows/flows.json");
    assert.ok(existsSync(join(dir, ".quality/flows/.gitignore")));
    assert.equal(readFileSync(join(dir, ".quality/audits/2026-11-14/flows.json"), "utf8"), before);

    // [54] [30] without a reset, the second run finds an empty list and says so, with the selector and the count.
    setProject(dir, { flows: [{ id: "accept", name: "Accept a quote", devices: ["desktop"], steps: [...login, { click: "role=button[name=\"Accept\"]" }, { expect: "text=Accepted" }] }] });
    const empty = await run(dir, ["flows", "--replace"]);
    const failed = empty.out.runs.find((r) => !r.completed);
    assert.ok(failed, JSON.stringify(empty.out.runs));
    assert.match(failed.failed_step, /no element matches role=button\[name="Accept"\] on this screen \(0 found\); the screen looks empty \("Nothing to accept"\)/);
  } finally { app.server.close(); }
});
