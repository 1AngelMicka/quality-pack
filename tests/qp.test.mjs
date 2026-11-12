// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compute, toMarkdown } from "../plugins/core/scripts/lib/score.mjs";
import { validateFlows, expandFiles, summarizeRun, DEFAULT_BUDGETS } from "../plugins/core/scripts/lib/flows.mjs";
import { loadReferential, allDomains } from "../plugins/core/scripts/lib/ref.mjs";
import { parseHead } from "../plugins/core/scripts/lib/web.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QP = join(ROOT, "plugins/core/scripts/qp.mjs");
const GUARD = join(ROOT, "plugins/core/scripts/hooks/secrets-guard.mjs");
const ref = loadReferential();

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "qp-"));
  cpSync(join(ROOT, "tests/fixtures/app"), dir, { recursive: true });
  return dir;
}
const qp = (cwd, ...args) => JSON.parse(execFileSync("node", [QP, ...args], { cwd, encoding: "utf8" }));

test("referential has 35 domains, unique criterion ids, each domain in one score", () => {
  const domains = allDomains(ref);
  assert.equal(domains.length, 35);
  const ids = domains.flatMap((d) => d.criteria.map((c) => c.id));
  assert.equal(new Set(ids).size, ids.length);
  const placed = Object.values(ref.score_areas).flatMap((a) => a.domains);
  assert.deepEqual([...placed].sort(), domains.map((d) => d.id).sort());
  assert.ok(ids.includes(ref.scoring.review.criterion));
});

test("score: all pass gives 10, a failed blocker caps domain and overall", () => {
  const ids = allDomains(ref).flatMap((d) => d.criteria.map((c) => c.id));
  const all = Object.fromEntries(ids.map((id) => [id, { status: "pass", evidence: "x" }]));
  const flags = ["has_ui", "has_backend", "has_auth", "has_user_data", "has_db", "public_web"];
  const ok = compute({ profile: "webapp", flags, results: all }, ref);
  assert.equal(ok.global, 10);
  const bad = compute({ profile: "webapp", flags, results: { ...all, "SEC-01": { status: "fail" } } }, ref);
  assert.equal(bad.domains.find((d) => d.id === "security").score, 3);
  assert.equal(bad.global, ref.scoring.global_blocker_cap);
  const partial = compute({ profile: "webapp", flags, results: { ...all, "SEC-01": { status: "partial" } } }, ref);
  assert.equal(partial.open_blockers, 1, "a partial blocker counts as failed");
});

test("score: missing results count as unknown, na is excluded", () => {
  const r = compute({ profile: "vitrine", flags: ["has_ui", "public_web"], results: {} }, ref);
  assert.ok(r.issues.every((i) => i.status === "unknown"));
  assert.ok(r.global <= ref.scoring.global_blocker_cap);
  const pay = r.domains.find((d) => d.id === "payments");
  assert.equal(pay.score, null, "payments not applicable to a showcase site");
});

test("detect, plan, scan and assemble on the fixture", () => {
  const dir = fixture();
  const d = qp(dir, "detect");
  assert.equal(d.package_manager, "pnpm");
  assert.ok(d.stacks.includes("nextjs"));
  assert.equal(d.profile, "saas");
  const plan = qp(dir, "plan", "--date", "2026-01-01");
  assert.ok(plan.criteria_count > 100);
  const all = plan.groups.flatMap((g) => g.domains.flatMap((x) => x.criteria));
  assert.equal(all.find((c) => c.id === "COD-01").command, "pnpm exec tsc --noEmit && pnpm run build");
  assert.equal(all.find((c) => c.id === "SEC-06").evidence_from, "web.json");
  const scoped = qp(dir, "plan", "security-data", "--date", "2026-01-02");
  assert.deepEqual(scoped.groups.map((g) => g.group), ["security-data"]);

  const scan = qp(dir, "scan", "--date", "2026-01-01");
  assert.ok(scan.findings.placeholder_scan.some((f) => f.kind === "lorem ipsum"));
  assert.ok(scan.findings.slop_wording_scan.some((f) => /seamless/i.test(f.match)));
  assert.ok(scan.findings.debug_leftovers_scan.some((f) => f.kind === "console.log"));
  assert.ok(scan.findings.debug_leftovers_scan.some((f) => f.kind === "temporary file"));
  assert.ok(scan.findings.debug_leftovers_scan.some((f) => f.kind === "commented-out code"));

  const results = Object.fromEntries(all.map((c) => [c.id, { status: "pass", evidence: "ok" }]));
  results["CNT-01"] = { status: "fail", evidence: "app/page.tsx:4", fix: "Remove lorem ipsum" };
  results["UI-01"] = { status: "pass", evidence: "" };
  writeFileSync(join(dir, ".quality/audits/2026-01-01/parts/all.json"), JSON.stringify({ results }));
  const a1 = qp(dir, "assemble", "--date", "2026-01-01");
  assert.equal(a1.open_blockers, 1);
  assert.ok(a1.warnings.some((w) => w.includes("UI-01")), "pass without evidence is refused");
  assert.ok(existsSync(join(dir, ".quality/AUDIT.md")));

  writeFileSync(join(dir, ".quality/audits/2026-01-02/parts/security-data.json"),
    JSON.stringify({ results: { "SEC-01": { status: "pass", evidence: "gitleaks: 0" } } }));
  const a2 = qp(dir, "assemble", "--date", "2026-01-02");
  assert.ok(a2.carried_forward > 100, "scoped audit carries other results forward");
  assert.equal(a2.previous_global, a1.global);
  assert.match(readFileSync(join(dir, ".quality/AUDIT.md"), "utf8"), /Audit précédent : 2026-01-01/);
});

