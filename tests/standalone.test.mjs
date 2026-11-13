// Tests of the ways to use Shipwright without the plugin loaded in the session. Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SW = join(ROOT, "plugins/core/scripts/sw.mjs");
const sw = (cwd, ...args) => spawnSync("node", [SW, ...args], { cwd, encoding: "utf8" });

test("standalone: every skill and agent is listed and can be read with its paths filled in", () => {
  const list = JSON.parse(sw(ROOT, "skills").stdout);
  const onDisk = readdirSync(join(ROOT, "plugins/core/skills")).filter((d) => existsSync(join(ROOT, "plugins/core/skills", d, "SKILL.md")));
  for (const name of onDisk) assert.ok(list.skills.some((s) => s.name === name && s.plugin === "sw"), `skill ${name} is not listed`);
  assert.ok(list.skills.some((s) => s.plugin === "sw-nextjs"), "the stack modules of a clone are listed too");
  assert.deepEqual(list.agents.map((a) => a.name).sort(), ["art-director", "auditor", "challenger", "ergonomist", "juror"]);
  const kickoff = list.skills.find((s) => s.name === "kickoff");
  assert.equal(kickoff.slash_command, "/sw:kickoff");
  assert.equal(kickoff.asked_by_the_user_only, true);
  assert.ok(kickoff.description.length > 40);

  // No skill is printed with a placeholder left in: an agent could not resolve it.
  for (const s of list.skills.filter((x) => x.plugin === "sw")) {
    const text = sw(ROOT, "skill", s.name).stdout;
    assert.ok(!text.includes("${CLAUDE_PLUGIN_ROOT}") && !text.includes("$ARGUMENTS"), `${s.name} keeps a placeholder`);
    assert.match(text, /^<!-- Shipwright skill /);
  }
  const k = sw(ROOT, "skill", "/sw:kickoff", "an", "invoicing", "app").stdout;
  assert.match(k, /Extra notes from the user: an invoicing app/);
  assert.match(k, /plugins\/core\/scripts\/sw\.mjs/);
  assert.match(sw(ROOT, "skill", "premium-craft").stdout, /Reference files to read when the skill names them: .*details\.md/);
  assert.match(sw(ROOT, "skill", "auditor").stdout, /name: auditor/);
  const missing = sw(ROOT, "skill", "no-such-skill");
  assert.equal(missing.status, 1);
  assert.ok(JSON.parse(missing.stdout).known.includes("from-zero"));
});

test("standalone: enable writes the project settings and keeps what was there", () => {
  const dir = mkdtempSync(join(tmpdir(), "sw-"));
  mkdirSync(join(dir, ".claude"));
  const file = join(dir, ".claude/settings.json");
  writeFileSync(file, JSON.stringify({ permissions: { allow: ["Bash(ls:*)"] }, enabledPlugins: { "other@elsewhere": true } }));
  const r = sw(dir, "enable", "--modules", "nextjs,sw-vps");
  assert.equal(r.status, 0);
  const s = JSON.parse(readFileSync(file, "utf8"));
  assert.deepEqual(s.permissions, { allow: ["Bash(ls:*)"] });
  assert.deepEqual(s.extraKnownMarketplaces.shipwright, { source: { source: "github", repo: "1AngelMicka/quality-pack" } });
  assert.deepEqual(s.enabledPlugins, { "other@elsewhere": true, "sw@shipwright": true, "sw-nextjs@shipwright": true, "sw-vps@shipwright": true });
  // The names it accepts are the ones the marketplace publishes.
  const market = JSON.parse(readFileSync(join(ROOT, ".claude-plugin/marketplace.json"), "utf8"));
  const empty = mkdtempSync(join(tmpdir(), "sw-"));
  for (const p of market.plugins.filter((x) => x.name !== "sw")) assert.equal(sw(empty, "enable", "--modules", p.name).status, 0, p.name);
  assert.equal(Object.keys(JSON.parse(readFileSync(join(empty, ".claude/settings.json"), "utf8")).enabledPlugins).length, market.plugins.length);
  const bad = sw(empty, "enable", "--modules", "nope");
  assert.equal(bad.status, 1);
  assert.match(JSON.parse(bad.stdout).error, /Unknown module/);
  // A broken settings file is never overwritten.
  writeFileSync(file, "{ not json");
  assert.equal(sw(dir, "enable").status, 1);
  assert.equal(readFileSync(file, "utf8"), "{ not json");
});

