// Tests of the CLI fixes asked for by the first real pilot project (feedback file, entries 1, 5, 6, 8, 13, 14, 15,
// 19, 20, 25, 26/56, 35, 49). Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SW = join(ROOT, "plugins/core/scripts/sw.mjs");
const run = (cwd, args, env = {}) => spawnSync("node", [SW, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } });
const sw = (cwd, ...args) => { const r = run(cwd, args); assert.equal(r.status, 0, r.stdout + r.stderr); return JSON.parse(r.stdout); };
const tmp = (p = "sw-fb-") => mkdtempSync(join(tmpdir(), p));
const write = (dir, rel, text) => { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), typeof text === "string" ? text : JSON.stringify(text, null, 2)); };
const git = (cwd, ...args) => spawnSync("git", args, { cwd, encoding: "utf8" });
const lib = (name) => import(new URL(`../plugins/core/scripts/lib/${name}`, import.meta.url));

test("detect [5][13]: notes and .quality/ are not code, and an empty project gets a default profile, not invented reasons", () => {
  const dir = tmp();
  write(dir, "docs/brief.md", "# Brief\n");
  write(dir, "reports/market.md", "# Market\n");
  write(dir, "research_notes/notes.md", "notes\n");
  write(dir, ".quality/project.json", { name: "x", profile: "saas", stacks: [] });
  const d = sw(dir, "detect");
  assert.equal(d.is_new_project, true, "documents and .quality/ do not make a project old");
  assert.equal(d.source_files, 0);
  assert.equal(d.profile_default, true);
  assert.match(d.profile_why, /default for an empty project/);
  write(dir, "src/main.ts", "export const x = 1;\n");
  const after = sw(dir, "detect");
  assert.equal(after.is_new_project, false, "source code makes it an existing project");
  assert.match(after.profile_why, /^default: no UI/, "code without any sign is still a default, said as such");
  write(dir, "package.json", { name: "x", dependencies: { fastify: "5" } });
  const api = sw(dir, "detect");
  assert.equal(api.profile, "api");
  assert.equal(api.profile_default, false);
});

test("detect [8]: the Git root is returned, with a warning when it is not the project folder", () => {
  const parent = tmp();
  if (git(parent, "init", "-q").status !== 0) return; // no git on this machine
  const project = join(parent, "facturation");
  mkdirSync(project);
  const inside = sw(project, "detect");
  assert.ok(inside.git_root, "the parent repository is found");
  assert.equal(inside.warnings.length, 1);
  assert.match(inside.warnings[0], /parent folder/);
  git(project, "init", "-q");
  const own = sw(project, "detect");
  assert.deepEqual(own.warnings, []);
  assert.equal(own.git_root.toLowerCase().replace(/\\/g, "/").replace(/\/$/, "").split("/").at(-1), "facturation");
});

test("graph [6]: no refresh advice for a project where the graph is not recommended", async () => {
  const { graphStatus } = await lib("graph.mjs");
  const dir = tmp();
  write(dir, "src/a.ts", "export const a = 1;\n");
  const g = graphStatus(dir);
  assert.equal(g.recommended, false);
  assert.doesNotMatch(g.advice, /graph refresh/);
});

test("install [15]: the stacks declared in project.json are installed even before there is code", () => {
  const fake = join(ROOT, "tests/fixtures/fake-claude.mjs");
  const dir = tmp();
  write(dir, ".quality/project.json", { name: "x", profile: "saas", stacks: ["node-api", "tauri", "infra-vps"] });
  const log = join(dir, "claude.log");
  const r = run(dir, ["install"], { CLAUDECODE: "1", SW_CLAUDE_BIN: fake, FAKE_CLAUDE_LOG: log });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const installed = JSON.parse(r.stdout).installed;
  for (const p of ["sw@shipwright", "sw-node-api@shipwright", "sw-tauri@shipwright", "sw-vps@shipwright"]) assert.ok(installed.includes(p), `${p} in ${installed}`);
  assert.equal(new Set(installed).size, installed.length);
});

test("enable [14]: the output says that accepting the marketplace does not always install, and names install", () => {
  const dir = tmp();
  const r = sw(dir, "enable");
  assert.match(r.warning, /does not always install/);
  assert.match(r.warning, /sw\.mjs install/);
  const guide = readFileSync(join(ROOT, "docs/AGENT_GUIDE.md"), "utf8");
  assert.match(guide, /does not always install the plugin/);
  assert.match(guide, /sw\.mjs doctor/);
});

