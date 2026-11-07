// Optional integration with Graphify (https://github.com/Graphify-Labs/graphify), a local code knowledge graph.
// The pack never installs it: it detects it, says whether the graph is fresh, and refreshes it code-only
// (GRAPHIFY_BACKEND=none: no LLM call, nothing leaves the machine).
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { listFiles } from "./scan.mjs";

const CODE = /\.(m?[jt]sx?|cjs|vue|svelte|astro|py|php|rb|go|rs|java|kt|swift|cs|dart|sql|prisma)$/i;

export function projectSize(cwd) {
  const files = listFiles(cwd).filter((f) => CODE.test(f));
  const n = files.length;
  return { source_files: n, tier: n < 60 ? "small" : n < 400 ? "medium" : "large", files };
}

export function graphStatus(cwd) {
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["graphify"], { encoding: "utf8" });
  const installed = which.status === 0;
  const graphFile = join(cwd, "graphify-out", "graph.json");
  const size = projectSize(cwd);
  const out = { installed, graph: existsSync(graphFile), graph_file: "graphify-out/graph.json", project_size: { source_files: size.source_files, tier: size.tier } };
  if (out.graph) {
    const built = statSync(graphFile).mtimeMs;
    const newer = size.files.filter((f) => { try { return statSync(join(cwd, f)).mtimeMs > built; } catch { return false; } });
    out.built_at = new Date(built).toISOString();
    out.changed_since_build = newer.length;
    out.stale = newer.length > 0;
  }
  out.recommended = size.tier !== "small";
  out.advice = !installed
    ? (out.recommended ? "Recommended for this project size: uv tool install graphifyy && graphify install --project, then run: node qp.mjs graph refresh." : "Not needed for a small project.")
    : !out.graph ? "Installed but no graph yet: run qp.mjs graph refresh."
    : out.stale ? "Graph is stale: run qp.mjs graph refresh before relying on it." : "Graph is fresh: query it before reading files.";
  return out;
}

// Code-only refresh: GRAPHIFY_BACKEND=none is passed through the environment (works on every OS).
export function refreshCommand(cwd) {
  const has = existsSync(join(cwd, "graphify-out", "graph.json"));
  return { command: `graphify ${has ? "update ." : "extract . --code-only"}`, env: { GRAPHIFY_BACKEND: "none" } };
}