test("secrets guard blocks secrets and allows env files and env references", () => {
  const run = (input) => spawnSync("node", [GUARD], { input: JSON.stringify(input), encoding: "utf8" }).status;
  const key = "sk_live_" + "a1B2c3D4e5F6g7H8i9J0k1L2";
  assert.equal(run({ tool_input: { file_path: "/p/lib/pay.ts", content: `new Stripe("${key}")` } }), 2);
  assert.equal(run({ tool_input: { file_path: "/p/.env.local", content: `STRIPE=${key}` } }), 0);
  assert.equal(run({ tool_input: { file_path: "/p/a.ts", new_string: "const k = process.env.STRIPE_SECRET_KEY" } }), 0);
  assert.equal(run({ tool_input: { file_path: "/p/a.ts", edits: [{ new_string: "NEXT_PUBLIC_STRIPE_SECRET_KEY" }] } }), 2);
  assert.equal(run({ tool_input: { file_path: "/p/a.ts", content: `x = "${key}" // qp-allow-secret` } }), 0);
  assert.equal(run({ tool_input: { file_path: "/p/db.ts", content: "postgresql://app:S3cretPass99@db.prod.example.net/app" } }), 2);
  assert.equal(run({ tool_input: { file_path: "/p/db.ts", content: "postgresql://app:app12345@localhost:5432/app" } }), 0);
});

test("parseHead reads SEO metadata", () => {
  const h = parseHead(`<html lang="fr"><head><title>T</title><meta name="description" content="D">
    <link rel="canonical" href="https://x.fr/"><meta property="og:image" content="/og.png"><link rel="icon" href="/f.ico"></head><body><h1>A</h1></body></html>`);
  assert.equal(h.title, "T");
  assert.equal(h.description, "D");
  assert.equal(h.canonical, "https://x.fr/");
  assert.equal(h.og.image, "/og.png");
  assert.equal(h.lang, "fr");
  assert.equal(h.h1_count, 1);
});

test("run keeps the full log on disk and returns only the signal", () => {
  const dir = fixture();
  const cmd = `node -e "for (let i = 0; i < 2000; i++) console.log('ok test ' + i); console.log('FAIL pay.test.ts > refunds twice'); process.exitCode = 1"`;
  const r = qp(dir, "run", "tests", cmd);
  assert.equal(r.exit_code, 1);
  assert.ok(r.signal_lines.some((l) => l.includes("FAIL pay.test.ts")));
  assert.ok(r.tokens.saved > r.tokens.returned * 10);
  assert.ok(existsSync(join(dir, r.log)));
});

test("quick plan keeps only automatic checks", () => {
  const dir = fixture();
  const p = qp(dir, "plan", "quick");
  const all = p.groups.flatMap((g) => g.domains.flatMap((d) => d.criteria));
  assert.equal(p.mode, "quick");
  assert.ok(all.length > 0 && all.every((c) => c.method === "auto"));
});

test("incremental audit re-checks only changes and carries the rest", () => {
  const dir = fixture();
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const [d1, d2, d3] = [day(2), day(1), day(0)];
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: dir });
  git("init", "-q"); git("add", "-A"); git("commit", "-qm", "init");
  const full = qp(dir, "plan", "--incremental", "--date", d1);
  assert.equal(full.mode, "full", "first audit falls back to full");
  const ids = full.groups.flatMap((g) => g.domains.flatMap((d) => d.criteria.map((c) => c.id)));
  writeFileSync(join(dir, `.quality/audits/${d1}/parts/all.json`),
    JSON.stringify({ results: Object.fromEntries(ids.map((id) => [id, { status: "pass", evidence: "ok" }])) }));
  qp(dir, "assemble", "--date", d1);
  git("add", "-A"); git("commit", "-qm", "audit");
  const none = qp(dir, "plan", "--incremental", "--date", d2);
  assert.equal(none.mode, "incremental");
  assert.equal(none.incremental.no_changes, true);
  writeFileSync(join(dir, "components/New.tsx"), "export const x = 1\n");
  const inc = qp(dir, "plan", "--incremental", "--date", d3);
  assert.deepEqual(inc.incremental.changed_files, ["components/New.tsx"]);
  const res = Object.fromEntries(ids.map((id) => [id, { status: "carry" }]));
  res["COD-04"] = { status: "fail", evidence: "components/New.tsx:1", fix: "x" };
  writeFileSync(join(dir, `.quality/audits/${d3}/parts/all.json`), JSON.stringify({ results: res }));
  const a = qp(dir, "assemble", "--date", d3);
  assert.equal(a.mode, "incremental");
  assert.ok(a.carried_forward > 100);
  assert.deepEqual(a.warnings, []);
  assert.equal(JSON.parse(readFileSync(join(dir, `.quality/audits/${d3}.json`), "utf8")).results["COD-04"].status, "fail");
});