test("doctor [1]: reads Claude Code's files and says what is installed, enabled and hooked", () => {
  const config = tmp("sw-cfg-");
  const project = tmp();
  const env = { CLAUDE_CONFIG_DIR: config };
  const none = JSON.parse(run(project, ["doctor"], env).stdout);
  assert.equal(none.ok, false);
  assert.equal(none.marketplace.known, false);
  assert.equal(none.plugin.installed, false);
  assert.ok(none.problems.some((p) => /not installed/.test(p)));
  assert.match(none.next, /sw\.mjs install/);
  // Marketplace declared by enable but never accepted.
  sw(project, "enable");
  const offered = JSON.parse(run(project, ["doctor"], env).stdout);
  assert.equal(offered.marketplace.declared_in_project_settings, true);
  assert.ok(offered.problems.some((p) => /never accepted/.test(p)));
  // Installed for the user, a module for this project only, enabled in the user settings.
  write(config, "plugins/known_marketplaces.json", { shipwright: { source: { source: "github", repo: "1AngelMicka/quality-pack" }, installLocation: join(config, "nowhere"), lastUpdated: "2026-11-13T00:00:00Z" } });
  write(config, "plugins/installed_plugins.json", { version: 2, plugins: {
    "sw@shipwright": [{ scope: "user", installPath: join(ROOT, "plugins/core"), version: "0.8.4" }],
    "sw-node-api@shipwright": [{ scope: "project", projectPath: project, installPath: join(ROOT, "plugins/stack-node-api"), version: "0.8.4" }],
    "sw-tauri@shipwright": [{ scope: "project", projectPath: join(project, "..", "other"), installPath: "x", version: "0.8.4" }] } });
  write(config, "settings.json", { enabledPlugins: { "sw@shipwright": true, "sw-node-api@shipwright": true } });
  const d = JSON.parse(run(project, ["doctor"], env).stdout);
  assert.equal(d.ok, true, JSON.stringify(d.problems));
  assert.equal(d.plugin.installed_for_this_project, true);
  assert.equal(d.plugin.enabled_for_this_project, true);
  assert.equal(d.versions.installed, "0.8.4");
  assert.ok(d.versions.this_script);
  assert.deepEqual(d.hooks.declared.map((h) => h.event).sort(), ["PreToolUse", "SessionStart"]);
  assert.ok(d.hooks.declared.some((h) => h.script === "secrets-guard.mjs"));
  const nodeApi = d.modules.find((m) => m.plugin === "sw-node-api@shipwright");
  assert.equal(nodeApi.installed, true, "a project-scope install for this folder counts");
  assert.equal(nodeApi.enabled, true);
  assert.equal(d.modules.find((m) => m.plugin === "sw-tauri@shipwright")?.installed ?? false, false, "a module installed for another folder does not count here");
  assert.deepEqual(d.problems, []);
  // Turned off for this project in the local settings: the most specific setting wins.
  write(project, ".claude/settings.local.json", { enabledPlugins: { "sw@shipwright": false } });
  const off = JSON.parse(run(project, ["doctor"], env).stdout);
  assert.equal(off.ok, false);
  assert.ok(off.problems.some((p) => /turned off/.test(p)));
});

test("scan [19]: docs/, reports/, research_notes/ and project.json › scan_exclude are left out", () => {
  const dir = tmp();
  write(dir, ".quality/project.json", { name: "x", profile: "webapp", flags: ["has_ui"], scan_exclude: ["notes/**", "src/legacy/"] });
  write(dir, "reports/Logiciels.md", "# Le meilleur de la facturation\nlorem ipsum\n");
  write(dir, "research_notes/a.md", "lorem ipsum\n");
  write(dir, "docs/b.tsx", "export const B = () => <p>lorem ipsum</p>;\n");
  write(dir, "notes/c.tsx", "export const C = () => <p>lorem ipsum</p>;\n");
  write(dir, "src/legacy/d.tsx", "export const D = () => <p>lorem ipsum</p>;\n");
  write(dir, "src/App.tsx", "export const App = () => <p>lorem ipsum</p>;\n");
  const r = sw(dir, "scan");
  assert.deepEqual(r.findings.placeholder_scan.map((f) => f.file), ["src/App.tsx"]);
  assert.equal(r.excluded.files, 5);
});

test("scan [19]: \"!docs\" scans docs/ again", async () => {
  const { scan } = await lib("scan.mjs");
  const dir = tmp();
  write(dir, "docs/b.tsx", "export const B = () => { console.log('b'); return null; };\n");
  const ref = { slop_words: { fr: [], en: [] } };
  assert.equal(scan(dir, ref).summary.debug_leftovers_scan, 0);
  assert.equal(scan(dir, ref, { exclude: ["!docs"] }).summary.debug_leftovers_scan, 1);
});

test("run [20]: a short output is returned as is, without a costlier summary", () => {
  const dir = tmp();
  const r = sw(dir, "run", "install", `node -e "for (let i = 0; i < 8; i++) console.log('added ' + i + ' packages')"`);
  assert.equal(r.output.length, 8);
  assert.equal(r.output[0], "added 0 packages");
  assert.equal(r.signal_lines, undefined);
  assert.equal(r.last_lines, undefined);
});

