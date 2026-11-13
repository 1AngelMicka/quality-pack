// Referential, project file, stack modules and applicability. No dependencies.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CORE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadReferential() {
  return JSON.parse(readFileSync(join(CORE_ROOT, "referential", "referential.json"), "utf8"));
}

export function allDomains(ref) {
  return ref.groups.flatMap((g) => g.domains.map((d) => ({ ...d, group: g.group })));
}

export function qualityDir(cwd = process.cwd()) {
  return join(cwd, ".quality");
}

// The project root is the closest folder, from start upwards, that has .quality/project.json.
// So the CLI writes into the right .quality/ even when it is run from a sub-folder (src-tauri/, apps/web/).
export function findProjectRoot(start = process.cwd()) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, ".quality", "project.json"))) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

// Audit runs are named by day, then -2, -3… for later runs the same day: 2026-11-11, 2026-11-11-2.
export const RUN_RE = /^(\d{4}-\d{2}-\d{2})(?:-(\d+))?$/;
export const runKey = (run) => { const m = RUN_RE.exec(run); return m ? `${m[1]}#${String(m[2] || 1).padStart(4, "0")}` : run; };
export const byRun = (a, b) => runKey(a).localeCompare(runKey(b));
export const runDay = (run) => RUN_RE.exec(run)?.[1] || run;

export function loadProject(cwd = process.cwd()) {
  const p = join(qualityDir(cwd), "project.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

export function resolveFlags(flags, ref) {
  const active = new Set(flags || []);
  for (const [name, anyOf] of Object.entries(ref.derived_flags)) {
    if (anyOf.some((f) => active.has(f))) active.add(name);
  }
  return active;
}

export function applies(item, flags) {
  return (item.applies_if || []).every((f) => flags.has(f));
}

// Find stack.json files of installed sw stack modules.
// Works for marketplace installs (sibling plugins in the cache), local marketplaces (plugins/*),
// and project overrides in .quality/stacks/*.json.
export function findStacks(cwd = process.cwd()) {
  const found = new Map();
  const consider = (file) => {
    try {
      const st = JSON.parse(readFileSync(file, "utf8"));
      if (!st.qp_stack || !st.stack) return;
      const prev = found.get(st.stack);
      if (!prev || statSync(file).mtimeMs > prev.mtime) found.set(st.stack, { ...st, file, mtime: statSync(file).mtimeMs });
    } catch { /* not a stack file */ }
  };
  const walk = (dir, depth) => {
    if (depth < 0 || !existsSync(dir)) return;
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const p = join(dir, e.name);
      if (e.isFile() && e.name === "stack.json") consider(p);
      else if (e.isDirectory()) walk(p, depth - 1);
    }
  };
  // Ancestors of the core plugin: plugins/ (local), <plugin>/ or <marketplace>/ (cache layouts).
  let dir = CORE_ROOT;
  for (let i = 0; i < 3; i++) {
    dir = dirname(dir);
    walk(dir, 3);
  }
  const local = join(qualityDir(cwd), "stacks");
  if (existsSync(local)) for (const f of readdirSync(local)) if (f.endsWith(".json")) consider(join(local, f));
  return [...found.values()];
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
