// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compute } from "../plugins/core/scripts/lib/score.mjs";
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

test("referential has 27 domains and unique criterion ids", () => {
  const domains = allDomains(ref);
  assert.equal(domains.length, 27);
  const ids = domains.flatMap((d) => d.criteria.map((c) => c.id));
  assert.equal(new Set(ids).size, ids.length);
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
