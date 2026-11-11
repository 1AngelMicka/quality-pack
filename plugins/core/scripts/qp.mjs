#!/usr/bin/env node
// quality-pack CLI. Zero dependencies, Node 18+. Run it from anywhere inside the project: it finds the
// folder that holds .quality/project.json and writes there.
//
//   node qp.mjs detect                       Guess stacks, flags and profile for /qp:kickoff
//   node qp.mjs stacks                       List installed qp stack modules
//   node qp.mjs plan [scope...] [--incremental]
//                                            Applicable criteria for /qp:audit, written to .quality/audits/<run>/plan.json.
//                                            scope: group, domain, criterion IDs, "blockers" or "quick" (automatic checks only).
//                                            --incremental: only what changed since the last audit (git), the rest is carried over.
//                                            Each audit gets its own run folder: 2026-11-11, then 2026-11-11-2 for a second one that day.
//   node qp.mjs run <label> "<command>"      Run a command, keep the full log on disk, print only a compact summary
//   node qp.mjs graph [refresh]              Graphify status (installed, fresh, recommended for this size) or code-only refresh
//   node qp.mjs scan                         Static scans of the source (placeholder, hollow wording, debug leftovers)
//   node qp.mjs web <url>                    HTTP checks: headers, compression, cache, SEO metadata, robots, sitemap
//   node qp.mjs browser <url> [url...]       Playwright checks of pages as they load, at 5 widths
//   node qp.mjs flows [flow-id...] [--base URL] [--check]
//                                            Play the key tasks declared in project.json step by step, on a phone and a
//                                            desktop: screenshot, axe-core and effort measures at every step (flows.json)
//   node qp.mjs browser-setup                Install Playwright, axe-core and Chromium once, in the pack's cache (not the project)
//   node qp.mjs assemble                     Merge agent results, score, write .quality/AUDIT.md
//   node qp.mjs score <audit.json> [--previous old.json] [--lang fr|en]
//   node qp.mjs status [--json]              Summary of the latest audit
//
// Commands that write audit files take --run <run> (or --date <run>); by default, the latest run of today.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { loadReferential, loadProject, findStacks, qualityDir, resolveFlags, applies, today, allDomains,
  findProjectRoot, RUN_RE, byRun, runDay } from "./lib/ref.mjs";
import { compute, toMarkdown, grade, reviewCap } from "./lib/score.mjs";
import { gitHead, changedSince } from "./lib/git.mjs";
import { graphStatus } from "./lib/graph.mjs";
import { recordSavings, estimateTokens } from "./lib/run.mjs";

const ref = loadReferential();
const here = process.cwd();
const [cmd, ...rest] = process.argv.slice(2);
// detect runs before project.json exists; everything else works from the project root.
const cwd = cmd === "detect" ? here : (findProjectRoot(here) || here);
const opt = (name, def = null) => { const i = rest.indexOf(`--${name}`); if (i === -1) return def; const v = rest[i + 1]; rest.splice(i, 2); return v; };
const flag = (name) => { const i = rest.indexOf(`--${name}`); if (i === -1) return false; rest.splice(i, 1); return true; };
const out = (obj) => process.stdout.write(JSON.stringify(obj, null, 2) + "\n");
const die = (msg) => { process.stderr.write(msg + "\n"); process.exit(1); };
const auditsDir = () => join(qualityDir(cwd), "audits");

function requireProject() {
  const p = loadProject(cwd);
  if (!p) die("No .quality/project.json in this directory or its parents. Run /qp:kickoff first.");
  if (!ref.profiles[p.profile]) die(`Unknown profile "${p.profile}" in .quality/project.json (${Object.keys(ref.profiles).join(", ")}).`);
  return p;
}

// Assembled audits, oldest first: .quality/audits/<run>.json
function auditRuns() {
  if (!existsSync(auditsDir())) return [];
  return readdirSync(auditsDir()).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).filter((r) => RUN_RE.test(r)).sort(byRun);
}