test("manifests: no key that the plugin installer refuses", () => {
  // `claude plugin install` rejected the stack modules for an unknown "dependencies" key.
  const allowed = new Set(["name", "description", "version", "author", "license", "homepage", "repository", "keywords"]);
  for (const d of readdirSync(join(ROOT, "plugins"))) {
    const f = join(ROOT, "plugins", d, ".claude-plugin/plugin.json");
    if (!existsSync(f)) continue;
    const extra = Object.keys(JSON.parse(readFileSync(f, "utf8"))).filter((k) => !allowed.has(k));
    assert.deepEqual(extra, [], `${d}/plugin.json`);
  }
  // When the claude CLI is there, it validates the marketplace itself.
  try { execFileSync("claude", ["--version"], { stdio: "ignore", shell: process.platform === "win32" }); } catch { return; }
  const env = { ...process.env }; delete env.CLAUDECODE;
  const v = spawnSync("claude", ["plugin", "validate", ROOT], { encoding: "utf8", env, shell: process.platform === "win32" });
  assert.equal(v.status, 0, v.stdout + v.stderr);
});

test("install: the marketplace, the main plugin and the modules found in the project, without the session variable", () => {
  const fake = join(ROOT, "tests/fixtures/fake-claude.mjs");
  const dir = mkdtempSync(join(tmpdir(), "sw-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", dependencies: { next: "15.0.0", react: "19.0.0" } }));
  const log = join(dir, "claude.log");
  const run = (args, extra = {}) => spawnSync("node", [SW, "install", ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, CLAUDECODE: "1", SW_CLAUDE_BIN: fake, FAKE_CLAUDE_LOG: log, ...extra } });
  // Run as an agent would, inside a session: the variable that makes claude refuse is not passed on.
  const first = run(["--modules", "vps"]);
  assert.equal(first.status, 0, first.stdout + first.stderr);
  const r = JSON.parse(first.stdout);
  assert.deepEqual(r.installed, ["sw@shipwright", "sw-vps@shipwright", "sw-nextjs@shipwright"]);
  assert.match(r.next, /\/reload-plugins/);
  const asked = readFileSync(log, "utf8").trim().split("\n");
  assert.ok(asked.includes("plugin marketplace add 1AngelMicka/quality-pack"));
  assert.ok(asked.includes("plugin install sw-nextjs@shipwright --scope user"));
  // A second run updates the marketplace instead of adding it again.
  const second = JSON.parse(run(["--scope", "project"]).stdout);
  assert.match(second.steps[0].step, /already known, updated/);
  assert.ok(readFileSync(log, "utf8").includes("plugin install sw@shipwright --scope project"));
  // A failed install is reported and the command exits with an error.
  const bad = run([], { FAKE_CLAUDE_FAIL: "sw-nextjs" });
  assert.equal(bad.status, 1);
  assert.deepEqual(JSON.parse(bad.stdout).failed, ["install sw-nextjs@shipwright"]);
  assert.match(JSON.parse(run(["--modules", "nope"]).stdout).error, /Unknown module/);
  assert.match(JSON.parse(run(["--scope", "everyone"]).stdout).error, /Unknown scope/);
  // No claude command on the machine: a clear message that names the other ways.
  const none = JSON.parse(run([], { SW_CLAUDE_BIN: "no-such-claude-command" }).stdout);
  assert.match(none.error, /sw\.mjs skills/);
});