test("graph status reports size and advice without Graphify", () => {
  const dir = fixture();
  const g = qp(dir, "graph");
  assert.equal(g.project_size.tier, "small");
  assert.equal(typeof g.advice, "string");
});

const allPass = () => Object.fromEntries(allDomains(ref).flatMap((d) => d.criteria.map((c) => [c.id, { status: "pass", evidence: "x" }])));
const WEBAPP = ["has_ui", "has_backend", "has_auth", "has_user_data", "has_db", "public_web"];

test("two scores: a blocker caps only the score it belongs to", () => {
  const ops = compute({ profile: "webapp", flags: WEBAPP, results: { ...allPass(), "MON-01": { status: "fail" } } }, ref);
  assert.equal(ops.scores.operations.score, ref.scoring.global_blocker_cap);
  assert.equal(ops.scores.operations.capped, true);
  assert.equal(ops.scores.experience.score, 10, "a missing uptime probe does not cap the experience score");
  assert.equal(ops.global, ref.scoring.global_blocker_cap, "the overall score keeps its cap");
  const ux = compute({ profile: "webapp", flags: WEBAPP, results: { ...allPass(), "FEA-01": { status: "fail" } } }, ref);
  assert.equal(ux.scores.operations.score, 10);
  assert.equal(ux.scores.experience.capped, true);
  assert.equal(ux.issues[0].area, "experience");
  const md = toMarkdown(ops, ref, "fr");
  assert.match(md, /\*\*Expérience : 10,0\/10\*\*/);
  assert.match(md, /\*\*Technique et exploitation : 5,9\/10\*\* \(Insuffisant\) — plafonnée/);
  const api = compute({ profile: "api", flags: ["has_backend", "has_db"], results: allPass() }, ref);
  assert.equal(api.domains.find((d) => d.id === "ergonomics").score, null);
});

test("a second audit the same day gets its own run and compares with the first", () => {
  const dir = fixture();
  const p1 = qp(dir, "plan");
  const day = p1.run;
  assert.match(day, /^\d{4}-\d{2}-\d{2}$/);
  const ids = p1.groups.flatMap((g) => g.domains.flatMap((d) => d.criteria.map((c) => c.id)));
  const res = Object.fromEntries(ids.map((id) => [id, { status: "pass", evidence: "ok" }]));
  res["SEC-01"] = { status: "fail", evidence: "lib/a.ts:1", fix: "x" };
  writeFileSync(join(dir, `.quality/audits/${day}/parts/all.json`), JSON.stringify({ results: res }));
  const a1 = qp(dir, "assemble", "--run", day);
  const planBefore = readFileSync(join(dir, `.quality/audits/${day}/plan.json`), "utf8");
  const p2 = qp(dir, "plan", "blockers");
  assert.equal(p2.run, `${day}-2`, "a scoped audit after a full one does not reuse its folder");
  assert.equal(readFileSync(join(dir, `.quality/audits/${day}/plan.json`), "utf8"), planBefore, "the full audit's plan is untouched");
  assert.equal(qp(dir, "plan", "blockers").run, `${day}-2`, "an unused run folder is reused");
  writeFileSync(join(dir, `.quality/audits/${day}-2/parts/security-data.json`), JSON.stringify({ results: { "SEC-01": { status: "pass", evidence: "gitleaks: 0" } } }));
  qp(dir, "scan");
  assert.ok(existsSync(join(dir, `.quality/audits/${day}-2/scan.json`)), "later commands default to the latest run of the day");
  const a2 = qp(dir, "assemble");
  assert.equal(a2.run, `${day}-2`);
  assert.equal(a2.previous_run, day);
  assert.ok(a2.scores.operations.score > a1.scores.operations.score);
  assert.match(readFileSync(join(dir, ".quality/AUDIT.md"), "utf8"), new RegExp(`Audit précédent : ${day}\\b`));
  const st = qp(dir, "status", "--json");
  assert.equal(st.run, `${day}-2`);
  assert.ok(st.report_json.endsWith(`${day}-2.report.json`));
  assert.ok(readFileSync(join(dir, `.quality/audits/${day}-2/token-savings.json`), "utf8").includes("saved"), "scan counts its token savings");
});

