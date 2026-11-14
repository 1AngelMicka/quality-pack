#!/usr/bin/env node
// shipwright CLI. Zero dependencies, Node 18+. Run it from anywhere inside the project: it finds the
// folder that holds .quality/project.json and writes there.
//
//   node sw.mjs detect                       Guess stacks, flags and profile for /sw:kickoff
//   node sw.mjs stacks                       List installed sw stack modules
//   node sw.mjs skills                       Without the plugin loaded: list the skills and agents, with their files
//   node sw.mjs skill <name> [notes]         Print one skill (or an agent's brief) with its paths filled in, ready to follow
//   node sw.mjs enable [--modules a,b]       Write the project's .claude/settings.json so that Claude Code offers the plugin
//                                            (offering is not installing: install below is the sure path)
//   node sw.mjs install [--modules a,b] [--scope user|project]
//                                            Install the marketplace, the main plugin and the modules of the technologies found in
//                                            the project or declared in project.json › stacks, with Claude Code's command line.
//                                            Changes the user's Claude Code configuration: only when the user asked. Then the user
//                                            types /reload-plugins. The sure path: accepting the marketplace after enable does not
//                                            always install the plugin
//   node sw.mjs doctor                       Is Shipwright really there for this project? Marketplace known, sw@shipwright installed
//                                            (user or project scope), enabled here, modules, hooks declared, versions. Read only
//   node sw.mjs plan [scope...] [--incremental]
//                                            Applicable criteria for /sw:audit, written to .quality/audits/<run>/plan.json.
//                                            scope: group, domain, criterion IDs, "blockers" or "quick" (automatic checks only).
//                                            --incremental: only what changed since the last audit (git), the rest is carried over.
//                                            Each audit gets its own run folder: 2026-11-11, then 2026-11-11-2 for a second one that day.
//   node sw.mjs run <label> "<command>"      Run a command, keep the full log on disk, print only a compact summary
//   node sw.mjs graph [refresh]              Graphify status (installed, fresh, recommended for this size) or code-only refresh
//   node sw.mjs scan                         Static scans of the source (placeholder, hollow wording, debug leftovers). Leaves out
//                                            docs/, reports/, research_notes/ and project.json › scan_exclude ("!docs" scans docs/ again)
//   node sw.mjs web <url>                    HTTP checks: headers, compression, cache, SEO metadata, robots, sitemap
//   node sw.mjs seo [url] [--limit N]        Search readiness of the public pages: sitemap (found, declared, every address answers and is
//                                            indexable), title and meta description of each page (filled, length, unique), one h1,
//                                            the keywords of project.json › seo.keywords carried by their page, Search Console (seo.json)
//   node sw.mjs browser <url> [url...]       Playwright checks of pages as they load, at 6 widths
//   node sw.mjs flows [flow-id...] [--base URL] [--check] [--attach port] [--run R] [--pause S] [--replace]
//                                            Play the key tasks declared in project.json step by step, on a phone and a
//                                            desktop: screenshot, axe-core and effort measures at every step (flows.json).
//                                            Without --run: in .quality/flows/, never in an audit run. Results are merged
//                                            by task id (--replace starts over); --pause waits S seconds between tasks
//   node sw.mjs access [--base URL] [--check] [--allow-production]
//                                            Access control played for real: each resource declared in project.json › access is
//                                            requested by its owner, then by the accounts that must not reach it (access.json).
//                                            --check: validates the declaration only (no check yet is a warning); exit 2 when not ok
//   node sw.mjs dast [url] [--minutes N] [--allow-production]
//                                            Passive security scan of the running app with OWASP ZAP's baseline, in Docker (zap.json)
//   node sw.mjs auth [--base URL]            Login of the running app: the right password first (password_env), same answer for known
//                                            and unknown accounts (also on sign-up and reset when declared), wrong passwords slowed or
//                                            refused (auth.json). Sends failed logins: local or staging only
//   node sw.mjs supply                       Supply chain read from the repository: lockfile, release cooldown, install scripts,
//                                            pinned CI actions, env files (supply.json)
//   node sw.mjs threats [--check | --gate launch]
//                                            Threat model (.quality/threats.json). --check: is it well formed (every entry point has an
//                                            abuse case, every abuse case a response and a test)? Exit 0 when it is, open cases allowed.
//                                            No option or --gate launch: is it ready for launch? Also fails on cases open before launch
//   node sw.mjs guard-test                   Play known cases through the secrets guard hook (keys in code, .env, allow marker,
//                                            unreadable input) and report each pass or fail
//   node sw.mjs mobile flows [flow-id...]    Installed app: turn project.json › mobile.flows into Maestro flows (.maestro/qp/)
//                                            and play them on the running emulator, simulator or device (mobile.json)
//   node sw.mjs mobile audit                 Installed app, Android: the screen shown on the running device or emulator, read with adb:
//                                            touch targets, controls without a name, crowded targets; screenshots at 200 % text
//                                            size and in dark theme (mobile-audit.json)
//   node sw.mjs mobile check                 Installed app: release blockers read from the project (target API, debuggable,
//                                            cleartext, privacy manifest, WebView, link files, deletion page) (mobile-check.json)
//   node sw.mjs desktop check                Desktop app (Tauri, Electron): what blocks or weakens a release, read from the project:
//                                            content security policy, permissions, isolation, updater, signing (desktop-check.json).
//                                            Key tasks in the real window: sw.mjs flows --attach <remote debugging port>
//   node sw.mjs perf <url> [url...]          Loading measured on a throttled phone: largest paint, layout shift, blocking time,
//                                            weight of the page and of its scripts, requests (perf.json)
//   node sw.mjs webhooks [--base URL]        Webhook endpoints of project.json › webhooks: an unsigned or wrongly signed event
//                                            must be refused (webhooks.json). Local or staging only
//   node sw.mjs billing [--wait seconds]     Subscription life cycle played in Stripe's test mode with a test clock: trial, first
//                                            payment, declined renewal, cancellation; the app is asked what it believes at each
//                                            stage (billing.json). Needs a Stripe TEST key in the environment. billing.trial "app": the
//                                            app holds the trial, asked before any subscription; billing.subscription_metadata is set
//                                            on the test subscription
//   node sw.mjs facts <url> [url...]         Figures, quotes and customer names shown on public pages, each to be traced to
//                                            .quality/facts.json (facts.json in the run)
//   node sw.mjs record <flow-id> [--name "…"] [--start /path] [--device desktop|mobile] [--from recorded.js]
//                                            Record a key task by doing it in a browser; saves it as a flow in project.json
//   node sw.mjs look <url> [url...] [--mode persuade|operate|read] [--baseline old-look.json] [--before code|file.js] [--as account]
//                                            How the page looks, measured: generic "AI-made" signals (weighted, never one alone),
//                                            point of view (none when nothing was decided), font sizes and families, radii, line
//                                            length and height, small targets, accent share, reduced motion (look.json). Tier "low"
//                                            = few generic signs, not "good". project.json › motion: "rich" (or per path) turns
//                                            LOOK-ANIMATE-ALL into information. --baseline: controls lost since an earlier look.json
//   node sw.mjs craft <url> [url...] [--mode persuade|operate|read] [--before code|file.js] [--as account]
//                                            Finish of the rendered page, measured: typography details, focus and hover states,
//                                            controls the click reaches, transitions, images, icons, site icon, share image, 404
//                                            page (craft.json). On localhost, 404 status and share image are "to check in preproduction"
//   node sw.mjs stress <url> [--only slow,failing,long,narrow,dark,keyboard,no_script] [--before code|file.js] [--as account]
//                                            Finishing passes: the screen with a slow network, a failing server, texts three times
//                                            longer, 320 px wide, dark scheme, keyboard only, scripts off (stress.json, screenshots)
//                                            look, craft, stress and deslop say when the browser ended elsewhere (a redirect to the
//                                            login page) and list 401, 403 and 429 answers. --before: code run before the page's
//                                            scripts (repeatable). --as: log in once with project.json › access.accounts.<account>
//   node sw.mjs profile <url> [url...] [--save]
//                                            Visual profile of a page in numbers (type scale, typefaces, first screen, colours,
//                                            surfaces, density). --save: keep them as the project's references (.quality/references.json)
//   node sw.mjs gap <url> [--type <site-type>] [--device mobile]
//                                            Compare a screen with the project's references, or with the reference bank of a site type
//   node sw.mjs bank [type] | bank measure <type|all> | bank calibrate <type|all> [--limit N]
//                                            Reference bank: excellent sites by type, why they are, their measured profile;
//                                            calibrate runs sw craft and sw look on them, so that a rule most of them break becomes advice
//   node sw.mjs variants <name> <url> <url> [url...] [--mode persuade|operate|read] | variants <name> --tally
//                                            Several versions of one screen: screenshots under shuffled letters, measures, pairs
//                                            for a blind jury; --tally ranks them from the votes. --mode: how the screen is measured
//                                            (persuade for a public page, operate for a work screen, read for content); by default
//                                            project.json › surface
//   node sw.mjs deslop <url|file.html> [--widths …] [--click sel] [--before file.js] [--tauri] [--dark] [--attach port] [--as account]
//                                            Spacing, alignment and execution audit of the rendered page, with installed
//                                            Chrome or Edge (deslop.json, screenshots per width). A deliberate exception:
//                                            data-sw-intended="<rule>: reason" on the element, reported as intended
//   node sw.mjs tiles [dir]                  Style tiles (default .quality/design/tiles) served on a local port, captured on a
//                                            desktop and a phone, shown side by side (_sheet/index.html, sheet.png), with the
//                                            fonts each tile declares but does not load
//   node sw.mjs tokens [file.tokens.json...] Check design tokens (DTCG 2025.10): references, units, tiers, contrast per theme, sRGB gamut
//   node sw.mjs browser-setup                Install Playwright, axe-core and Chromium once, in the pack's cache (not the project)
//   node sw.mjs assemble                     Merge agent results, score, write .quality/AUDIT.md and .quality/report.html
//   node sw.mjs report [--run R]             Rewrite .quality/report.html: scores over time, key-task screenshots, review findings
//   node sw.mjs score <audit.json> [--previous old.json] [--lang fr|en]
//   node sw.mjs status [--json]              Summary of the latest audit
//
// Commands that write audit files take --run <run> (or --date <run>); by default, the latest run of today.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
  if (!p) die("No .quality/project.json in this directory or its parents. Run /sw:kickoff first.");
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
  contrast_check: "browser.json + flows.json (axe color-contrast)", flow_run: "flows.json (summary, over_budget, screenshots in flows/)", generic_look_scan: "look.json", spacing_audit: "deslop.json (findings per width, screenshots in deslop/)",
  access_run: "access.json (summary.leaks, unclear, setup_errors)", dast_scan: "zap.json (summary by risk, alerts)",
  craft_scan: "craft.json (summary.must_failed, should_failed, checks with samples)",
  auth_probe: "auth.json (summary.must_failed, checks)", supply_scan: "supply.json (summary.must_failed, should_failed, checks)",
  threat_model: "node sw.mjs threats (errors, open_before_launch)", mobile_flow_run: "mobile.json (summary, screenshots in mobile/)",
  mobile_release_scan: "mobile-check.json (summary.must_failed, should_failed, not_covered)",
  stress_run: "stress.json (per screen: summary.must_failed, should_failed, screenshots in stress/)",
  seo_pages: "seo.json (summary.must_failed, should_failed, keywords, pages)",
  desktop_release_scan: "desktop-check.json (summary.must_failed, should_failed, not_covered)", perf_run: "perf.json (per page: summary.must_failed, should_failed, measures)",
  webhook_probe: "webhooks.json (summary.must_failed, checks)", billing_run: "billing.json (stages, summary.app_disagrees, stripe_unexpected)", facts_scan: "facts.json (summary.untraced, claims per page)" };
