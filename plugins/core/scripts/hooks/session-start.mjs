#!/usr/bin/env node
// SessionStart hook: in a project that uses the quality pack, adds a short reminder to Claude's context.
// Silent everywhere else. Reads only local files.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const projectFile = join(dir, ".quality", "project.json");
if (!existsSync(projectFile)) process.exit(0);

let p;
try { p = JSON.parse(readFileSync(projectFile, "utf8")); } catch { process.exit(0); }
const audits = join(dir, ".quality", "audits");
const last = existsSync(audits) ? readdirSync(audits).filter((f) => /^\d{4}-\d{2}-\d{2}\.report\.json$/.test(f)).sort().pop() : null;
let lastLine = "No audit yet: suggest /qp:audit once the first features work.";
if (last) {
  try {
    const r = JSON.parse(readFileSync(join(audits, last), "utf8"));
    lastLine = `Last audit ${r.date}: ${r.global}/10, ${r.open_blockers} open blocker(s). Details in .quality/AUDIT.md; /qp:fix fixes them by priority.`;
  } catch { /* ignore */ }
}
const extra = [];
const handoff = join(dir, ".quality", "handoff.md");
if (existsSync(handoff)) {
  const ageDays = (Date.now() - statSync(handoff).mtimeMs) / 86400000;
  if (ageDays < 14 && statSync(handoff).size > 20) extra.push(`A handoff from a previous session exists (.quality/handoff.md, ${Math.round(ageDays)} day(s) old): read it before exploring the project.`);
}
if (existsSync(join(dir, "graphify-out", "graph.json"))) extra.push("A Graphify code graph exists: query it (graphify query / path / explain) before searching or reading files.");
process.stdout.write([
  `This project uses the quality pack (profile: ${p.profile}; stacks: ${(p.stacks || []).join(", ") || "none"}; report language: ${p.language || "fr"}).`,
  `Promise: ${p.promise || "(not written yet: run /qp:kickoff)"}`,
  "While building, follow the qp build-* skills for the domains you touch and the stack rules skills; before saying a task is done, run the checks they list.",
  lastLine,
  ...extra,
].join("\n") + "\n");