test("counter-check only lowers results; review findings cap their criterion", () => {
  const dir = fixture();
  const p = qp(dir, "plan", "--run", "2026-02-01");
  const ids = p.groups.flatMap((g) => g.domains.flatMap((d) => d.criteria.map((c) => c.id)));
  const res = Object.fromEntries(ids.map((id) => [id, { status: "pass", evidence: "ok" }]));
  res["UX-02"] = { status: "fail", evidence: "e", fix: "f" };
  const parts = join(dir, ".quality/audits/2026-02-01/parts");
  writeFileSync(join(parts, "all.json"), JSON.stringify({ results: res }));
  writeFileSync(join(parts, "ergonomics.json"), JSON.stringify({ results: {}, findings: [
    { severity: "minor", problem: "small", fix: "a" },
    { severity: "major", problem: "settings over 6 screens", flow: "f", device: "desktop", step: 3, fix: "tabs" }] }));
  writeFileSync(join(parts, "challenge.json"), JSON.stringify({ results: {
    "UX-01": { status: "partial", evidence: "flows/x.png: preview off screen", fix: "fix" },
    "UX-02": { status: "pass", evidence: "looks fine" },
    "UX-03": { status: "fail", evidence: "" } } }));
  const a = qp(dir, "assemble", "--run", "2026-02-01");
  assert.deepEqual(a.challenged, [{ id: "UX-01", from: "pass", to: "partial" }]);
  assert.ok(a.warnings.some((w) => w.includes("UX-02") && w.includes("cannot raise")));
  assert.ok(a.warnings.some((w) => w.includes("UX-03") && w.includes("no evidence")));
  const audit = JSON.parse(readFileSync(join(dir, ".quality/audits/2026-02-01.json"), "utf8"));
  assert.equal(audit.results["UX-02"].status, "fail");
  assert.equal(audit.results["ERG-09"].status, "partial", "a major finding caps the review criterion at partial");
  assert.deepEqual(audit.review_findings.map((f) => [f.id, f.severity]), [["ERG-R01", "major"], ["ERG-R02", "minor"]]);
  const md = readFileSync(join(dir, ".quality/AUDIT.md"), "utf8");
  assert.match(md, /## Revue d'ergonomie/);
  assert.match(md, /ERG-R01 \| majeur \| settings over 6 screens \| f · desktop · #3 \| tabs/);
  assert.match(md, /## Contre-vérification[\s\S]*UX-01 : réussi → partiel/);
});

test("scan follows .gitignore and the CLI writes at the project root from a sub-folder", () => {
  const dir = fixture();
  mkdirSync(join(dir, "target/debug"), { recursive: true });
  writeFileSync(join(dir, "target/debug/gen.js"), "// lorem ipsum generated\nconsole.log(1)\n");
  writeFileSync(join(dir, ".gitignore"), "target/\n");
  execFileSync("git", ["init", "-q"], { cwd: dir });
  mkdirSync(join(dir, "src-tauri"), { recursive: true });
  const scan = JSON.parse(execFileSync("node", [QP, "scan", "--run", "2026-03-01"], { cwd: join(dir, "src-tauri"), encoding: "utf8" }));
  assert.ok(!scan.findings.placeholder_scan.some((f) => f.file.startsWith("target/")), "ignored files are not scanned");
  assert.ok(scan.findings.placeholder_scan.some((f) => f.file === "app/page.tsx"));
  assert.ok(existsSync(join(dir, ".quality/audits/2026-03-01/scan.json")));
  assert.ok(!existsSync(join(dir, "src-tauri/.quality")), "no .quality folder in the sub-folder");
});

test("detect: a UI with file input and no server is an app, not a showcase site", () => {
  const dir = mkdtempSync(join(tmpdir(), "qp-app-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "photo", dependencies: { react: "19.0.0", vite: "7.0.0" } }));
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src/App.tsx"), `export default () => <input type="file" accept="image/*" multiple />;\n`);
  const d = qp(dir, "detect");
  assert.equal(d.profile, "webapp");
  assert.ok(d.app_signals.some((s) => s.startsWith("file input")));
  const site = mkdtempSync(join(tmpdir(), "qp-site-"));
  writeFileSync(join(site, "index.html"), "<h1>Bakery</h1>");
  assert.equal(qp(site, "detect").profile, "vitrine");
});

test("flows: validation, file patterns and effort budgets", () => {
  assert.deepEqual(validateFlows({}).errors, []);
  const bad = validateFlows({ flows: [{ id: "A b", steps: [{ click: "x", fill: { selector: "y", value: 1 } }, { upload: { selector: "input" } }], devices: ["watch"] }] });
  assert.equal(bad.errors.length, 5, bad.errors.join("\n"));
  const ok = validateFlows({ flows: [{ id: "make", name: "Make", steps: [{ goto: "/" }, { click: "text=Go" }] }] });
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.flows[0].devices, ["mobile", "desktop"]);
  const dir = mkdtempSync(join(tmpdir(), "qp-fx-"));
  mkdirSync(join(dir, "photos"));
  for (const n of ["b.jpg", "a.jpg", "c.png"]) writeFileSync(join(dir, "photos", n), "x");
  assert.deepEqual(expandFiles(dir, ["photos/*.jpg"]).map((p) => p.split(/[\\/]/).pop()), ["a.jpg", "b.jpg"]);
  const step = (i, action, m) => ({ index: i, action, ok: true, scrolled_screens: m.scrolled || 0, metrics: { page_screens: m.page, controls_rendered: m.controls,
    controls_in_viewport: 10, disclosure: { tablists: 0, collapsibles: 0 }, horizontal_overflow: false, preview: m.preview, primary: m.primary } });
  const run = { device: "desktop", console: [], steps: [
    step(1, "goto", { page: 1, controls: 10 }),
    step(2, "click", { page: 6.4, controls: 85, scrolled: 3.5, preview: { found: true, visible_ratio: 0 }, primary: { found: true, visible_ratio: 0, center_y_ratio: 4 } }),
  ] };
  const r = summarizeRun(run, DEFAULT_BUDGETS);
  assert.equal(r.summary.max_page_screens, 6.4);
  assert.equal(r.summary.preview_visible_while_adjusting, 0);
  assert.equal(r.summary.primary_visible, false);
  assert.equal(r.over_budget.length, 3, r.over_budget.join("\n"));
  const app = fixture();
  const proj = JSON.parse(readFileSync(join(app, ".quality/project.json"), "utf8"));
  writeFileSync(join(app, ".quality/project.json"), JSON.stringify({ ...proj, flows: [{ id: "pay", name: "Pay", steps: [{ click: "text=Pay" }] }] }));
  assert.equal(qp(app, "flows", "--check").ok, true);
  assert.deepEqual(qp(app, "plan").flows.declared.map((f) => f.id), ["pay"]);
});

test("record: Playwright codegen output becomes flow steps", async () => {
  const { parseCodegen } = await import("../plugins/core/scripts/lib/record.mjs");
  const code = `import { test, expect } from '@playwright/test';
test('test', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: 'Add photos' }).click();
  await page.getByLabel('Photos').setInputFiles(['beach.jpg', 'C:\\\\Users\\\\me\\\\dog.jpg']);
  await page.getByRole('tab', { name: 'Layout', exact: true }).click();
  await page.getByPlaceholder('Title').click();
  await page.getByPlaceholder('Title').fill('Summer');
  await page.getByPlaceholder('Title').fill('Summer 2026');
  await page.getByPlaceholder('Title').press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).first().click();
  await page.getByTestId('size').selectOption('large');
  await expect(page.getByText('Saved')).toBeVisible();
  await page.keyboard.press('Escape');
  const page1Promise = page.waitForEvent('popup');
  await page1.close();
});`;
  const { steps, warnings } = parseCodegen(code, { base: "http://localhost:5173" });
  assert.deepEqual(steps, [
    { goto: "/" },
    { click: 'role=button[name="Add photos"]' },
    { upload: { selector: 'internal:label="Photos"i', files: [".quality/fixtures/beach.jpg", ".quality/fixtures/dog.jpg"] } },
    { click: 'role=tab[name="Layout"s]' },
    { click: 'internal:attr=[placeholder="Title"i]' },
    { fill: { selector: 'internal:attr=[placeholder="Title"i]', value: "Summer 2026" } },
    { press: { selector: 'internal:attr=[placeholder="Title"i]', key: "Enter" } },
    { click: 'role=dialog >> role=button[name="Save"] >> nth=0' },
    { select: { selector: 'internal:testid=[data-testid="size"s]', value: "large" } },
    { expect: "text=Saved" },
    { press: "Escape" },
  ]);
  assert.ok(warnings.some((w) => w.includes("fixtures")));
  const dir = fixture();
  const rec = join(dir, "rec.js");
  writeFileSync(rec, code);
  const r = qp(dir, "record", "make-collage", "--name", "Make a collage", "--from", rec);
  assert.deepEqual(r.errors, []);
  const proj = JSON.parse(readFileSync(join(dir, ".quality/project.json"), "utf8"));
  assert.equal(proj.flows.find((f) => f.id === "make-collage").steps.length, 11);
  assert.ok(existsSync(join(dir, ".quality/recordings/make-collage.js")));
});

test("assemble writes a local HTML report with both scores", () => {
  const dir = fixture();
  const p = qp(dir, "plan", "--run", "2026-06-01");
  const ids = p.groups.flatMap((g) => g.domains.flatMap((d) => d.criteria.map((c) => c.id)));
  writeFileSync(join(dir, ".quality/audits/2026-06-01/parts/all.json"),
    JSON.stringify({ results: Object.fromEntries(ids.map((id) => [id, { status: "pass", evidence: "ok" }])), findings: [{ severity: "major", problem: "Endless <page>", fix: "Tabs" }] }));
  const a = qp(dir, "assemble", "--run", "2026-06-01");
  assert.equal(a.html_report.split(/[\\/]/).join("/"), ".quality/report.html");
  const html = readFileSync(join(dir, ".quality/report.html"), "utf8");
  assert.match(html, /<html lang="fr">/);
  assert.match(html, /Expérience/);
  assert.match(html, /Technique et exploitation/);
  assert.match(html, /Endless &lt;page&gt;/, "findings are escaped");
  assert.match(html, /Aucune tâche clé jouée/);
  assert.equal(qp(dir, "report").run, "2026-06-01");
});

test("tokens: DTCG references, units, tiers, contrast per theme and gamut", async () => {
  const { checkTokens, contrast, parseColor } = await import("../plugins/core/scripts/lib/tokens.mjs");
  assert.equal(contrast(parseColor("#fff"), parseColor("#000")), 21);
  assert.equal(contrast(parseColor("#777777"), parseColor("#ffffff")), 4.47, "4.48 is truncated, never rounded up to pass");
  assert.deepEqual(parseColor("oklch(1 0 0)").map((x) => Math.round(x * 1000) / 1000), [1, 1, 1]);
  const doc = {
    primitive: { $type: "color", gray: { 1: { $value: { colorSpace: "oklch", components: [0.99, 0, 0] } }, 11: { $value: "#6f6f6f" }, 12: { $value: "oklch(0.2 0 0)" } }, green: { $value: "oklch(0.7 0.3 145)" } },
    light: { $type: "color", bg: { $value: "{primitive.gray.1}" }, text: { $value: "{primitive.gray.12}" }, border: { $value: "#e5e5e5" } },
    dark: { $type: "color", bg: { $value: "{primitive.gray.12}" }, text: { $value: "{primitive.gray.1}" } },
    space: { $type: "dimension", 2: { $value: { value: 8, unit: "px" } }, bad: { $value: "8px" } },
    component: { button: { $type: "color", bg: { $value: "{light.text}" }, oops: { $value: "{missing.x}" } } },
    loop: { a: { $type: "color", $value: "{loop.b}" }, b: { $type: "color", $value: "{loop.a}" } },
  };
  const r = checkTokens(doc);
  assert.ok(r.errors.some((e) => e.includes("unresolved reference {missing.x}")));
  assert.ok(r.errors.some((e) => e.startsWith("circular reference")));
  assert.ok(r.errors.some((e) => e.startsWith("space.bad")));
  assert.deepEqual(r.out_of_srgb, ["primitive.green"]);
  assert.equal(r.contrast.pairs, 3);
  assert.deepEqual(r.contrast.rows.filter((x) => !x.ok).map((x) => [x.theme, x.fg, x.need]), [["light", "light.border", 3]]);
  const dir = mkdtempSync(join(tmpdir(), "qp-tok-"));
  mkdirSync(join(dir, ".quality"));
  writeFileSync(join(dir, ".quality/project.json"), JSON.stringify({ name: "t", profile: "webapp", flags: ["has_ui"] }));
  writeFileSync(join(dir, "colors.tokens.json"), JSON.stringify({ light: doc.light, primitive: doc.primitive }));
  const cli = spawnSync("node", [QP, "tokens"], { cwd: dir, encoding: "utf8" });
  assert.equal(cli.status, 2, "a failing contrast pair exits with code 2");
  assert.deepEqual(JSON.parse(cli.stdout).files, ["colors.tokens.json"]);
});

test("look: the redesign guard lists controls lost since the baseline", async () => {
  const { compareInventory } = await import("../plugins/core/scripts/lib/look.mjs");
  const r = compareInventory(["button: Save", "link: Help", "field: Title"], ["button: Save", "field: Title", "button: Share"]);
  assert.deepEqual(r.missing, ["link: Help"]);
  assert.equal(r.added, 1);
});

test("deslop: spacing audit flags the generic page and passes the clean one", (t) => {
  const dir = fixture();
  const page = (f) => join(ROOT, "tests/fixtures/deslop", f);
  const run = (f) => spawnSync("node", [QP, "deslop", page(f), "--widths", "375,1440", "--run", "2026-07-01"], { cwd: dir, encoding: "utf8" });
  const slop = run("slop.html");
  if (slop.status !== 0 && /Chrome or Edge not found/.test(slop.stderr)) return t.skip("no Chrome or Edge installed");
  if (slop.status !== 0 && /needs Node 22/.test(slop.stderr)) return t.skip("Node 22 or later needed for qp deslop");
  assert.equal(slop.status, 0, slop.stderr);
  const s = JSON.parse(slop.stdout);
  assert.ok(s.total.high > 0);
  const rules = new Set(s.widths.flatMap((w) => w.findings.map((f) => f.rule)));
  for (const r of ["gradient-text", "emoji-icons", "glow-shadow", "nested-cards", "placeholder-copy", "off-scale"]) assert.ok(rules.has(r), `${r} found`);
  assert.ok(existsSync(join(dir, ".quality/audits/2026-07-01/deslop.json")));
  assert.ok(existsSync(join(dir, s.widths[0].screenshots.fold)));
  const clean = JSON.parse(run("clean.html").stdout);
  assert.deepEqual(clean.total, { high: 0, med: 0, low: 0 });
  // wide screens: the clean page stays clean, and text squeezed by a growing gutter is caught at 1920 only
  const wide = (f) => JSON.parse(spawnSync("node", [QP, "deslop", page(f), "--widths", "1440,1920", "--run", "2026-07-01"], { cwd: dir, encoding: "utf8" }).stdout);
  assert.deepEqual(wide("clean.html").total, { high: 0, med: 0, low: 0 });
  const sq = wide("squeezed.html");
  const squeezedAt = (w) => sq.widths.find((x) => x.width === w).findings.some((f) => f.rule === "text-squeezed");
  assert.equal(squeezedAt(1440), false, "readable at 1440");
  assert.equal(squeezedAt(1920), true, "squeezed at 1920");
});

test("flows: effort is estimated with the keystroke-level model", async () => {
  const { klmSeconds } = await import("../plugins/core/scripts/lib/flows.mjs");
  assert.equal(klmSeconds([{ action: "click" }]), 1.2);
  assert.equal(klmSeconds([{ action: "click", decision: true, scrolled_screens: 2 }]), 4.8);
  assert.equal(klmSeconds([{ action: "fill", chars: 10 }]), 4.8);
});

test("look: weighted generic signals, strict only on persuasive pages", async (t) => {
  const { loadBrowserTools } = await import("../plugins/core/scripts/lib/browser.mjs");
  if (!(await loadBrowserTools(ROOT))) return t.skip("Playwright not installed (run qp.mjs browser-setup)");
  const url = (f) => pathToFileURL(join(ROOT, "tests/fixtures/look", f)).href;
  const look = (f, mode) => new Promise((resolve, reject) => import("node:child_process").then(({ execFile }) =>
    execFile("node", [QP, "look", url(f), "--mode", mode], { cwd: ROOT, encoding: "utf8" }, (e, out) => (e ? reject(e) : resolve(JSON.parse(out).pages[0])))));
  const generic = await look("generic.html", "persuade");
  assert.equal(generic.tier, "strong");
  for (const id of ["LOOK-FONT", "LOOK-VIOLET", "LOOK-GRADTEXT", "LOOK-TRIPLETS", "LOOK-BADGE", "LOOK-EYEBROWS", "LOOK-EMOJI", "LOOK-COPY"]) {
    assert.ok(generic.signals.some((s) => s.id === id), `${id} detected`);
  }
  const operate = await look("generic.html", "operate");
  assert.ok(operate.counted.every((id) => operate.signals.find((s) => s.id === id).kind === "quality"), "operate mode ignores layout conventions");
  assert.equal(operate.checks.accent_share.ok, false, "a violet gradient hero is too much accent for an app screen");
  assert.equal(operate.checks.reduced_motion.ok, false, "animations that ignore reduced motion are caught");
  const bad = await look("scroll-bad.html", "read");
  assert.equal(bad.checks.scroll_hijack.ok, false, "a non-passive wheel listener hijacks scrolling");
  assert.equal(bad.checks.content_without_animation.ok, false, "text that only appears through an animation stays hidden with reduced motion");
  const good = await look("scroll-good.html", "read");
  assert.equal(good.checks.scroll_hijack.ok, true);
  assert.equal(good.checks.content_without_animation.ok, true);
  const plain = await look("plain.html", "persuade");
  assert.equal(plain.tier, "low", JSON.stringify(plain.signals));
  assert.equal(plain.checks.line_length.ok, true);
  assert.equal(plain.checks.targets_24.ok, true);
});

test("flows play in a real browser when Playwright is available", async (t) => {
  const { loadBrowserTools } = await import("../plugins/core/scripts/lib/browser.mjs");
  if (!(await loadBrowserTools(ROOT))) return t.skip("Playwright not installed (run qp.mjs browser-setup)");
  const { createServer } = await import("node:http");
  const { execFile } = await import("node:child_process");
  const settings = Array.from({ length: 60 }, (_, i) => `<label>Setting ${i} <input name="s${i}"></label><br>`).join("");
  const html = `<!doctype html><html lang="en"><title>T</title><body><main><h1>Editor</h1><div id="preview" style="height:300px">Preview</div>
    <input type="file" id="f" aria-label="Photos"><button onclick="document.getElementById('done').hidden=false">Save</button>${settings}<p id="done" hidden>Saved</p></main></body></html>`;
  const server = createServer((_, res) => { res.setHeader("content-type", "text/html"); res.end(html); }).listen(0);
  try {
    const dir = fixture();
    mkdirSync(join(dir, ".quality/fixtures"), { recursive: true });
    writeFileSync(join(dir, ".quality/fixtures/a.jpg"), "x");
    const proj = JSON.parse(readFileSync(join(dir, ".quality/project.json"), "utf8"));
    writeFileSync(join(dir, ".quality/project.json"), JSON.stringify({ ...proj, urls: { local: `http://localhost:${server.address().port}` },
      flows: [{ id: "save", name: "Save", preview: "#preview", primary: "role=button[name=\"Save\"]", steps: [
        { goto: "/" }, { upload: { selector: "#f", files: [".quality/fixtures/*.jpg"] } }, { fill: { selector: "internal:label=\"Setting 59\"i", value: "v" } },
        { click: "role=button[name=\"Save\"]" }, { expect: "text=Saved" }] }] }));
    const r = await new Promise((resolve, reject) => execFile("node", [QP, "flows", "--run", "2026-04-01"], { cwd: dir, encoding: "utf8" },
      (e, stdout) => (e ? reject(e) : resolve(JSON.parse(stdout)))));
    assert.equal(r.summary.completed, 2, JSON.stringify(r.summary));
    const desktop = r.runs.find((x) => x.device === "desktop");
    assert.ok(desktop.max_controls_rendered >= 60);
    assert.ok(desktop.over_budget.some((o) => o.includes("controls")));
    const full = JSON.parse(readFileSync(join(dir, ".quality/audits/2026-04-01/flows.json"), "utf8"));
    assert.ok(full.flows[0].runs[0].steps.every((s) => s.screenshot && !/^[A-Z]:|^\//.test(s.screenshot) && existsSync(join(dir, s.screenshot))));
    assert.ok(readdirSync(join(dir, ".quality/audits/2026-04-01/flows")).length >= 10);
  } finally { server.close(); }
});

test("access: a resource another account can read is reported as a leak", async () => {
  const { createServer } = await import("node:http");
  const { execFile } = await import("node:child_process");
  const { validateAccess, verdict } = await import("../plugins/core/scripts/lib/access.mjs");
  assert.ok(validateAccess({ access: { accounts: { a: { headers: { x: "1" } } }, checks: [] } }).errors.length >= 2);
  assert.equal(verdict({ method: "GET" }, { status: 302, location: "/login", body: "" }).verdict, "denied");
  assert.equal(verdict({ method: "GET" }, { status: 200, body: "<html>app</html>", bytes: 16 }, { status: 200, body: "{}" }).verdict, "unclear");
  // Notes API: note 1 checks its owner, note 2 forgets to (the classic bug), /admin only checks that someone is logged in.
  const notes = { 1: { owner: "alice", text: "alice-private-1" }, 2: { owner: "alice", text: "alice-private-2" } };
  const server = createServer((req, res) => {
    const user = /user=(\w+)/.exec(req.headers.cookie || "")?.[1] || (req.headers.authorization || "").replace("Bearer token-", "") || null;
    const send = (code, body) => { res.statusCode = code; res.setHeader("content-type", "application/json"); res.end(JSON.stringify(body)); };
    const m = /^\/api\/notes\/(\d)$/.exec(req.url);
    if (m) {
      const n = notes[m[1]];
      if (!user) return send(401, { error: "login" });
      if (!n) return send(404, { error: "not found" });
      if (m[1] === "1" && n.owner !== user) return send(404, { error: "not found" });
      if (req.method === "DELETE") return send(200, { deleted: true });
      return send(200, n);
    }
    if (req.url === "/admin") return user ? send(200, { users: ["alice", "bob"], marker: "admin-only" }) : (res.statusCode = 302, res.setHeader("location", "/login"), res.end());
    send(404, {});
  }).listen(0);
  try {
    const dir = fixture();
    const proj = JSON.parse(readFileSync(join(dir, ".quality/project.json"), "utf8"));
    writeFileSync(join(dir, ".quality/project.json"), JSON.stringify({ ...proj, urls: { local: `http://localhost:${server.address().port}` },
      access: { accounts: { alice: { cookies: { user: "alice" } }, bob: { headers: { Authorization: "Bearer token-${env:QP_TEST_BOB}" } } },
        checks: [
          { id: "note-ok", path: "/api/notes/1", owner: "alice", denied_to: ["bob", "anonymous"], secret: "alice-private-1" },
          { id: "note-leak", path: "/api/notes/2", owner: "alice", denied_to: ["bob", "anonymous"] },
          { id: "note-delete", method: "DELETE", path: "/api/notes/2", owner: "alice", denied_to: ["bob"] },
          { id: "admin", path: "/admin", owner: "alice", denied_to: ["bob", "anonymous"], secret: "admin-only" },
          { id: "broken-setup", path: "/api/notes/9", owner: "alice", denied_to: ["bob"] }] } }));
    const r = await new Promise((resolve) => execFile("node", [QP, "access", "--run", "2026-05-01"], { cwd: dir, encoding: "utf8", env: { ...process.env, QP_TEST_BOB: "bob" } },
      (e, stdout) => resolve({ code: e?.code ?? 0, out: JSON.parse(stdout) })));
    assert.equal(r.code, 2);
    const by = Object.fromEntries(r.out.checks.map((c) => [c.id, c]));
    assert.equal(by["note-ok"].attempts, "bob: denied, anonymous: denied");
    assert.equal(by["note-leak"].attempts, "bob: leak, anonymous: denied");
    assert.equal(by["note-delete"].attempts, "bob: leak");
    assert.equal(by.admin.attempts, "bob: leak, anonymous: denied");
    assert.match(by["broken-setup"].setup_error, /HTTP 404/);
    assert.equal(r.out.summary.leaks.length, 3);
    assert.ok(existsSync(join(dir, ".quality/audits/2026-05-01/access.json")));
    // Production is refused unless the user agreed.
    writeFileSync(join(dir, ".quality/project.json"), JSON.stringify({ ...JSON.parse(readFileSync(join(dir, ".quality/project.json"), "utf8")), urls: { production: `http://localhost:${server.address().port}` } }));
    const p = await new Promise((resolve) => execFile("node", [QP, "access", "--base", `http://localhost:${server.address().port}`], { cwd: dir, encoding: "utf8", env: { ...process.env, QP_TEST_BOB: "bob" } },
      (e, stdout) => resolve(JSON.parse(stdout))));
    assert.match(p.errors[0], /production/);
  } finally { server.close(); }
});
