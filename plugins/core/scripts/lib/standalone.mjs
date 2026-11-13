// Using Shipwright without the plugin being loaded in the session: an agent that cannot type /plugin commands,
// or another coding agent altogether, lists the skills, reads one with its paths filled in, or writes the
// project settings that make Claude Code offer the plugin the next time the project is opened.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const CORE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const MARKETPLACE = "shipwright";
export const REPOSITORY = "1AngelMicka/quality-pack";
export const MODULES = ["sw", "sw-nextjs", "sw-node-api", "sw-vps", "sw-expo", "sw-capacitor", "sw-tauri", "sw-electron"];

// Front matter of a skill or agent file: only the plain "key: value" lines are needed here.
export function frontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"');
  }
  return out;
}

// The plugins that sit next to the core one: in a clone of the repository, or in Claude Code's plugin cache
// (where each plugin has its own folder, so only the ones that are there are listed).
function pluginRoots(core = CORE) {
  const parent = dirname(core);
  const roots = [core];
  if (existsSync(join(parent, "..", ".claude-plugin", "marketplace.json"))) {
    for (const d of readdirSync(parent)) if (join(parent, d) !== core && existsSync(join(parent, d, "skills"))) roots.push(join(parent, d));
  }
  return roots;
}

export function listSkills(core = CORE) {
  const skills = [], agents = [];
  for (const root of pluginRoots(core)) {
    const plugin = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8")).name;
    const sdir = join(root, "skills");
    for (const name of existsSync(sdir) ? readdirSync(sdir).sort() : []) {
      const file = join(sdir, name, "SKILL.md");
      if (!existsSync(file)) continue;
      const fm = frontMatter(readFileSync(file, "utf8"));
      skills.push({ name, plugin, slash_command: `/${plugin}:${name}`, asked_by_the_user_only: fm["disable-model-invocation"] === "true", description: (fm.description || "").slice(0, 300), file });
    }
    const adir = join(root, "agents");
    for (const f of existsSync(adir) ? readdirSync(adir).sort() : []) {
      if (!f.endsWith(".md")) continue;
      const fm = frontMatter(readFileSync(join(adir, f), "utf8"));
      agents.push({ name: f.replace(/\.md$/, ""), plugin, description: (fm.description || "").slice(0, 300), file: join(adir, f) });
    }
  }
  return { skills, agents };
}

// The text of a skill (or an agent's brief) as an agent can follow it without the plugin system: the plugin
// folder and the user's notes are written in where Claude Code would have substituted them.
export function readSkill(name, { args = "", core = CORE } = {}) {
  const { skills, agents } = listSkills(core);
  const wanted = name.replace(/^\/?(sw[a-z-]*:)?/, "");
  const hit = skills.find((s) => s.name === wanted) || agents.find((a) => a.name === wanted);
  if (!hit) return { error: `No skill or agent named "${wanted}"`, known: [...skills.map((s) => s.name), ...agents.map((a) => a.name)] };
  const root = join(dirname(hit.file), hit.slash_command ? join("..", "..") : "..");
  const folder = hit.slash_command ? dirname(hit.file) : null;
  const text = readFileSync(hit.file, "utf8").replaceAll("${CLAUDE_PLUGIN_ROOT}", root.replace(/\\/g, "/")).replaceAll("$ARGUMENTS", args || "(none)");
  const refs = folder && existsSync(join(folder, "references")) ? readdirSync(join(folder, "references")).map((f) => join(folder, "references", f)) : [];
  return { name: hit.name, file: hit.file, plugin_root: root, references: refs, text };
}

// .claude/settings.json of the project: the marketplace and the plugins to enable. Claude Code reads it when
// the project is opened and asks the user to trust and install them. Existing settings are kept.
export function enableInProject(dir, modules = []) {
  const file = join(dir, ".claude", "settings.json");
  let settings = {};
  if (existsSync(file)) { try { settings = JSON.parse(readFileSync(file, "utf8")); } catch { return { error: `${file} is not valid JSON: fix it by hand, nothing was written` }; } }
  const wanted = ["sw", ...modules.map((m) => (m.startsWith("sw-") ? m : `sw-${m}`))];
  const unknown = wanted.filter((w) => !MODULES.includes(w));
  if (unknown.length) return { error: `Unknown module(s): ${unknown.join(", ")}`, known: MODULES };
  settings.extraKnownMarketplaces = { ...(settings.extraKnownMarketplaces || {}), [MARKETPLACE]: { source: { source: "github", repo: REPOSITORY } } };
  settings.enabledPlugins = { ...(settings.enabledPlugins || {}), ...Object.fromEntries(wanted.map((w) => [`${w}@${MARKETPLACE}`, true])) };
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
  return { written: file, enabled: wanted.map((w) => `${w}@${MARKETPLACE}`),
    next: "Claude Code reads this file when the project is opened: the user restarts the session there and accepts the marketplace. Until then, use `sw.mjs skills` and `sw.mjs skill <name>`." };
}
