// sw.mjs install: an agent installs the marketplace and the plugins itself, with Claude Code's own command line.
// It changes the user's Claude Code configuration, so it is run only when the user asked for the installation.
//
// Inside a session the `claude` command refuses to start, to prevent a session inside a session. Installing a
// plugin opens no session, so that one variable is left out of the environment of the commands run here.
import { spawnSync } from "node:child_process";
import { MARKETPLACE, MODULES, REPOSITORY } from "./standalone.mjs";

function claude(args, cwd) {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  const bin = process.env.SW_CLAUDE_BIN || "claude";
  const r = bin.endsWith(".mjs")
    ? spawnSync(process.execPath, [bin, ...args], { cwd, env, encoding: "utf8", timeout: 180000 })
    // On Windows the command is a .cmd shim, which needs a shell. Every argument is a fixed word or a name
    // checked against the list of modules above, so the line is safe to pass whole.
    : process.platform === "win32" ? spawnSync([bin, ...args].join(" "), { cwd, env, encoding: "utf8", timeout: 180000, shell: true })
      : spawnSync(bin, args, { cwd, env, encoding: "utf8", timeout: 180000 });
  const text = `${r.stdout || ""}${r.stderr || ""}`.replace(/\x1b\[[0-9;]*m/g, "").trim();
  return { ok: r.status === 0, missing: !!r.error && r.error.code === "ENOENT", full: text, text: text.split(/\r?\n/).filter(Boolean).slice(-2).join(" ").slice(0, 300) };
}

export function installPlugins({ cwd, modules = [], detected = [], scope = "user" } = {}) {
  if (!["user", "project", "local"].includes(scope)) return { error: `Unknown scope "${scope}": user, project or local` };
  const asked = modules.map((m) => (m.startsWith("sw-") ? m : `sw-${m}`));
  const unknown = asked.filter((m) => !MODULES.includes(m));
  if (unknown.length) return { error: `Unknown module(s): ${unknown.join(", ")}`, known: MODULES.filter((m) => m !== "sw") };
  // The main plugin, the modules asked for, and the ones whose technology was found in the project.
  const wanted = [...new Set(["sw", ...asked, ...detected.map((s) => `sw-${s}`).filter((m) => MODULES.includes(m))])];

  const version = claude(["--version"], cwd);
  if (!version.ok) return { error: version.missing || /not recognized|not found/i.test(version.text)
    ? "The claude command was not found: this needs Claude Code's command line. Without it, use sw.mjs skills and sw.mjs enable."
    : `The claude command failed: ${version.text}` };

  const steps = [];
  const known = claude(["plugin", "marketplace", "list"], cwd);
  if (known.ok && new RegExp(`\\b${MARKETPLACE}\\b`).test(known.full)) {
    const up = claude(["plugin", "marketplace", "update", MARKETPLACE], cwd);
    steps.push({ step: `marketplace ${MARKETPLACE} already known, updated`, ok: up.ok, said: up.text });
  } else {
    const add = claude(["plugin", "marketplace", "add", REPOSITORY], cwd);
    steps.push({ step: `marketplace add ${REPOSITORY}`, ok: add.ok || /already/i.test(add.text), said: add.text });
  }
  if (!steps[0].ok) return { error: "The marketplace could not be added", steps };

  for (const p of wanted) {
    const r = claude(["plugin", "install", `${p}@${MARKETPLACE}`, "--scope", scope], cwd);
    steps.push({ step: `install ${p}@${MARKETPLACE}`, ok: r.ok || /already installed/i.test(r.text), said: r.text });
  }
  const failed = steps.filter((s) => !s.ok).map((s) => s.step);
  return { claude_code: version.text, scope, installed: steps.filter((s) => s.ok && s.step.startsWith("install ")).map((s) => s.step.slice(8)), failed, steps,
    next: failed.length ? "Some steps failed: read what each one said."
      : "Installed on disk, not loaded in this session. Tell the user, in these words: type /reload-plugins (or reopen the session). Until then keep working with sw.mjs skills and sw.mjs skill <name>. After the reload, /sw:kickoff and the hooks are active." };
}