const AGENTS = { ergonomics: "sw:ergonomist" };

async function plan(scope, run, incremental = false) {
  const project = requireProject();
  const found = findStacks(cwd);
  const declared = project.stacks || [];
  const stacks = declared.length ? found.filter((s) => declared.includes(s.stack)) : found;
  const appUrl = project.urls?.production || project.urls?.staging || project.urls?.local || "";
  let host = "";
  try { host = appUrl ? new URL(appUrl).host : ""; } catch { /* invalid URL */ }
  // {api_url}: where the API answers when it is not at the app's address (a Vite front on 5173, the API on 3001).
  const api = project.api_url && typeof project.api_url === "object" ? project.api_url.production || project.api_url.staging || project.api_url.local : project.api_url;
  const apiUrl = (api || appUrl || "").replace(/\/+$/, "");
  const fill = (cmd) => cmd.replaceAll("{pm}", project.package_manager || "npm").replaceAll("{api_url}", apiUrl || "{api_url}").replaceAll("{url}", appUrl || "{url}").replaceAll("{host}", host || "{host}");
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
          if (st) Object.assign(item, { command: fill(st.checks[c.check.tool].run), pass_if: fill(st.checks[c.check.tool].pass_if), from_stack: st.stack });
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
    if (domains.length) groups.push({ group: g.group, label: g.label.en, agent: AGENTS[g.group] || "sw:auditor", domains });
  }
  const { validateFlows } = await import("./lib/flows.mjs");
  const fl = validateFlows(project);
  const flowInfo = { declared: fl.flows.map((f) => ({ id: f.id, name: f.name, devices: f.devices, steps: f.steps.length })), errors: fl.errors };
  if (flags.has("has_ui") && !fl.flows.length) flowInfo.missing = "No key tasks in project.json › flows: the interface can only be judged on the screens as they load. Declare 2 to 5 flows (see /sw:kickoff) before a full audit.";
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

async function assemble() {
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
  const html = await writeHtmlReport(run, report, lang, project);
  out({ run, date: runDay(run), html_report: html, scores: report.scores, global: report.global, grade: report.global == null ? null : grade(report.global, ref, lang),
    global_capped: report.global_capped, previous_run: previous?.run || previous?.date || null, previous_scores: prevReport?.scores ?? null,
    previous_global: prevReport?.global ?? null, open_blockers: report.open_blockers, mode, carried_forward: carried,
    challenged, review_findings: reviewFindings ? reviewFindings.length : null, token_savings: tokenSavings, warnings,
    report: relative(cwd, join(qualityDir(cwd), "AUDIT.md")),
    top_issues: report.issues.slice(0, 10).map((i) => ({ id: i.id, severity: i.severity, status: i.status, area: i.area, label: i.label[lang], fix: i.fix })) });
}

