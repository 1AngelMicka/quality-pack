#!/usr/bin/env node
// quality-pack CLI. Zero dependencies, Node 18+.
//
//   node qp.mjs detect                       Guess stacks, flags and profile for /qp:kickoff
//   node qp.mjs stacks                       List installed qp stack modules
//   node qp.mjs plan [scope...]              Applicable criteria for /qp:audit, written to .quality/audits/<date>/plan.json
//   node qp.mjs scan                         Static scans of the source (placeholder, hollow wording, debug leftovers)
//   node qp.mjs web <url>                    HTTP checks: headers, compression, cache, SEO metadata, robots, sitemap
//   node qp.mjs browser <url> [url...]       Playwright checks at 5 widths (uses the project's Playwright)
//   node qp.mjs assemble [--date D]          Merge agent results, score, write .quality/AUDIT.md
//   node qp.mjs score <audit.json> [--previous old.json] [--lang fr|en]
//   node qp.mjs status                       One-line summary of the latest audit
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { loadReferential, loadProject, findStacks, qualityDir, resolveFlags, applies, today, allDomains } from "./lib/ref.mjs";
import { compute, toMarkdown, grade } from "./lib/score.mjs";

const ref = loadReferential();
const cwd = process.cwd();
const [cmd, ...rest] = process.argv.slice(2);
const opt = (name, def = null) => { const i = rest.indexOf(`--${name}`); if (i === -1) return def; const v = rest[i + 1]; rest.splice(i, 2); return v; };
const out = (obj) => process.stdout.write(JSON.stringify(obj, null, 2) + "\n");
const die = (msg) => { process.stderr.write(msg + "\n"); process.exit(1); };
const auditsDir = () => join(qualityDir(cwd), "audits");

function requireProject() {
  const p = loadProject(cwd);
  if (!p) die("No .quality/project.json in this directory. Run /qp:kickoff first.");
  if (!ref.profiles[p.profile]) die(`Unknown profile "${p.profile}" in .quality/project.json (${Object.keys(ref.profiles).join(", ")}).`);
  return p;
}

function auditFiles() {
  if (!existsSync(auditsDir())) return [];
  return readdirSync(auditsDir()).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
}

