// sw.mjs doctor: is Shipwright really there for this project? Read only. It reads Claude Code's own files
// (CLAUDE_CONFIG_DIR, or ~/.claude): the known marketplaces, the installed plugins, and the enabledPlugins of the
// user, project and local settings, then the hooks the installed plugin declares. Whether the session that is
// open right now has loaded the plugin cannot be read from files: that part stays a question for the user.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { CORE, MARKETPLACE, MODULES } from "./standalone.mjs";

const readJson = (file) => {
  if (!existsSync(file)) return { missing: true };
  try { return { data: JSON.parse(readFileSync(file, "utf8")) }; } catch (e) { return { error: `${file}: ${e.message}` }; }
};
const norm = (p) => { const n = resolve(p).replace(/\\/g, "/").replace(/\/$/, ""); return process.platform === "win32" ? n.toLowerCase() : n; };

// installed_plugins.json: version 2 keeps a list of installs per plugin (one per scope), version 1 a single object.
function installsOf(installed, key) {
  const v = installed?.plugins?.[key];
  if (!v) return [];
  return (Array.isArray(v) ? v : [{ scope: "user", ...v }]).map((e) => ({ scope: e.scope || "user", project_path: e.projectPath || null,
    version: e.version || null, install_path: e.installPath || null, installed_at: e.installedAt || null }));
}

function hooksOf(root) {
  const r = readJson(join(root, "hooks", "hooks.json"));
  if (!r.data) return [];
  return Object.entries(r.data.hooks || {}).flatMap(([event, groups]) => (groups || []).flatMap((g) => (g.hooks || []).map((h) => ({
    event, matcher: g.matcher || null, script: (/[\w.-]+\.m?js/.exec(h.command || "") || [h.command])[0] }))));
}

const versionAt = (root) => readJson(join(root, ".claude-plugin", "plugin.json")).data?.version || null;

export function doctor({ cwd, configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), core = CORE } = {}) {
  const files = {
    known_marketplaces: join(configDir, "plugins", "known_marketplaces.json"),
    installed_plugins: join(configDir, "plugins", "installed_plugins.json"),
    user_settings: join(configDir, "settings.json"),
    project_settings: join(cwd, ".claude", "settings.json"),
    local_settings: join(cwd, ".claude", "settings.local.json"),
  };
  const read = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, readJson(f)]));
  const unreadable = Object.values(read).filter((r) => r.error).map((r) => r.error);

  const known = read.known_marketplaces.data?.[MARKETPLACE];
  const offered = read.project_settings.data?.extraKnownMarketplaces?.[MARKETPLACE];
  const marketplace = { known: !!known, source: known?.source || null, install_location: known?.installLocation || null, last_updated: known?.lastUpdated || null,
    declared_in_project_settings: !!offered };
  const marketVersion = known?.installLocation ? readJson(join(known.installLocation, ".claude-plugin", "marketplace.json")).data?.metadata?.version || null : null;

  const here = norm(cwd);
  const plugins = MODULES.map((name) => {
    const key = `${name}@${MARKETPLACE}`;
    const installs = installsOf(read.installed_plugins.data, key);
    // A user-scope install serves every project; a project or local one only the folder it was installed for.
    const forProject = installs.filter((i) => i.scope === "user" || (i.project_path && norm(i.project_path) === here));
    const setting = (k) => read[k].data?.enabledPlugins?.[key];
    const layers = { user: setting("user_settings"), project: setting("project_settings"), local: setting("local_settings") };
    // The most specific setting wins: local, then project, then user.
    const enabled = layers.local ?? layers.project ?? layers.user;
    return { plugin: key, installed: installs.length > 0, installed_for_this_project: forProject.length > 0, installs,
      enabled_for_this_project: enabled === true, enabled_by: Object.fromEntries(Object.entries(layers).filter(([, v]) => v !== undefined)) };
  });
  const main = plugins[0];
  const modules = plugins.slice(1).filter((p) => p.installed || Object.keys(p.enabled_by).length);
  const install = main.installs.find((i) => i.scope !== "user" && i.project_path && norm(i.project_path) === here) || main.installs.find((i) => i.scope === "user");
  const pluginRoot = install?.install_path && existsSync(install.install_path) ? install.install_path : null;
  const hooks = hooksOf(pluginRoot || core);

  const problems = [];
  if (!marketplace.known) problems.push(marketplace.declared_in_project_settings
    ? `The marketplace ${MARKETPLACE} is declared in .claude/settings.json but Claude Code does not know it yet: it was never accepted.`
    : `Claude Code does not know the marketplace ${MARKETPLACE}.`);
  if (!main.installed) problems.push("sw@shipwright is not installed.");
  else if (!main.installed_for_this_project) problems.push("sw@shipwright is installed for another project only (project or local scope elsewhere).");
  if (main.installed && !main.enabled_for_this_project) problems.push(main.enabled_by.local === false || main.enabled_by.project === false || main.enabled_by.user === false
    ? "sw@shipwright is turned off for this project in the settings." : "sw@shipwright is installed but not enabled for this project.");
  for (const m of modules) if (m.installed_for_this_project && !m.enabled_for_this_project) problems.push(`${m.plugin} is installed but not enabled for this project.`);
  for (const m of modules) if (!m.installed && m.enabled_by.project) problems.push(`${m.plugin} is enabled in .claude/settings.json but not installed.`);
  problems.push(...unreadable.map((e) => `Unreadable file: ${e}`));

  const ok = main.installed_for_this_project && main.enabled_for_this_project && marketplace.known;
  return {
    ok, config_dir: configDir, files,
    marketplace: { ...marketplace, version: marketVersion },
    plugin: { ...main, version: install?.version || null, plugin_root: pluginRoot },
    modules: modules.map((m) => ({ plugin: m.plugin, installed: m.installed_for_this_project, enabled: m.enabled_for_this_project, version: m.installs[0]?.version || null })),
    hooks: { declared: hooks, from: pluginRoot ? "installed plugin" : "this copy of the plugin (not installed)" },
    versions: { this_script: versionAt(core), installed: install?.version || null, marketplace: marketVersion },
    problems,
    next: ok
      ? "Installed and enabled. If /sw: commands or skills are still missing in the open session, the user types /reload-plugins or reopens the session (files cannot tell what the open session has loaded)."
      : "Run `sw.mjs install` when the user asked for the installation (marketplace, plugin and modules), then the user types /reload-plugins. Until then, use `sw.mjs skills` and `sw.mjs skill <name>`." };
}