test("tokens [26][56]: on-X and X-inverse are checked on X only", async () => {
  const { checkTokens } = await lib("tokens.mjs");
  const doc = { light: { $type: "color",
    bg: { $value: "#fdf8ee" }, surface: { $value: "#ffffff" }, text: { $value: "#1a1a1a" },
    accent: { $value: "#1d4ed8" }, "on-accent": { $value: "#ffffff" },
    tampon: { $value: "#b91c1c" }, "tampon-inverse": { $value: "#ffffff" },
    "on-ghost": { $value: "#ffffff" } } };
  const r = checkTokens(doc);
  const rows = r.contrast.rows;
  const of = (fg) => rows.filter((x) => x.fg === `light.${fg}`).map((x) => x.bg);
  assert.deepEqual(of("on-accent"), ["light.accent"]);
  assert.deepEqual(of("tampon-inverse"), ["light.tampon"]);
  assert.deepEqual(of("text").sort(), ["light.bg", "light.surface"], "accent is a background for its on- colour only");
  assert.equal(r.contrast.failing, 0, JSON.stringify(rows.filter((x) => !x.ok)));
  assert.ok(r.warnings.some((w) => w.includes("light.on-ghost") && w.includes('"ghost"')));
  // A real failure on the pair is still caught.
  const bad = checkTokens({ light: { $type: "color", bg: { $value: "#fff" }, accent: { $value: "#93c5fd" }, "on-accent": { $value: "#ffffff" } } });
  assert.deepEqual(bad.contrast.rows.filter((x) => !x.ok).map((x) => [x.fg, x.bg]), [["light.on-accent", "light.accent"]]);
});

test("variants [35]: --mode is documented and checked", () => {
  const help = spawnSync("node", [SW], { encoding: "utf8" }).stdout;
  assert.match(help, /variants <name> <url> <url> \[url\.\.\.\] \[--mode persuade\|operate\|read\]/);
  const dir = tmp();
  const bad = run(dir, ["variants", "home", "a.html", "b.html", "--mode", "sell"]);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /--mode must be one of persuade, operate, read/);
});

test("plan [49]: {api_url} is filled from project.json › api_url, and falls back to the app URL", () => {
  const stack = JSON.parse(readFileSync(join(ROOT, "plugins/stack-node-api/stack.json"), "utf8"));
  assert.match(stack.checks.load_test.run, /\{api_url\}\/health/);
  assert.match(stack.checks.load_test.pass_if, /add -D autocannon/, "a fallback when npx --yes is not allowed");
  assert.ok("api_url" in JSON.parse(readFileSync(join(ROOT, "plugins/core/templates/project.json"), "utf8")));
  const dir = tmp();
  cpSync(join(ROOT, "tests/fixtures/app"), dir, { recursive: true });
  const project = JSON.parse(readFileSync(join(dir, ".quality/project.json"), "utf8"));
  // A stack file of the project's own, so that the test does not depend on which copy of the modules is found.
  write(dir, ".quality/stacks/node-api.json", { qp_stack: true, stack: "node-api", plugin: "sw-node-api", checks: { load_test: { run: "autocannon {api_url}/health", pass_if: "ok" } } });
  const planOf = () => readFileSync(join(dir, sw(dir, "plan", "SCL-01").out_dir, "plan.json"), "utf8");
  write(dir, ".quality/project.json", { ...project, stacks: ["node-api"], api_url: "http://localhost:3001/" });
  assert.match(planOf(), /autocannon http:\/\/localhost:3001\/health/);
  write(dir, ".quality/project.json", { ...project, stacks: ["node-api"] });
  assert.match(planOf(), /autocannon http:\/\/localhost:8765\/health/);
});

test("bank [25]: sites not seen on a screenshot stay out of the measured profile", async () => {
  const { loadBank, notSeen, listBank } = await lib("bank.mjs");
  assert.equal(notSeen({ why: "Public demo project that opens in the app. (not seen on a screenshot)" }), true);
  assert.equal(notSeen({ why: "On capture only a loader (not seen beyond the loader)." }), true);
  assert.equal(notSeen({ why: "Seen and measured." }), false);
  const dir = tmp("sw-bank-");
  const prof = (h1) => ({ type: { body_px: 16 }, layout: { h1_px: h1 } });
  write(dir, "t.json", { label: { fr: "T", en: "T" }, expects: [{ rule: "r" }], avoid: ["x"], sites: [
    { url: "https://a.example/", name: "A", why: "x".repeat(40), recognition: "r" },
    { url: "https://b.example/", name: "B", why: "y".repeat(40), recognition: "r" },
    { url: "https://c.example/", name: "C", why: "Dashboard of the app. (not seen on a screenshot)", recognition: "r" }] });
  write(dir, "profiles/t.json", { type: "t", version: 1, measured: "2026-11-01", summary: { n: 3 }, sites: [
    { url: "https://a.example/", ok: true, desktop: prof(40), mobile: prof(30) },
    { url: "https://b.example/", ok: true, desktop: prof(44), mobile: prof(32) },
    { url: "https://c.example/", ok: true, desktop: prof(64), mobile: prof(48) }] });
  const bank = loadBank(dir);
  assert.equal(bank.types.t.profile.n, 2);
  assert.deepEqual(bank.types.t.profile_excludes, ["https://c.example/"]);
  assert.equal(bank.types.t.profile.desktop["layout.h1_px"].max, 44);
  assert.deepEqual(listBank(bank, "t").profile.left_out, ["https://c.example/"]);
});