// .quality/report.html: the two scores over time, the screenshots of the key tasks, the review findings.
async function writeHtmlReport(run, report, lang, project) {
  const { renderReport } = await import("./lib/report.mjs");
  const runs = auditRuns().filter((r) => byRun(r, run) <= 0);
  const history = runs.map((r) => { try { const c = compute(loadAudit(r), ref); return { run: r, scores: c.scores, global: c.global }; } catch { return null; } }).filter(Boolean);
  // Flows of this run, or of the latest run that played them (an incremental audit may have skipped them).
  let flows = null;
  for (const r of [...runs].reverse()) {
    const f = join(auditsDir(), r, "flows.json");
    if (existsSync(f)) { try { flows = JSON.parse(readFileSync(f, "utf8")); } catch { /* unreadable */ } break; }
  }
  const file = join(qualityDir(cwd), "report.html");
  writeFileSync(file, renderReport({ report, history, flows, ref, lang, project }));
  return relative(cwd, file);
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
      if (!label || !cmdParts.length) die('Usage: sw.mjs run <label> "<command>"');
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
      const exclude = loadProject(cwd)?.scan_exclude;
      const result = scan(cwd, ref, { exclude: Array.isArray(exclude) ? exclude : [] });
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
      if (!rest[0]) die("Usage: sw.mjs web <url>");
      const result = await webChecks(rest[0]);
      if (loadProject(cwd)) { const d = join(auditsDir(), run); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "web.json"), JSON.stringify(result, null, 2)); }
      return out(result);
    }
    case "seo": {
      const { seoChecks } = await import("./lib/seo.mjs");
      const project = loadProject(cwd);
      const run = currentRun();
      const limit = Number(opt("limit", "0")) || undefined;
      const base = rest[0] || project?.urls?.production || project?.urls?.staging || project?.urls?.local;
      if (!base) die("Usage: sw.mjs seo <url> (or set urls.production in .quality/project.json)");
      const result = await seoChecks(base, { keywords: project?.seo?.keywords || [], searchConsole: project?.seo?.search_console || null, limit });
      if (result.errors) die(result.errors.join("\n"));
      if (project) { const d = join(auditsDir(), run); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "seo.json"), JSON.stringify(result, null, 2)); }
      out({ base: result.base, pages_read: result.pages_read, sitemap: result.sitemap, summary: result.summary, failed: Object.fromEntries(Object.entries(result.checks).filter(([, c]) => !c.ok)),
        passed: Object.entries(result.checks).filter(([, c]) => c.ok).map(([k]) => k), keywords: result.keywords, signs: result.signs, full_report: "seo.json", note: result.note });
      if (result.summary.must_failed.length) process.exitCode = 2;
      return;
    }
    case "browser": {
      const { browserChecks } = await import("./lib/browser.mjs");
      const run = currentRun();
      if (!rest.length) die("Usage: sw.mjs browser <url> [url...]");
      const d = loadProject(cwd) ? join(auditsDir(), run) : null;
      const result = await browserChecks(rest, { cwd, outDir: d });
      if (d) { mkdirSync(d, { recursive: true }); writeFileSync(join(d, "browser.json"), JSON.stringify(result, null, 2)); }
      return out(result);
    }
    case "flows": {
      const { playFlows, compactFlows, validateFlows, mergeFlowResults, staleShots, removeShots } = await import("./lib/flows.mjs");
      const project = requireProject();
      if (flag("check")) {
        const v = validateFlows(project);
        return out({ ok: !v.errors.length, errors: v.errors, warnings: v.warnings, planned: v.planned,
          flows: v.flows.map((f) => ({ id: f.id, name: f.name, ...(f.status ? { status: f.status } : {}), devices: f.devices, steps: f.steps.length })) });
      }
      // With --run the results go into that audit run; without it, into the working folder .quality/flows/, so that a
      // check after a fix never changes the evidence of an audit already assembled.
      const run = opt("run") || opt("date");
      const base = opt("base");
      const attach = opt("attach");
      const pauseArg = opt("pause");
      const pause = pauseArg == null ? 0 : Number(pauseArg);
      if (!(pause >= 0)) die("--pause takes a number of seconds");
      const replace = flag("replace");
      const d = run ? join(auditsDir(), run) : join(qualityDir(cwd), "flows");
      const result = await playFlows(project, { root: cwd, outDir: d, base, only: rest, budgets: ref.scoring.flow_budgets, attach, pause,
        log: (m) => process.stderr.write(m + "\n") });
      if (!result.flows) return out(result);
      mkdirSync(d, { recursive: true });
      if (!run && !existsSync(join(d, ".gitignore"))) writeFileSync(join(d, ".gitignore"), "# Working results of sw flows, not audit evidence\n*\n");
      // Tasks played now replace their earlier results in the same file; the others are kept (--replace: start over).
      const file = join(d, "flows.json");
      let previous = null;
      if (!replace && existsSync(file)) { try { previous = JSON.parse(readFileSync(file, "utf8")); } catch { /* unreadable: replaced */ } }
      const keep = new Set(validateFlows(project).flows.filter((f) => f.status !== "planned").map((f) => f.id));
      const merged = mergeFlowResults(previous, result, keep);
      removeShots(cwd, staleShots(previous, merged));
      writeFileSync(file, JSON.stringify(merged, null, 2));
      const short = compactFlows(merged, { report: relative(cwd, file).split("\\").join("/"), screenshots: relative(cwd, join(d, "flows")).split("\\").join("/") + "/" });
      recordSavings(d, estimateTokens(JSON.stringify(merged, null, 2)), estimateTokens(JSON.stringify(short, null, 2)));
      return out(short);
    }
    case "access": {
      const { runAccess, compactAccess, validateAccess } = await import("./lib/access.mjs");
      const project = requireProject();
      if (flag("check")) {
        const v = validateAccess(project);
        const ok = !v.errors.length;
        out({ ok, errors: v.errors, warnings: v.warnings, accounts: Object.keys(v.accounts),
          checks: v.checks.map((c) => ({ id: c.id, request: `${c.method} ${c.path}`, owner: c.owner, ...(c.scope === "self" ? { scope: "self", markers: c.markers.length } : {}), denied_to: c.denied_to })) });
        // The exit code follows ok.
        if (!ok) process.exitCode = 2;
        return;
      }
      const run = currentRun();
      const result = await runAccess(project, { root: cwd, base: opt("base"), allowProduction: flag("allow-production") });
      if (result.checks) {
        const d = join(auditsDir(), run);
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, "access.json"), JSON.stringify(result, null, 2));
      }
      out(compactAccess(result));
      // 2: a resource leaked or a check could not be set up; the audit must not read this as a pass.
      if (result.errors?.length || result.summary?.leaks.length || result.summary?.setup_errors.length) process.exitCode = 2;
      return;
    }
    case "dast": {
      const { runZap, compactZap } = await import("./lib/dast.mjs");
      const project = loadProject(cwd);
      const run = currentRun();
      const minutes = Number(opt("minutes", "1")) || 1;
      const allowProduction = flag("allow-production");
      const target = rest[0] || project?.urls?.local || project?.urls?.staging;
      if (!target) die("Usage: sw.mjs dast <url> (or set urls.local or urls.staging in .quality/project.json)");
      const d = project ? join(auditsDir(), run) : join(qualityDir(cwd), "dast");
      mkdirSync(d, { recursive: true });
      const result = runZap(target, { outDir: d, production: project?.urls?.production, allowProduction, minutes });
      if (result.alerts) writeFileSync(join(d, "zap.json"), JSON.stringify(result, null, 2));
      out(compactZap(result));
      if (result.errors?.length || result.summary?.high) process.exitCode = 2;
      return;
    }
    case "auth": {
      const { authProbe } = await import("./lib/security.mjs");
      const project = requireProject();
      const run = currentRun();
      const result = await authProbe(project, { base: opt("base") });
      if (result.checks) { const d = join(auditsDir(), run); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "auth.json"), JSON.stringify(result, null, 2)); }
      out(result);
      if (result.errors?.length || result.summary?.must_failed.length) process.exitCode = 2;
      return;
    }
    case "supply": {
      const { supplyChecks } = await import("./lib/security.mjs");
      const run = currentRun();
      const result = supplyChecks(cwd);
      if (loadProject(cwd)) { const d = join(auditsDir(), run); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "supply.json"), JSON.stringify(result, null, 2)); }
      out({ summary: result.summary, failed: Object.fromEntries(Object.entries(result.checks).filter(([, c]) => !c.ok)), passed: Object.entries(result.checks).filter(([, c]) => c.ok).map(([k]) => k), note: result.note });
      if (result.summary.must_failed.length) process.exitCode = 2;
      return;
    }
    case "threats": {
      // Two questions: --check asks "is the model well formed?" (open cases are expected while building);
      // no option, or --gate launch, asks "can we launch?" and also fails on cases still open before launch.
      const { validateThreats } = await import("./lib/security.mjs");
      const shapeOnly = flag("check");
      const gate = opt("gate");
      if (gate != null && gate !== "launch") die(`Unknown gate "${gate}": the only gate is launch (sw.mjs threats --gate launch).`);
      if (shapeOnly && gate) die("Choose one question: --check (is the model well formed?) or --gate launch (can we launch?).");
      const file = join(qualityDir(cwd), "threats.json");
      let model = null;
      try { model = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null; } catch (e) { die(`.quality/threats.json is not valid JSON: ${e.message}`); }
      const result = validateThreats(model);
      const open = result.summary?.open_before_launch || [];
      const ok = shapeOnly ? result.ok : result.ok && !open.length;
      const answer = shapeOnly
        ? (result.ok ? `yes: the model is well formed${open.length ? ` (${open.length} case(s) still open before launch: expected while building, they fail \`sw threats\` without --check)` : ""}` : "no: fix the errors")
        : !result.ok ? "no: the model is not well formed, fix the errors" : open.length ? `no: ${open.length} abuse case(s) still open before launch` : "yes: the model is well formed and no case is open before launch";
      out({ file: relative(cwd, file).split("\\").join("/"),
        question: shapeOnly ? "is the threat model well formed? (--check)" : "is the threat model ready for launch? (--gate launch)",
        answer, ok, model_ok: result.ok, errors: result.errors, warnings: result.warnings, ...(result.summary ? { summary: result.summary } : {}) });
      if (!ok) process.exitCode = 2;
      return;
    }
    case "guard-test": {
      // Known cases played through the hook script itself, as Claude Code would call it. The keys are fake and
      // assembled here so that this file never holds one.
      const { spawnSync } = await import("node:child_process");
      const hook = fileURLToPath(new URL("./hooks/secrets-guard.mjs", import.meta.url));
      const tail = "a1B2c3D4e5F6g7H8i9J0k1L2";
      const live = ["sk", "live", tail].join("_"), test = ["sk", "test", tail].join("_"), restricted = ["rk", "test", tail].join("_");
      const hookSecret = ["whsec", tail + "m3N4"].join("_");
      const write = (file, content) => JSON.stringify({ tool_name: "Write", tool_input: { file_path: file, content } });
      const cases = [
        ["live secret key in code is blocked", write("/p/src/config.ts", `const stripe = new Stripe("${live}");`), 2],
        ["test secret key in code is blocked", write("/p/src/config.ts", `const stripe = new Stripe("${test}");`), 2],
        ["restricted test key in code is blocked", write("/p/src/pay.ts", `const k = "${restricted}";`), 2],
        ["webhook secret in a README is blocked", write("/p/README.md", `STRIPE_WEBHOOK_SECRET=${hookSecret}`), 2],
        ["key in .env.example is blocked", write("/p/.env.example", `STRIPE_SECRET_KEY=${live}`), 2],
        ["key in .env is allowed", write("/p/.env", `STRIPE_SECRET_KEY=${live}`), 0],
        ["test key in .env.local is allowed", write("/p/.env.local", `STRIPE_SECRET_KEY=${test}`), 0],
        ["key in an Edit is blocked", JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "/p/a.ts", old_string: "x", new_string: `k = "${test}"` } }), 2],
        ["sw-allow-secret allows a deliberate value", write("/p/a.ts", `const k = "${test}"; // sw-allow-secret`), 0],
        ["qp-allow-secret (former marker) still allows it", write("/p/a.ts", `const k = "${test}"; // qp-allow-secret`), 0],
        ["environment reference is allowed", write("/p/a.ts", "const k = process.env.STRIPE_SECRET_KEY;"), 0],
        ["unreadable input passes with a message on stderr", `{"tool_input": {"file_path": "/p/a.ts", "content": "${live}"`, 0, /not valid JSON/],
      ];
      const results = cases.map(([name, input, want, stderrWant]) => {
        const r = spawnSync(process.execPath, [hook], { input, encoding: "utf8", timeout: 10000 });
        const pass = r.status === want && (!stderrWant || stderrWant.test(r.stderr || "")) && (want !== 2 || /sw-allow-secret/.test(r.stderr || ""));
        return { case: name, expected_exit: want, exit: r.status, pass, ...(pass ? {} : { stderr: String(r.stderr || r.error?.message || "").trim().slice(0, 300) }) };
      });
      const failed = results.filter((r) => !r.pass).map((r) => r.case);
      out({ hook: relative(cwd, hook).split("\\").join("/"), ok: !failed.length, passed: results.length - failed.length, failed, cases: results });
      if (failed.length) process.exitCode = 2;
      return;
    }
    case "mobile": {
      const { playMobileFlows, mobileChecks, validateMobile } = await import("./lib/mobile.mjs");
      const project = requireProject();
      const run = currentRun();
      const [sub, ...ids] = rest;
      const d = join(auditsDir(), run);
      if (sub === "check") {
        const result = await mobileChecks(project, cwd);
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, "mobile-check.json"), JSON.stringify(result, null, 2));
        out({ approach: result.approach, platforms: result.platforms, summary: result.summary, failed: Object.fromEntries(Object.entries(result.checks).filter(([, c]) => !c.ok)),
          passed: Object.entries(result.checks).filter(([, c]) => c.ok).map(([k]) => k), not_covered: result.not_covered, note: result.note });
        if (result.summary.must_failed.length) process.exitCode = 2;
        return;
      }
      if (sub === "audit") {
        const { mobileAudit } = await import("./lib/mobile-audit.mjs");
        const result = mobileAudit({ outDir: d, root: cwd });
        if (result.checks) { mkdirSync(d, { recursive: true }); writeFileSync(join(d, "mobile-audit.json"), JSON.stringify(result, null, 2)); }
        out(result);
        if (result.errors?.length || result.summary?.must_failed.length) process.exitCode = 2;
        return;
      }
      if (sub === "flows") {
        if (flag("check")) { const v = validateMobile(project); return out({ ok: !v.errors.length, errors: v.errors, flows: v.flows.map((f) => ({ id: f.id, name: f.name, steps: f.steps.length })) }); }
        const result = playMobileFlows(project, { root: cwd, outDir: d, only: ids });
        if (result.flows) { mkdirSync(d, { recursive: true }); writeFileSync(join(d, "mobile.json"), JSON.stringify(result, null, 2)); }
        out(result);
        if (result.errors?.length || result.summary?.failed.length) process.exitCode = 2;
        return;
      }
      die("Usage: sw.mjs mobile flows [flow-id...] [--check] | sw.mjs mobile check | sw.mjs mobile audit");
    }
    case "desktop": {
      const { desktopChecks } = await import("./lib/desktop.mjs");
      if (rest[0] !== "check") die("Usage: sw.mjs desktop check   (key tasks in the real window: sw.mjs flows --attach <port>)");
      const run = currentRun();
      const result = desktopChecks(cwd);
      if (loadProject(cwd)) { const d = join(auditsDir(), run); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "desktop-check.json"), JSON.stringify(result, null, 2)); }
      out({ kind: result.kind, summary: result.summary, failed: Object.fromEntries(Object.entries(result.checks).filter(([, c]) => !c.ok)), passed: Object.entries(result.checks).filter(([, c]) => c.ok).map(([k]) => k), not_covered: result.not_covered, note: result.note });
      if (result.summary.must_failed.length) process.exitCode = 2;
      return;
    }
    case "perf": {
      const { perfAt } = await import("./lib/perf.mjs");
      const project = loadProject(cwd);
      const run = currentRun();
      if (!rest.length) die("Usage: sw.mjs perf <url> [url...]");
      const urls = rest.map((u) => /^[a-z]+:\/\//i.test(u) ? u : pathToFileURL(resolve(here, u)).href);
      const result = await perfAt(urls, { cwd });
      if (project && result.pages) { const d = join(auditsDir(), run); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "perf.json"), JSON.stringify(result, null, 2)); }
      out(result);
      if (result.pages?.some((p) => p.summary?.must_failed.length)) process.exitCode = 2;
      return;
    }
    case "webhooks": {
      const { webhookProbe } = await import("./lib/security.mjs");
      const project = requireProject();
      const run = currentRun();
      const result = await webhookProbe(project, { base: opt("base") });
      if (result.checks) { const d = join(auditsDir(), run); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "webhooks.json"), JSON.stringify(result, null, 2)); }
      out(result);
      if (result.errors?.length || result.summary?.must_failed.length) process.exitCode = 2;
      return;
    }
    case "facts": {
      const { factsAt } = await import("./lib/facts.mjs");
      const project = loadProject(cwd);
      const run = currentRun();
      if (!rest.length) die("Usage: sw.mjs facts <url> [url...]");
      const file = join(qualityDir(cwd), "facts.json");
      let known = null;
      try { known = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null; } catch (e) { die(`.quality/facts.json is not valid JSON: ${e.message}`); }
      const urls = rest.map((u) => /^[a-z]+:\/\//i.test(u) ? u : pathToFileURL(resolve(here, u)).href);
      const result = await factsAt(urls, { cwd, known });
      if (project && result.pages) { const d = join(auditsDir(), run); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "facts.json"), JSON.stringify(result, null, 2)); }
      out(result);
      if (result.summary?.untraced) process.exitCode = 2;
      return;
    }
    case "billing": {
      const { playBilling } = await import("./lib/billing.mjs");
      const project = requireProject();
      const run = currentRun();
      // The Stripe address can only be replaced by a local one, for the pack's own tests.
      // SW_STRIPE_API, or its former name QP_STRIPE_API.
      const stand = process.env.SW_STRIPE_API || process.env.QP_STRIPE_API;
      const local = stand && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(stand) ? stand : undefined;
      const result = await playBilling(project, { apiBase: local, wait: Number(opt("wait", "20")) * 1000 });
      if (result.stages?.length) { const d = join(auditsDir(), run); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "billing.json"), JSON.stringify(result, null, 2)); }
      out(result);
      if (result.errors?.length || result.summary?.must_failed.length) process.exitCode = 2;
      return;
    }
    case "browser-setup": {
      const { cacheDir, setupCommands } = await import("./lib/browser.mjs");
      const { runCommand } = await import("./lib/run.mjs");
      const dir = cacheDir();
      mkdirSync(dir, { recursive: true });
      if (!existsSync(join(dir, "package.json"))) writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "qp-browser-cache", private: true,
        description: "Playwright and axe-core used by shipwright audits. Safe to delete: `sw.mjs browser-setup` rebuilds it." }, null, 2) + "\n");
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
    case "look": {
      const { lookAt, MODES } = await import("./lib/look.mjs");
      const project = loadProject(cwd);
      const run = currentRun();
      const mode = opt("mode", project?.surface || (project?.profile === "vitrine" ? "persuade" : "operate"));
      if (!MODES.includes(mode)) die(`--mode must be one of ${MODES.join(", ")}`);
      const { takeAll, readBefore } = await import("./lib/browser.mjs");
      const before = readBefore(takeAll(rest, "before"), here);
      const as = opt("as");
      const baselinePath = opt("baseline");
      if (!rest.length) die("Usage: sw.mjs look <url> [url...] [--mode persuade|operate|read] [--baseline old-look.json] [--before \"code or file.js\"] [--as <account>]");
      const baseline = baselinePath ? JSON.parse(readFileSync(resolve(here, baselinePath), "utf8")) : null;
      const urls = rest.map((u) => /^[a-z]+:\/\//i.test(u) ? u : pathToFileURL(resolve(here, u)).href);
      const result = await lookAt(urls, { cwd, mode, baseline, before, as, project, slopWords: [...(ref.slop_words.fr || []), ...(ref.slop_words.en || [])] });
      if (result.errors) { out(result); process.exitCode = 2; return; }
      if (project && result.pages) {
        const d = join(auditsDir(), run);
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, "look.json"), JSON.stringify(result, null, 2));
      }
      const warnings = (result.pages || []).flatMap((p) => (p.warnings || []).map((w) => `${p.url}: ${w}`));
      out(result.pages ? { ...(warnings.length ? { warnings } : {}), mode, version: result.version, ...(as ? { as } : {}), full_report: "look.json",
        tier_meaning: "low = few signs of a generic look, not a good design. point_of_view \"none\" = no visual decision found (one plain family, flat type scale, nothing to see in the first screen, one hue).",
        pages: result.pages.map(({ measures, ...p }) => ({ ...p,
          checks: Object.fromEntries(Object.entries(p.checks || {}).map(([k, c]) => [k, { value: c.value, ok: c.ok, rule: c.rule, ...(c.samples ? { samples: c.samples } : {}) }])) })) } : result);
      if ((result.pages || []).some((p) => p.reach && !p.reach.same_screen)) process.exitCode = 2;
      return;
    }
    case "craft": {
      const { craftAt, compactCraft } = await import("./lib/craft.mjs");
      const { MODES } = await import("./lib/look.mjs");
      const project = loadProject(cwd);
      const run = currentRun();
      const mode = opt("mode", project?.surface || (project?.profile === "vitrine" ? "persuade" : "operate"));
      if (!MODES.includes(mode)) die(`--mode must be one of ${MODES.join(", ")}`);
      const { takeAll, readBefore } = await import("./lib/browser.mjs");
      const before = readBefore(takeAll(rest, "before"), here);
      const as = opt("as");
      if (!rest.length) die("Usage: sw.mjs craft <url> [url...] [--mode persuade|operate|read] [--before \"code or file.js\"] [--as <account>]");
      const urls = rest.map((u) => /^[a-z]+:\/\//i.test(u) ? u : pathToFileURL(resolve(here, u)).href);
      const result = await craftAt(urls, { cwd, mode, before, as, project });
      if (result.errors) { out(result); process.exitCode = 2; return; }
      if (project && result.pages) {
        const d = join(auditsDir(), run);
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, "craft.json"), JSON.stringify(result, null, 2));
      }
      const warnings = (result.pages || []).flatMap((p) => (p.warnings || []).map((w) => `${p.url}: ${w}`));
      out({ ...(warnings.length ? { warnings } : {}), ...compactCraft(result) });
      if ((result.pages || []).some((p) => p.reach && !p.reach.same_screen)) process.exitCode = 2;
      return;
    }
    case "stress": {
      const { stressAt, PASSES } = await import("./lib/stress.mjs");
      const project = loadProject(cwd);
      const run = currentRun();
      const only = (opt("only") || PASSES.join(",")).split(",").map((x) => x.trim()).filter(Boolean);
      const bad = only.filter((x) => !PASSES.includes(x));
      if (bad.length) die(`--only: unknown pass ${bad.join(", ")} (${PASSES.join(", ")})`);
      const { takeAll, readBefore } = await import("./lib/browser.mjs");
      const before = readBefore(takeAll(rest, "before"), here);
      const as = opt("as");
      if (!rest[0]) die("Usage: sw.mjs stress <url> [--only slow,failing,long,narrow,dark,keyboard,no_script] [--before \"code or file.js\"] [--as <account>]");
      const url = /^[a-z]+:\/\//i.test(rest[0]) ? rest[0] : pathToFileURL(resolve(here, rest[0])).href;
      const { mkdtempSync } = await import("node:fs");
      const { tmpdir } = await import("node:os");
      // Outside a project, screenshots go to a temporary folder, never into the current directory.
      const d = project ? join(auditsDir(), run) : mkdtempSync(join(tmpdir(), "qp-stress-"));
      const flags = project ? resolveFlags(project.flags, ref) : new Set();
      const result = await stressAt(url, { cwd, outDir: d, root: cwd, only, darkExpected: flags.has("dark_mode"), publicPage: (project?.surface || "") === "persuade" || project?.profile === "vitrine", before, as, project });
      if (result.passes && project) {
        mkdirSync(d, { recursive: true });
        // One file for the run, one entry per screen.
        const file = join(d, "stress.json");
        const all = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { pages: [] };
        all.pages = [...all.pages.filter((p) => p.url !== result.url), result];
        writeFileSync(file, JSON.stringify(all, null, 2));
      }
      out(result.passes ? { ...(result.warnings ? { warnings: result.warnings } : {}), url: result.url, ...(as ? { as } : {}), baseline: result.baseline, summary: result.summary, failed: Object.fromEntries(Object.entries(result.passes).filter(([, c]) => !c.ok)),
        passed: Object.entries(result.passes).filter(([, c]) => c.ok).map(([k]) => k), skipped: result.skipped, by_eye: result.by_eye, screenshots: join(d, "stress"), note: result.note } : result);
      if (result.errors?.length || result.summary?.must_failed.length || (result.reach && !result.reach.same_screen)) process.exitCode = 2;
      return;
    }
    case "profile": {
      const { profileAt, summarize } = await import("./lib/profile.mjs");
      const save = flag("save");
      if (!rest.length) die("Usage: sw.mjs profile <url> [url...] [--save]");
      const urls = rest.map((u) => /^[a-z]+:\/\//i.test(u) ? u : pathToFileURL(resolve(here, u)).href);
      const result = await profileAt(urls, { cwd });
      if (result.pages && save) {
        const ok = result.pages.filter((p) => !p.error);
        const file = join(qualityDir(cwd), "references.json");
        const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { references: [] };
        const refs = [...prev.references.filter((r) => !ok.some((p) => p.url === r.url)), ...ok.map((p) => ({ ...p, measured: today() }))];
        mkdirSync(qualityDir(cwd), { recursive: true });
        writeFileSync(file, JSON.stringify({ version: result.version, references: refs, summary: summarize(refs) }, null, 2));
        result.saved = { file: ".quality/references.json", references: refs.length };
      }
      return out(result);
    }
    case "gap": {
      const { profileAt, summarize, gap } = await import("./lib/profile.mjs");
      const type = opt("type");
      const device = opt("device", "desktop");
      if (!rest[0]) die("Usage: sw.mjs gap <url> [--type <site-type>] [--device mobile]");
      let summary = null, against = null;
      if (type) {
        const { loadBank } = await import("./lib/bank.mjs");
        const bank = loadBank();
        const t = bank.types[type];
        if (!t) die(`Unknown site type "${type}". Types: ${Object.keys(bank.types).join(", ")}`);
        if (!t.profile) die(`The bank has no measured profile for "${type}" yet: run \`sw.mjs bank measure ${type}\`.`);
        summary = t.profile; against = `reference bank, ${type} (${t.profile.n} sites measured ${t.measured || ""})`;
      } else {
        const file = join(qualityDir(cwd), "references.json");
        if (!existsSync(file)) die("No .quality/references.json: measure the references the user likes first (`sw.mjs profile <url> <url> --save`), or pass --type <site-type> to use the reference bank.");
        const refs = JSON.parse(readFileSync(file, "utf8"));
        if ((refs.references || []).length < 2) die("At least two references are needed to compare with (`sw.mjs profile <url> <url> --save`).");
        summary = refs.summary || summarize(refs.references); against = `${refs.references.length} project references`;
      }
      const url = /^[a-z]+:\/\//i.test(rest[0]) ? rest[0] : pathToFileURL(resolve(here, rest[0])).href;
      const result = await profileAt([url], { cwd });
      if (!result.pages) return out(result);
      if (result.pages[0].error) die(result.pages[0].error);
      const g = gap(result.pages[0], summary, { device });
      const project = loadProject(cwd);
      if (project) { const d = join(auditsDir(), currentRun()); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "gap.json"), JSON.stringify({ url, against, ...g, profile: result.pages[0] }, null, 2)); }
      return out({ url, against, ...g });
    }
    case "bank": {
      const { loadBank, listBank, measureBank, calibrateBank } = await import("./lib/bank.mjs");
      if (rest[0] === "calibrate") {
        const limit = Number(opt("limit", "0")) || 0;
        const parallel = Number(opt("parallel", "4")) || 4;
        if (!rest[1]) die("Usage: sw.mjs bank calibrate <type|all> [--limit N] [--parallel N] [--craft-only]");
        return out(await calibrateBank(rest[1], { cwd, limit, parallel, craftOnly: process.argv.includes("--craft-only") }));
      }
      if (rest[0] === "measure") {
        const limit = Number(opt("limit", "0")) || 0;
        const parallel = Number(opt("parallel", "4")) || 4;
        if (!rest[1]) die("Usage: sw.mjs bank measure <type|all> [--limit N] [--parallel N]");
        return out(await measureBank(rest[1], { cwd, limit, parallel }));
      }
      return out(listBank(loadBank(), rest[0]));
    }
    case "variants": {
      const { shootVariants, tallyVariants } = await import("./lib/variants.mjs");
      const { MODES } = await import("./lib/look.mjs");
      const project = loadProject(cwd);
      const tally = flag("tally");
      const asked = opt("mode");
      const mode = asked || project?.surface || (project?.profile === "vitrine" ? "persuade" : "operate");
      if (!MODES.includes(mode)) die(`--mode must be one of ${MODES.join(", ")}`);
      const [name, ...urls] = rest;
      if (!name) die("Usage: sw.mjs variants <name> <url> <url> [url...] [--mode persuade|operate|read]   |   sw.mjs variants <name> --tally");
      if (tally) { const r = tallyVariants(name, { root: cwd }); out(r); if (r.errors) process.exitCode = 2; return; }
      const r = await shootVariants(name, urls.map((u) => /^[a-z]+:\/\//i.test(u) ? u : pathToFileURL(resolve(here, u)).href), { root: cwd, cwd, mode });
      if (!r.errors && r.available !== false) {
        r.mode = mode;
        r.mode_from = asked ? "--mode" : project?.surface ? "project.json › surface (a public page is measured with --mode persuade)" : "default";
      }
      out(r);
      if (r.errors) process.exitCode = 2;
      return;
    }
    case "deslop": {
      // Spacing, alignment and execution audit of a rendered page (scripts/deslop, driven over CDP with the
      // installed Chrome or Edge, no Playwright needed). Options are passed through: --widths, --click, --before,
      // --tauri, --dark, --attach, --wait.
      const { spawnSync } = await import("node:child_process");
      const run = currentRun();
      const project = loadProject(cwd);
      const as = opt("as");
      if (!rest.length) die('Usage: sw.mjs deslop <url|file.html> [--widths 375,768,1440,1920] [--click "selector"] [--before file.js] [--tauri] [--dark] [--attach port] [--as <account>]');
      const outDir = project ? join(auditsDir(), run, "deslop") : join(qualityDir(cwd), "deslop");
      const script = fileURLToPath(new URL("./deslop/audit.mjs", import.meta.url));
      const args = [...rest];
      if (!args.includes("--widths") && !args.includes("--attach")) args.push("--widths", "375,768,1440,1920");
      // --as <account>: log in once (Playwright, login steps of project.json › access.accounts), then hand the
      // session to the audit, which reuses it at every width: one login per command, not one per width.
      let sessionFile = null;
      if (as) {
        const target = rest.find((a) => /^https?:\/\//i.test(a));
        if (!target) die("--as needs the address of a served page (http:// or https://)");
        const { loadBrowserTools, launch, accountSession } = await import("./lib/browser.mjs");
        const tools = await loadBrowserTools(cwd);
        if (!tools) die("--as plays the account's login steps with Playwright, which is not available. Run `node <sw.mjs> browser-setup` once (pack cache, not the project).");
        const browser = await launch(tools.chromium);
        let session;
        try { session = await accountSession(browser, project, as, { root: cwd, base: new URL(target).origin }); } catch (e) { await browser.close(); die(String(e.message)); }
        await browser.close();
        const { mkdtempSync } = await import("node:fs");
        const { tmpdir } = await import("node:os");
        sessionFile = join(mkdtempSync(join(tmpdir(), "sw-session-")), "session.json");
        writeFileSync(sessionFile, JSON.stringify(session));
        args.push("--session", sessionFile);
      }
      const audit = () => spawnSync(process.execPath, [script, ...args, "--out", outDir, "--json"], { cwd: here, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      let r = audit();
      // On a busy machine the browser sometimes fails to start in time: one more try before giving up.
      if (r.status !== 0 && /did not start|timed out|ECONNREFUSED|ECONNRESET/i.test(r.stderr || "")) r = audit();
      if (sessionFile) { const { rmSync } = await import("node:fs"); try { rmSync(join(sessionFile, ".."), { recursive: true, force: true }); } catch { /* temporary folder */ } }
      if (r.status !== 0) die((r.stderr || r.stdout || "deslop failed").trim());
      const reports = JSON.parse(r.stdout);
      const result = { widths: reports.map((x) => ({ width: x.viewport.width, counts: x.counts, text_length: x.textLength, js_errors: x.errors.length,
        ...(x.reach ? { measured_url: x.reach.final } : {}),
        screenshots: { fold: relative(cwd, x.screenshots.fold), full: relative(cwd, x.screenshots.full) },
        findings: x.findings.map((f) => ({ rule: f.rule, severity: f.severity, count: f.count, fix: f.fix, examples: f.examples.slice(0, 3) })),
        ...(x.intended?.length ? { intended: x.intended } : {}),
        ...(x.notChecked?.length ? { not_checked: x.notChecked } : {}),
        system: { spacing_values: x.stats.spacing.distinct, off_scale_percent: x.stats.spacing.offScaleShare, font_sizes: x.stats.fontSizes.map(([v]) => v).sort((a, b) => a - b) } })) };
      result.total = result.widths.reduce((t, w) => ({ high: t.high + w.counts.high, med: t.med + w.counts.med, low: t.low + w.counts.low }), { high: 0, med: 0, low: 0 });
      // A redirect (to the login page, most often) means another page was measured: said first, and never a pass.
      const off = reports.filter((x) => x.reach && !x.reach.same_screen);
      const denied = reports.flatMap((x) => x.reach?.denied || []);
      result.warnings = [
        ...(off.length ? [`NOT THE REQUESTED SCREEN: asked for ${off[0].reach.requested}, the browser ended on ${off[0].reach.final} at ${off.map((x) => `${x.viewport.width}px`).join(", ")}. These counts are about that page: do not read them as a pass. Use --as <account> (access.accounts in project.json) or --before.`] : []),
        ...(denied.length ? [`${denied.length} response(s) ${[...new Set(denied.map((x) => x.status))].join(", ")} while measuring, first ${denied[0].url}${denied.some((x) => x.status === 429) ? ": the app's rate limit refused requests; wait a minute (--as logs in once for every width)" : ""}`] : []),
        ...result.widths.filter((w) => w.text_length < 40).map((w) => `${w.width}px: page almost empty — the intended state was not reached (use --click or --before)`),
      ];
      if (off.length) result.verdict = "not measured: redirected away from the requested screen";
      if (project) {
        writeFileSync(join(auditsDir(), run, "deslop.json"), JSON.stringify(result, null, 2));
        recordSavings(join(auditsDir(), run), estimateTokens(r.stdout), estimateTokens(JSON.stringify(result)));
      }
      out(off.length || denied.length ? { warnings: result.warnings, ...result, full_report: relative(cwd, join(outDir, "report.json")) } : { ...result, full_report: relative(cwd, join(outDir, "report.json")) });
      if (off.length) process.exitCode = 2;
      return;
    }
    case "tiles": {
      // Style tiles of the design-direction skill, served on a local port, captured and shown side by side.
      const { showTiles } = await import("./lib/tiles.mjs");
      const dir = rest[0] ? resolve(here, rest[0]) : join(qualityDir(cwd), "design", "tiles");
      const result = await showTiles(dir, { cwd, root: cwd });
      out(result);
      if (result.errors || result.problems) process.exitCode = 2;
      return;
    }
    case "tokens": {
      const { checkTokens } = await import("./lib/tokens.mjs");
      const { listFiles } = await import("./lib/scan.mjs");
      const files = rest.length ? rest : listFiles(cwd).filter((f) => /\.tokens\.json$/.test(f));
      if (!files.length) die("No design token files (*.tokens.json). Pass the files, or write them with the sw:design-direction skill.");
      // Several files are merged in order (primitives first, then semantic, then themes).
      const merge = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === "object" && !Array.isArray(v) && !("$value" in v) && a[k] && typeof a[k] === "object" ? merge(a[k], v) : v; return a; };
      const doc = files.reduce((acc, f) => merge(acc, JSON.parse(readFileSync(rest.length ? resolve(here, f) : join(cwd, f), "utf8"))), {});
      const r = checkTokens(doc);
      out({ files, ok: !r.errors.length && !r.contrast.failing, ...r });
      if (r.errors.length || r.contrast.failing) process.exitCode = 2;
      return;
    }
    case "report": {
      const project = requireProject();
      const run = opt("run") || opt("date") || auditRuns().at(-1);
      if (!run || !loadAudit(run)) die("No assembled audit yet: run /sw:audit first.");
      const report = compute(loadAudit(run), ref);
      report.mode = loadAudit(run).mode;
      return out({ run, html_report: await writeHtmlReport(run, report, opt("lang", project.language || "fr"), project) });
    }
    case "record": {
      const { parseCodegen, playwrightCli, runRecorder } = await import("./lib/record.mjs");
      const { validateFlows } = await import("./lib/flows.mjs");
      const project = requireProject();
      const name = opt("name"), from = opt("from"), device = opt("device", "desktop"), start = opt("start", "/");
      const base = opt("base") || project.urls?.local || project.urls?.staging || project.urls?.production;
      const id = rest[0];
      if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) die('Usage: sw.mjs record <flow-id> [--name "the task in the user\'s words"] [--start /path] [--device desktop|mobile] [--base URL] [--from recorded.js]');
      let code;
      if (from) code = readFileSync(from, "utf8");
      else {
        if (!base) die("No URL: pass --base <url> or set urls.local in .quality/project.json.");
        const { loadBrowserTools } = await import("./lib/browser.mjs");
        const tools = await loadBrowserTools(cwd);
        if (!tools) die("Playwright is not available: run `sw.mjs browser-setup` first (it installs into the pack's cache).");
        const cli = playwrightCli(tools.path);
        if (!cli) die("Could not find Playwright's command line next to " + tools.path);
        process.stderr.write("A browser opens: do the task as a user would, then close the window.\n");
        code = runRecorder(cli, new URL(start, base).href, { device });
      }
      const { steps, warnings } = parseCodegen(code, { base });
      if (!steps.length) die("Nothing was recorded.");
      const flows = Array.isArray(project.flows) ? project.flows : [];
      const old = flows.find((f) => f.id === id) || {};
      const flow = { ...old, id, name: name || old.name || id, devices: old.devices || ["mobile", "desktop"], steps };
      const next = { ...project, flows: [...flows.filter((f) => f.id !== id), flow] };
      const check = validateFlows(next);
      mkdirSync(join(qualityDir(cwd), "recordings"), { recursive: true });
      writeFileSync(join(qualityDir(cwd), "recordings", `${id}.js`), code);
      writeFileSync(join(qualityDir(cwd), "project.json"), JSON.stringify(next, null, 2) + "\n");
      return out({ saved: ".quality/project.json", flow, warnings, errors: check.errors,
        next: "Mark the steps where the user decides with \"decision\": true, set \"preview\" and \"primary\" if the task has them, then run `sw.mjs flows " + id + "`." });
    }
    case "score": {
      if (!rest[0]) die("Usage: sw.mjs score <audit.json> [--previous old.json] [--lang fr|en]");
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
    case "skills": {
      const { listSkills } = await import("./lib/standalone.mjs");
      const l = listSkills();
      return out({ ...l, how: "Read one with: node sw.mjs skill <name>. A skill marked asked_by_the_user_only is a command (/sw:kickoff, /sw:audit…): follow it only when the user asked for it." });
    }
    case "skill": {
      const { readSkill } = await import("./lib/standalone.mjs");
      if (!rest[0]) die("Usage: sw.mjs skill <name> [notes from the user]");
      const r = readSkill(rest[0], { args: rest.slice(1).join(" ") });
      if (r.error) { out(r); process.exit(1); }
      process.stdout.write(`<!-- Shipwright skill "${r.name}", read without the plugin system. Plugin folder: ${r.plugin_root}${r.references.length ? `. Reference files to read when the skill names them: ${r.references.join(", ")}` : ""}. Where the text says to run another skill or /sw: command, read it the same way: node sw.mjs skill <name>. -->\n`);
      return process.stdout.write(r.text.endsWith("\n") ? r.text : r.text + "\n");
    }
    case "install": {
      const { installPlugins } = await import("./lib/install.mjs");
      const { detect } = await import("./lib/detect.mjs");
      const modules = (opt("modules", "") || "").split(",").map((x) => x.trim()).filter(Boolean);
      const scope = opt("scope", "user");
      let detected = [];
      try { detected = detect(cwd, findStacks(cwd)).stacks || []; } catch { /* a project that cannot be read installs the main plugin only */ }
      let declared = [];
      try { declared = loadProject(cwd)?.stacks || []; } catch { /* unreadable project.json: detected stacks only */ }
      const r = installPlugins({ cwd, modules, detected, declared: Array.isArray(declared) ? declared : [], scope });
      out(r);
      if (r.error || r.failed?.length) process.exit(1);
      return;
    }
    case "doctor": {
      const { doctor } = await import("./lib/doctor.mjs");
      return out(doctor({ cwd }));
    }
    case "enable": {
      const { enableInProject } = await import("./lib/standalone.mjs");
      const modules = (opt("modules", "") || "").split(",").map((x) => x.trim()).filter(Boolean);
      const r = enableInProject(cwd, modules);
      out(r);
      if (r.error) process.exit(1);
      return;
    }
    default:
      process.stdout.write(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n").replace(/^\/\/ ?/gm, "") + "\n");
  }
}

main().catch((e) => die(e.stack || String(e)));