function loadAudit(run) {
  const f = join(auditsDir(), `${run}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

// Run folders of a day (planned or assembled), oldest first.
function runsOfDay(day) {
  if (!existsSync(auditsDir())) return [];
  const names = readdirSync(auditsDir()).map((f) => f.replace(/\.json$/, "").replace(/\.(report|md)$/, ""));
  return [...new Set(names.filter((r) => RUN_RE.exec(r)?.[1] === day))].sort(byRun);
}

// A new audit reuses today's last run folder only if nothing was written in it yet; otherwise it gets the next number,
// so a scoped audit never overwrites the plan or the parts of the full audit done earlier the same day.
function newRun(day = today()) {
  const runs = runsOfDay(day);
  if (!runs.length) return day;
  const last = runs.at(-1);
  const parts = join(auditsDir(), last, "parts");
  const used = existsSync(join(auditsDir(), `${last}.json`)) || (existsSync(parts) && readdirSync(parts).some((f) => f.endsWith(".json")));
  if (!used) return last;
  return `${day}-${(Number(RUN_RE.exec(last)[2]) || 1) + 1}`;
}

// The run a command writes to: --run or --date, else the latest run of today, else today.
const currentRun = () => opt("run") || opt("date") || runsOfDay(today()).at(-1) || today();

const FULL_EVERY_DAYS = 30;

function incrementalBase() {
  // Latest audit with a git commit, and whether a full re-check is due anyway.
  const runs = auditRuns();
  if (!runs.length) return { reason: "no previous audit" };
  const prev = loadAudit(runs.at(-1));
  if (!prev.git_head) return { reason: "previous audit has no git commit recorded" };
  if (prev.pack_version !== ref.version) return { reason: `pack updated (${prev.pack_version} → ${ref.version})` };
  const lastFull = prev.last_full || prev.date;
  if ((Date.parse(today()) - Date.parse(runDay(lastFull))) / 86400000 > FULL_EVERY_DAYS) return { reason: `last full audit older than ${FULL_EVERY_DAYS} days (${lastFull})` };
  const changed = changedSince(cwd, prev.git_head);
  if (changed === null) return { reason: "git history unavailable" };
  return { prev, changed };
}

const EVIDENCE = { placeholder_scan: "scan.json", slop_wording_scan: "scan.json", debug_leftovers_scan: "scan.json",
  headers_check: "web.json", seo_scan: "web.json", cookie_scan: "browser.json", axe: "browser.json + flows.json (every step of every flow)",
  viewport_screenshots: "browser.json + flows.json (horizontal_overflow at every step)", console_check: "browser.json + flows.json (console per run)",
  contrast_check: "browser.json + flows.json (axe color-contrast)", flow_run: "flows.json (summary, over_budget, screenshots in flows/)" };
const AGENTS = { ergonomics: "qp:ergonomist" };

async function plan(scope, run, incremental = false) {
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
  const quick = tokens.delete("quick");
  tokens.delete("full");
  const inScope = (g, d, c) => (!quick || c.check.method === "auto") && (!tokens.size || tokens.has(g.group) || tokens.has(d.id)
    || tokens.has(c.id.toLowerCase()) || (tokens.has("blockers") && c.severity === "blocker"));
  let mode = quick ? "quick" : tokens.size ? "scoped" : "full";
  let inc = null;
  if (incremental && !quick) {
    const base = incrementalBase();
    if (base.prev) { mode = "incremental"; inc = { since: base.prev.run || base.prev.date, since_commit: base.prev.git_head, changed_files: base.changed.slice(0, 300),
      changed_count: base.changed.length, no_changes: base.changed.length === 0 }; }
    else inc = { forced_full: base.reason };
  }
  const prevResults = mode === "incremental" ? (loadAudit(auditRuns().at(-1))?.results || {}) : {};
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
          if (provider === "core") item.evidence_from = EVIDENCE[c.check.tool] || "run it yourself (see verify)";
          else if (!st) item.note = "No installed stack module maps this check: find the project's equivalent command or inspect, and say so in the evidence.";
        }
        const pr = prevResults[c.id];
        if (pr) item.previous = { status: pr.status, evidence: String(pr.evidence || "").slice(0, 200) };
        criteria.push(item);
        count++;
      }
      if (criteria.length) domains.push({ id: d.id, label: d.label.en, criteria });
    }
    if (domains.length) groups.push({ group: g.group, label: g.label.en, agent: AGENTS[g.group] || "qp:auditor", domains });
  }
  const { validateFlows } = await import("./lib/flows.mjs");
  const fl = validateFlows(project);
  const flowInfo = { declared: fl.flows.map((f) => ({ id: f.id, name: f.name, devices: f.devices, steps: f.steps.length })), errors: fl.errors };
  if (flags.has("has_ui") && !fl.flows.length) flowInfo.missing = "No key tasks in project.json › flows: the interface can only be judged on the screens as they load. Declare 2 to 5 flows (see /qp:kickoff) before a full audit.";
  const dir = join(auditsDir(), run);
  mkdirSync(join(dir, "parts"), { recursive: true });
  const result = { run, date: runDay(run), out_dir: relative(cwd, dir), project_root: cwd, qp_cli: qp, project: project.name, profile: project.profile,
    language: project.language || "fr", flags: [...flags].sort(), urls: project.urls || {}, scope: [...tokens],
    stacks: stacks.map((s) => ({ stack: s.stack, plugin: s.plugin })),
    missing_stack_modules: declared.filter((s) => !found.some((x) => x.stack === s)),
    package_manager: project.package_manager || null, mode, incremental: inc, audit_model: project.audit_model || "inherit",
    flows: flowInfo, graph: graphSummary(), criteria_count: count, groups };
  writeFileSync(join(dir, "plan.json"), JSON.stringify(result, null, 2));
  return result;
}

function graphSummary() {
  try {
    const g = graphStatus(cwd);
    return { installed: g.installed, graph: g.graph, stale: g.stale ?? null, project_size: g.project_size, advice: g.advice };
  } catch { return null; }
}

const STATUSES = ["pass", "partial", "fail", "unknown", "na"];
// How good a status is, to make sure the counter-check only ever lowers a result.
const RANK = { na: 4, pass: 4, partial: 2, unknown: 1, fail: 0 };

function assemble() {
  const project = requireProject();
  const run = currentRun();
  const dir = join(auditsDir(), run);
  const partsDir = join(dir, "parts");
  if (!existsSync(partsDir)) die(`No ${relative(cwd, partsDir)}: run the audit first.`);
  const known = new Map(allDomains(ref).flatMap((d) => d.criteria.map((c) => [c.id, c])));
  const results = {};
  const warnings = [];
  const returned = new Set();
  let findings = null;
  let challenge = null;
  for (const f of readdirSync(partsDir).filter((x) => x.endsWith(".json")).sort()) {
    let part;
    try { part = JSON.parse(readFileSync(join(partsDir, f), "utf8")); } catch (e) { warnings.push(`${f}: invalid JSON (${e.message})`); continue; }
    if (f === "challenge.json") { challenge = part; continue; }
    if (Array.isArray(part.findings)) findings = [...(findings || []), ...part.findings];
    for (const [id, r] of Object.entries(part.results || {})) {
      if (!known.has(id)) { warnings.push(`${f}: unknown criterion ${id}`); continue; }
      returned.add(id);
      if (r.status === "carry") continue; // unchanged since the last audit: carried over below
      if (!STATUSES.includes(r.status)) { warnings.push(`${f}: ${id} has invalid status "${r.status}"`); continue; }
      if (r.status === "pass" && !String(r.evidence || "").trim()) { warnings.push(`${f}: ${id} passed without evidence, counted as unknown`); r.status = "unknown"; }
      results[id] = { status: r.status, evidence: r.evidence || "", fix: r.fix || "" };
    }
  }
  // Carry forward results of criteria not re-checked in this run (scoped and incremental audits).
  const previousRun = auditRuns().filter((r) => byRun(r, run) < 0).pop();
  const previous = previousRun ? loadAudit(previousRun) : null;
  let carried = 0;
  if (previous) for (const [id, r] of Object.entries(previous.results || {})) {
    if (!(id in results)) { results[id] = { ...r, carried_from: r.carried_from || previous.run || previous.date }; carried++; }
  }
  if (findings === null && previous?.review_findings) findings = previous.review_findings.map((x) => ({ ...x, carried_from: x.carried_from || previous.run || previous.date }));
  // The heuristic review feeds its criterion: a critical finding fails it, a major one caps it at partial.
  const reviewId = ref.scoring.review?.criterion;
  if (findings && reviewId && results[reviewId]) {
    const capTo = reviewCap(findings);
    const r = results[reviewId];
    if (capTo && RANK[r.status] > RANK[capTo]) { warnings.push(`${reviewId}: lowered from ${r.status} to ${capTo} by the review findings`); r.status = capTo; }
  }
  // Counter-check (devil's advocate): may only lower a result, with its own evidence.
  const challenged = [];
  if (challenge) for (const [id, c] of Object.entries(challenge.results || {})) {
    const r = results[id];
    if (!r || !STATUSES.includes(c.status)) { warnings.push(`challenge.json: ${id} ignored (unknown criterion or status)`); continue; }
    if (RANK[c.status] >= RANK[r.status]) { if (RANK[c.status] > RANK[r.status]) warnings.push(`challenge.json: ${id} cannot raise a result (${r.status} → ${c.status}), ignored`); continue; }
    if (!String(c.evidence || "").trim()) { warnings.push(`challenge.json: ${id} has no evidence, ignored`); continue; }
    challenged.push({ id, from: r.status, to: c.status });
    results[id] = { status: c.status, evidence: `${c.evidence} (counter-check; auditor said ${r.status}: ${String(r.evidence || "").slice(0, 160)})`, fix: c.fix || r.fix || "", challenged_from: r.status };
  }
  let planInfo = {};
  try { planInfo = JSON.parse(readFileSync(join(dir, "plan.json"), "utf8")); } catch { /* no plan */ }
  const planned = (planInfo.groups || []).flatMap((g) => g.domains.flatMap((d) => d.criteria.map((c) => c.id)));
  const missing = planned.filter((id) => !returned.has(id));
  if (missing.length && !(planInfo.incremental?.no_changes)) warnings.push(`${missing.length} planned criteria not returned by the auditors (kept from the last audit if any, otherwise not checked): ${missing.slice(0, 15).join(", ")}${missing.length > 15 ? "…" : ""}`);
  const mode = planInfo.mode || "full";
  const lastFull = mode === "full" ? runDay(run) : (previous?.last_full || previous?.date || null);
  let tokenSavings = null;
  try { tokenSavings = JSON.parse(readFileSync(join(dir, "token-savings.json"), "utf8")); } catch { /* none */ }
  const reviewFindings = findings ? numberFindings(findings) : null;
  const audit = { run, date: runDay(run), project: project.name, profile: project.profile, flags: project.flags, pack_version: ref.version,
    mode, git_head: gitHead(cwd), last_full: lastFull, token_savings: tokenSavings, challenged, review_findings: reviewFindings, results };
  writeFileSync(join(auditsDir(), `${run}.json`), JSON.stringify(audit, null, 2));
  const lang = opt("lang", project.language || "fr");
  const report = compute(audit, ref);
  report.mode = mode;
  report.token_savings = tokenSavings;
  const prevReport = previous ? compute(previous, ref) : null;
  const md = toMarkdown(report, ref, lang, prevReport);
  writeFileSync(join(auditsDir(), `${run}.md`), md);
  writeFileSync(join(qualityDir(cwd), "AUDIT.md"), md);
  writeFileSync(join(auditsDir(), `${run}.report.json`), JSON.stringify(report, null, 2));
  out({ run, date: runDay(run), scores: report.scores, global: report.global, grade: report.global == null ? null : grade(report.global, ref, lang),
    global_capped: report.global_capped, previous_run: previous?.run || previous?.date || null, previous_scores: prevReport?.scores ?? null,
    previous_global: prevReport?.global ?? null, open_blockers: report.open_blockers, mode, carried_forward: carried,
    challenged, review_findings: reviewFindings ? reviewFindings.length : null, token_savings: tokenSavings, warnings,
    report: relative(cwd, join(qualityDir(cwd), "AUDIT.md")),
    top_issues: report.issues.slice(0, 10).map((i) => ({ id: i.id, severity: i.severity, status: i.status, area: i.area, label: i.label[lang], fix: i.fix })) });
}

const SEV = { critical: 0, major: 1, minor: 2 };
function numberFindings(list) {
  return list.filter((f) => f && SEV[f.severity] != null && f.problem).sort((a, b) => SEV[a.severity] - SEV[b.severity])
    .map((f, i) => ({ ...f, id: `${ref.scoring.review?.prefix || "REV-"}${String(i + 1).padStart(2, "0")}` }));
}

function latestReport() {
  const runs = auditRuns();
  for (const r of runs.reverse()) {
    const f = join(auditsDir(), `${r}.report.json`);
    if (existsSync(f)) return { run: r, file: f, report: JSON.parse(readFileSync(f, "utf8")) };
  }
  return null;
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
      const incremental = flag("incremental");
      const run = opt("run") || opt("date") || newRun();
      return out(await plan(rest, run, incremental));
    }
    case "run": {
      const { runCommand } = await import("./lib/run.mjs");
      const run = currentRun();
      const [label, ...cmdParts] = rest;
      if (!label || !cmdParts.length) die('Usage: qp.mjs run <label> "<command>"');
      const logDir = loadProject(cwd) ? join(auditsDir(), run, "logs") : join(qualityDir(cwd), "logs");
      // The command runs where it was typed (a sub-folder may be intended); its log goes to the project root.
      return out(runCommand(label, cmdParts.join(" "), { cwd: here, logDir }));
    }
    case "graph": {
      const { graphStatus, refreshCommand } = await import("./lib/graph.mjs");
      if (rest[0] === "refresh") {
        const st = graphStatus(cwd);
        if (!st.installed) die("Graphify is not installed. Install: uv tool install graphifyy (or pipx install graphifyy), then graphify install --project");
        const { runCommand } = await import("./lib/run.mjs");
        const { command, env } = refreshCommand(cwd);
        const r = runCommand("graphify", command, { cwd, env, logDir: join(qualityDir(cwd), "logs"), record: false });
        return out({ refreshed: r.exit_code === 0, ...r, status: graphStatus(cwd) });
      }
      return out(graphStatus(cwd));
    }
    case "scan": {
      const { scan, compactScan } = await import("./lib/scan.mjs");
      const run = currentRun();
      const result = scan(cwd, ref);
      const short = compactScan(result);
      if (loadProject(cwd)) {
        const d = join(auditsDir(), run);
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, "scan.json"), JSON.stringify(result, null, 2));
        recordSavings(d, estimateTokens(JSON.stringify(result, null, 2)), estimateTokens(JSON.stringify(short, null, 2)));
      }
      return out(short);
    }
    case "web": {
      const { webChecks } = await import("./lib/web.mjs");
      const run = currentRun();
      if (!rest[0]) die("Usage: qp.mjs web <url>");
      const result = await webChecks(rest[0]);
      if (loadProject(cwd)) { const d = join(auditsDir(), run); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "web.json"), JSON.stringify(result, null, 2)); }
      return out(result);
    }
    case "browser": {
      const { browserChecks } = await import("./lib/browser.mjs");
      const run = currentRun();
      if (!rest.length) die("Usage: qp.mjs browser <url> [url...]");
      const d = loadProject(cwd) ? join(auditsDir(), run) : null;
      const result = await browserChecks(rest, { cwd, outDir: d });
      if (d) { mkdirSync(d, { recursive: true }); writeFileSync(join(d, "browser.json"), JSON.stringify(result, null, 2)); }
      return out(result);
    }
    case "flows": {
      const { playFlows, compactFlows, validateFlows } = await import("./lib/flows.mjs");
      const project = requireProject();
      if (flag("check")) {
        const v = validateFlows(project);
        return out({ ok: !v.errors.length, errors: v.errors, flows: v.flows.map((f) => ({ id: f.id, name: f.name, devices: f.devices, steps: f.steps.length })) });
      }
      const run = currentRun();
      const base = opt("base");
      const d = join(auditsDir(), run);
      const result = await playFlows(project, { root: cwd, outDir: d, base, only: rest, budgets: ref.scoring.flow_budgets });
      const short = compactFlows(result);
      if (result.flows) {
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, "flows.json"), JSON.stringify(result, null, 2));
        recordSavings(d, estimateTokens(JSON.stringify(result, null, 2)), estimateTokens(JSON.stringify(short, null, 2)));
      }
      return out(short);
    }
    case "browser-setup": {
      const { cacheDir, setupCommands } = await import("./lib/browser.mjs");
      const { runCommand } = await import("./lib/run.mjs");
      const dir = cacheDir();
      mkdirSync(dir, { recursive: true });
      if (!existsSync(join(dir, "package.json"))) writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "qp-browser-cache", private: true,
        description: "Playwright and axe-core used by quality-pack audits. Safe to delete: `qp.mjs browser-setup` rebuilds it." }, null, 2) + "\n");
      const steps = [];
      for (const [label, command] of setupCommands()) {
        const r = runCommand(label, command, { cwd: dir, logDir: join(dir, "logs"), record: false });
        steps.push({ label, command, exit_code: r.exit_code, signal_lines: r.signal_lines.slice(0, 8), log: join(dir, r.log) });
        if (r.exit_code !== 0) break;
      }
      return out({ cache: dir, ok: steps.length === setupCommands().length && steps.every((s) => s.exit_code === 0), steps });
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
      const json = flag("json");
      const last = latestReport();
      if (!last) return json ? out({ audit: null }) : process.stdout.write("No audit yet.\n");
      const r = last.report;
      if (json) return out({ run: last.run, date: r.date, report_json: relative(cwd, last.file), report_md: ".quality/AUDIT.md",
        scores: r.scores, global: r.global, open_blockers: r.open_blockers, issues: r.issues.length, review_findings: r.review?.length ?? 0,
        age_days: Math.round((Date.now() - statSync(last.file).mtimeMs) / 86400000) });
      const area = (k) => r.scores?.[k]?.score == null ? "—" : `${r.scores[k].score}/10`;
      return process.stdout.write(`Last audit ${last.run}: experience ${area("experience")}, engineering ${area("operations")}, overall ${r.global}/10, ${r.open_blockers} open blocker(s), ${r.issues.length} open issue(s).\n`);
    }
    default:
      process.stdout.write(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n").replace(/^\/\/ ?/gm, "") + "\n");
  }
}

main().catch((e) => die(e.stack || String(e)));