function loadAudit(date) {
  const f = join(auditsDir(), `${date}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

function plan(scope, date) {
  const project = requireProject();
  const found = findStacks(cwd);
  const declared = project.stacks || [];
  const stacks = declared.length ? found.filter((s) => declared.includes(s.stack)) : found;
  const appUrl = project.urls?.production || project.urls?.staging || project.urls?.local || "";
  let host = "";
  try { host = appUrl ? new URL(appUrl).host : ""; } catch { /* invalid URL */ }
  const fill = (cmd) => cmd.replaceAll("{pm}", project.package_manager || "npm").replaceAll("{url}", appUrl || "{url}").replaceAll("{host}", host || "{host}");
  const flags = resolveFlags(project.flags, ref);
  const profile = ref.profiles[project.profile];
  const tokens = new Set(scope.map((s) => s.toLowerCase()));
  const inScope = (g, d, c) => !tokens.size || tokens.has(g.group) || tokens.has(d.id) || tokens.has(c.id.toLowerCase())
    || (tokens.has("blockers") && c.severity === "blocker");
  const qp = fileURLToPath(import.meta.url);
  const groups = [];
  let count = 0;
  for (const g of ref.groups) {
    const domains = [];
    for (const d of g.domains) {
      if (!(profile.weights[d.id] > 0) || !applies(d, flags)) continue;
      const criteria = [];
      for (const c of d.criteria) {
        if (!applies(c, flags) || !inScope(g, d, c)) continue;
        const item = { id: c.id, severity: c.severity, label: c.label.en, verify: c.verify.en, method: c.check.method };
        if (c.check.tool) {
          item.tool = c.check.tool;
          const provider = ref.checks[c.check.tool]?.provider;
          const st = stacks.find((s) => s.checks?.[c.check.tool]);
          if (st) Object.assign(item, { command: fill(st.checks[c.check.tool].run), pass_if: st.checks[c.check.tool].pass_if, from_stack: st.stack });
          if (provider === "core") item.evidence_from = { placeholder_scan: "scan.json", slop_wording_scan: "scan.json", debug_leftovers_scan: "scan.json",
            headers_check: "web.json", seo_scan: "web.json", cookie_scan: "browser.json", axe: "browser.json", viewport_screenshots: "browser.json",
            console_check: "browser.json", contrast_check: "browser.json (axe color-contrast)" }[c.check.tool] || "run it yourself (see verify)";
          else if (!st) item.note = "No installed stack module maps this check: find the project's equivalent command or inspect, and say so in the evidence.";
        }
        criteria.push(item);
        count++;
      }
      if (criteria.length) domains.push({ id: d.id, label: d.label.en, criteria });
    }
    if (domains.length) groups.push({ group: g.group, label: g.label.en, domains });
  }
  const dir = join(auditsDir(), date);
  mkdirSync(join(dir, "parts"), { recursive: true });
  const result = { date, out_dir: relative(cwd, dir), qp_cli: qp, project: project.name, profile: project.profile,
    language: project.language || "fr", flags: [...flags].sort(), urls: project.urls || {}, scope: [...tokens],
    stacks: stacks.map((s) => ({ stack: s.stack, plugin: s.plugin })),
    missing_stack_modules: declared.filter((s) => !found.some((x) => x.stack === s)),
    package_manager: project.package_manager || null, criteria_count: count, groups };
  writeFileSync(join(dir, "plan.json"), JSON.stringify(result, null, 2));
  return result;
}

function assemble() {
  const project = requireProject();
  const date = opt("date", today());
  const dir = join(auditsDir(), date);
  const partsDir = join(dir, "parts");
  if (!existsSync(partsDir)) die(`No ${relative(cwd, partsDir)}: run the audit first.`);
  const known = new Map(allDomains(ref).flatMap((d) => d.criteria.map((c) => [c.id, c])));
  const results = {};
  const warnings = [];
  for (const f of readdirSync(partsDir).filter((x) => x.endsWith(".json"))) {
    let part;
    try { part = JSON.parse(readFileSync(join(partsDir, f), "utf8")); } catch (e) { warnings.push(`${f}: invalid JSON (${e.message})`); continue; }
    for (const [id, r] of Object.entries(part.results || {})) {
      if (!known.has(id)) { warnings.push(`${f}: unknown criterion ${id}`); continue; }
      if (!["pass", "partial", "fail", "unknown", "na"].includes(r.status)) { warnings.push(`${f}: ${id} has invalid status "${r.status}"`); continue; }
      if (r.status === "pass" && !String(r.evidence || "").trim()) { warnings.push(`${f}: ${id} passed without evidence, counted as unknown`); r.status = "unknown"; }
      results[id] = { status: r.status, evidence: r.evidence || "", fix: r.fix || "" };
    }
  }
  // Carry forward results of criteria not re-checked in this run (scoped audits).
  const files = auditFiles();
  const sameDay = loadAudit(date);
  const prevFile = files.filter((f) => f < `${date}.json`).pop();
  const previous = prevFile ? JSON.parse(readFileSync(join(auditsDir(), prevFile), "utf8")) : null;
  const base = sameDay || previous;
  let carried = 0;
  if (base) for (const [id, r] of Object.entries(base.results || {})) {
    if (!(id in results)) { results[id] = { ...r, carried_from: r.carried_from || base.date }; carried++; }
  }
  const audit = { date, project: project.name, profile: project.profile, flags: project.flags, pack_version: ref.version, results };
  writeFileSync(join(auditsDir(), `${date}.json`), JSON.stringify(audit, null, 2));
  const lang = opt("lang", project.language || "fr");
  const report = compute(audit, ref);
  const prevReport = previous ? compute(previous, ref) : null;
  const md = toMarkdown(report, ref, lang, prevReport);
  writeFileSync(join(auditsDir(), `${date}.md`), md);
  writeFileSync(join(qualityDir(cwd), "AUDIT.md"), md);
  writeFileSync(join(auditsDir(), `${date}.report.json`), JSON.stringify(report, null, 2));
  out({ date, global: report.global, grade: report.global == null ? null : grade(report.global, ref, lang),
    global_capped: report.global_capped, previous_global: prevReport?.global ?? null, open_blockers: report.open_blockers,
    carried_forward: carried, warnings, report: relative(cwd, join(qualityDir(cwd), "AUDIT.md")),
    top_issues: report.issues.slice(0, 10).map((i) => ({ id: i.id, severity: i.severity, status: i.status, label: i.label[lang], fix: i.fix })) });
}

async function main() {
  switch (cmd) {
    case "detect": {
      const { detect } = await import("./lib/detect.mjs");
      return out(detect(cwd, findStacks(cwd)));
    }
    case "stacks":
      return out(findStacks(cwd).map(({ stack, plugin, file, label }) => ({ stack, plugin, label: label?.en, file })));
    case "plan": {
      const date = opt("date", today());
      return out(plan(rest, date));
    }
    case "scan": {
      const { scan } = await import("./lib/scan.mjs");
      const date = opt("date", today());
      const result = scan(cwd, ref);
      if (loadProject(cwd)) { const d = join(auditsDir(), date); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "scan.json"), JSON.stringify(result, null, 2)); }
      return out({ summary: result.summary, files_scanned: result.files_scanned, findings: result.findings });
    }
    case "web": {
      const { webChecks } = await import("./lib/web.mjs");
      const date = opt("date", today());
      if (!rest[0]) die("Usage: qp.mjs web <url>");
      const result = await webChecks(rest[0]);
      if (loadProject(cwd)) { const d = join(auditsDir(), date); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "web.json"), JSON.stringify(result, null, 2)); }
      return out(result);
    }
    case "browser": {
      const { browserChecks } = await import("./lib/browser.mjs");
      const date = opt("date", today());
      if (!rest.length) die("Usage: qp.mjs browser <url> [url...]");
      const d = loadProject(cwd) ? join(auditsDir(), date) : null;
      const result = await browserChecks(rest, { cwd, outDir: d });
      if (d) { mkdirSync(d, { recursive: true }); writeFileSync(join(d, "browser.json"), JSON.stringify(result, null, 2)); }
      return out(result);
    }
    case "assemble":
      return assemble();
    case "score": {
      if (!rest[0]) die("Usage: qp.mjs score <audit.json> [--previous old.json] [--lang fr|en]");
      const lang = opt("lang", "fr");
      const prevPath = opt("previous");
      const audit = JSON.parse(readFileSync(rest[0], "utf8"));
      const prev = prevPath ? compute(JSON.parse(readFileSync(prevPath, "utf8")), ref) : null;
      return process.stdout.write(toMarkdown(compute(audit, ref), ref, lang, prev));
    }
    case "status": {
      const files = auditFiles();
      if (!files.length) return process.stdout.write("No audit yet.\n");
      const audit = JSON.parse(readFileSync(join(auditsDir(), files.at(-1)), "utf8"));
      const r = compute(audit, ref);
      return process.stdout.write(`Last audit ${r.date}: ${r.global}/10, ${r.open_blockers} open blocker(s), ${r.issues.length} open issue(s).\n`);
    }
    default:
      process.stdout.write(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n").replace(/^\/\/ ?/gm, "") + "\n");
  }
}

main().catch((e) => die(e.stack || String(e)));
