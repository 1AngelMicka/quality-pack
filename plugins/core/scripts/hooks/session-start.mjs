#!/usr/bin/env node
// SessionStart hook: in a project that uses Shipwright, adds a short reminder to Claude's context.
// Silent everywhere else. Reads only local files.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const projectFile = join(dir, ".quality", "project.json");
if (!existsSync(projectFile)) process.exit(0);

let p;
try { p = JSON.parse(readFileSync(projectFile, "utf8")); } catch { process.exit(0); }
const audits = join(dir, ".quality", "audits");
// Runs are 2026-11-11, 2026-11-11-2…: sort by day, then by number.
const key = (f) => { const m = /^(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.report\.json$/.exec(f); return m ? `${m[1]}#${String(m[2] || 1).padStart(4, "0")}` : null; };
const last = existsSync(audits) ? readdirSync(audits).filter(key).sort((a, b) => key(a).localeCompare(key(b))).pop() : null;
let lastLine = "No audit yet: suggest /sw:audit once the first key task works.";
if (last) {
  try {
    const r = JSON.parse(readFileSync(join(audits, last), "utf8"));
    const s = (k) => (r.scores?.[k]?.score == null ? "—" : `${r.scores[k].score}/10`);
    lastLine = r.scores
      ? `Last audit ${r.run || r.date}: experience ${s("experience")}, engineering and operations ${s("operations")}, ${r.open_blockers} open blocker(s)${r.review?.length ? `, ${r.review.length} ergonomics finding(s)` : ""}. Details in .quality/AUDIT.md; /sw:fix fixes them by priority.`
      : `Last audit ${r.date}: ${r.global}/10, ${r.open_blockers} open blocker(s). Details in .quality/AUDIT.md; /sw:fix fixes them by priority.`;
  } catch { /* ignore */ }
}
const extra = [];
if ((p.flags || []).includes("has_ui") && !(Array.isArray(p.flows) && p.flows.length)) {
  extra.push("No key tasks in .quality/project.json › flows: audits can only judge the interface on screens as they load. Suggest declaring them (/sw:kickoff, step 3).");
}
const handoff = join(dir, ".quality", "handoff.md");
if (existsSync(handoff)) {
  const ageDays = (Date.now() - statSync(handoff).mtimeMs) / 86400000;
  if (ageDays < 14 && statSync(handoff).size > 20) extra.push(`A handoff from a previous session exists (.quality/handoff.md, ${Math.round(ageDays)} day(s) old): read it before exploring the project.`);
}
if (existsSync(join(dir, "graphify-out", "graph.json"))) extra.push("A Graphify code graph exists: query it (graphify query / path / explain) before searching or reading files.");
process.stdout.write([
  `This project uses Shipwright (profile: ${p.profile}; stacks: ${(p.stacks || []).join(", ") || "none"}; report language: ${p.language || "fr"}).`,
  `Promise: ${p.promise || "(not written yet: run /sw:kickoff)"}`,
  "While building, follow the qp build-* skills for the domains you touch and the stack rules skills; before saying a task is done, run the checks they list.",
  lastLine,
  ...extra,
].join("\n") + "\n");
