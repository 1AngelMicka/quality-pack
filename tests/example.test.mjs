// End to end on the reference project (examples/facto): the pack's commands are run on its draft state, where
// every planted defect must be found, and on its careful state, which must pass. Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QP = join(ROOT, "plugins/core/scripts/sw.mjs");
const run = (cwd, args) => new Promise((resolve) => execFile("node", [QP, ...args], { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, env: { ...process.env, QP_NO_CALIBRATION: "1" } },
  (e, stdout, stderr) => resolve({ code: e?.code ?? 0, out: stdout ? JSON.parse(stdout) : null, stderr })));

// Start Facto in one state on a free port, with its own copy of the project folder.
async function start(draft) {
  const dir = mkdtempSync(join(tmpdir(), "qp-facto-"));
  cpSync(join(ROOT, "examples/facto"), dir, { recursive: true });
  const port = 4400 + Math.floor(Math.random() * 1500);
  const child = spawn(process.execPath, [join(dir, "server.mjs")], { env: { ...process.env, PORT: String(port), FACTO_DRAFT: draft ? "1" : "" }, stdio: ["ignore", "pipe", "inherit"] });
  await new Promise((resolve, reject) => { child.stdout.once("data", resolve); child.once("exit", () => reject(new Error("Facto did not start"))); });
  const base = `http://localhost:${port}`;
  const f = join(dir, ".quality/project.json");
  writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, "utf8")), urls: { local: base } }));
  return { dir, base, stop: () => child.kill() };
}

async function audit(app, runId) {
  const r = {};
  r.flows = await run(app.dir, ["flows", "--run", runId]);
  r.access = await run(app.dir, ["access", "--run", runId]);
  r.webhooks = await run(app.dir, ["webhooks", "--run", runId]);
  r.seo = await run(app.dir, ["seo", app.base, "--run", runId]);
  r.craft = await run(app.dir, ["craft", `${app.base}/login`, "--run", runId]);
  r.stress = await run(app.dir, ["stress", `${app.base}/demo`, "--run", runId]);
  r.facts = await run(app.dir, ["facts", `${app.base}/`, "--run", runId]);
  r.threats = await run(app.dir, ["threats"]);
  // Last: it sends wrong passwords and may lock the test account.
  r.auth = await run(app.dir, ["auth", "--run", runId]);
  return r;
}

test("reference project: every defect planted in the draft is found, and the careful version passes", async (t) => {
  const { loadBrowserTools } = await import("../plugins/core/scripts/lib/browser.mjs");
  if (!(await loadBrowserTools(ROOT))) return t.skip("Playwright not installed (run sw.mjs browser-setup)");
  const has = (list, ...ids) => ids.forEach((id) => assert.ok(list.includes(id), `expected ${id} in ${JSON.stringify(list)}`));

  const draft = await start(true);
  let d;
  try { d = await audit(draft, "2026-11-01"); } finally { draft.stop(); }
  // The draft works when all goes well: both key tasks complete on phone and desktop.
  assert.equal(d.flows.out.summary.completed, 4, JSON.stringify(d.flows.out.summary));
  // Another customer reads the invoice.
  assert.equal(d.access.code, 2);
  assert.ok(d.access.out.summary.leaks.some((l) => l.startsWith("invoice as bob")), JSON.stringify(d.access.out.summary));
  has(d.auth.out.summary.must_failed, "account_enumeration", "login_rate_limit");
  has(d.webhooks.out.summary.must_failed, "webhooks_stripe_unsigned", "webhooks_stripe_forged");
  has(d.seo.out.summary.must_failed, "sitemap_present", "description_present", "title_unique", "keywords_on_page");
  const dc = d.craft.out.pages[0].summary.must_failed;
  has(dc, "focus_visible", "input_font_size", "favicon");
  // A local address: the soft 404 is to check in preproduction, not a failure of the draft.
  has(d.craft.out.pages[0].summary.to_check_in_preproduction || [], "not_found_status");
  has(d.stress.out.summary.must_failed, "failing_no_crash", "long_no_overflow", "narrow_reflow");
  has(d.stress.out.summary.should_failed, "slow_indicator", "failing_message");
  assert.ok(d.facts.out.summary.untraced >= 3, JSON.stringify(d.facts.out.summary));
  assert.ok(["figure", "quote", "badge"].every((k) => d.facts.out.summary.by_kind[k] >= 1), JSON.stringify(d.facts.out.summary.by_kind));

  const careful = await start(false);
  let c;
  try { c = await audit(careful, "2026-11-02"); } finally { careful.stop(); }
  assert.equal(c.flows.out.summary.completed, 4, JSON.stringify(c.flows.out.summary));
  assert.deepEqual(c.flows.out.summary.over_budget, []);
  assert.equal(c.access.code, 0, JSON.stringify(c.access.out.summary));
  assert.deepEqual(c.access.out.summary.leaks, []);
  assert.equal(c.access.out.summary.denied, 3);
  assert.deepEqual(c.auth.out.summary.must_failed, [], JSON.stringify(c.auth.out.checks));
  assert.deepEqual(c.webhooks.out.summary.must_failed, []);
  // Ready to be found; only the step a person must do is left.
  assert.deepEqual(c.seo.out.summary.must_failed, ["search_console"], JSON.stringify(c.seo.out.failed));
  assert.ok(c.seo.out.keywords.every((k) => k.ok));
  assert.deepEqual(c.craft.out.pages[0].summary.must_failed, [], JSON.stringify(c.craft.out.pages[0].failed));
  assert.deepEqual(c.stress.out.summary.must_failed, [], JSON.stringify(c.stress.out.failed));
  assert.equal(c.facts.out.summary.untraced, 0, JSON.stringify(c.facts.out.pages[0].claims));
  assert.equal(c.threats.code, 0, JSON.stringify(c.threats.out));
});
