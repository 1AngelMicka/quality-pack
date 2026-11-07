// Small git helpers for incremental audits. Every function fails soft (returns null) outside a repo.
import { spawnSync } from "node:child_process";

const git = (cwd, args, keepLeading = false) => {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) return null;
  return keepLeading ? r.stdout.replace(/\s+$/, "") : r.stdout.trim();
};

export const gitHead = (cwd) => git(cwd, ["rev-parse", "HEAD"]);

// Files changed since a commit, plus uncommitted and untracked files.
export function changedSince(cwd, commit) {
  if (!commit || git(cwd, ["cat-file", "-e", `${commit}^{commit}`]) === null) return null;
  const committed = git(cwd, ["diff", "--name-only", `${commit}`, "HEAD"]);
  if (committed === null) return null;
  const status = git(cwd, ["status", "--porcelain", "--untracked-files=all"], true) || "";
  const files = new Set(committed.split("\n").filter(Boolean));
  for (const line of status.split("\n").filter(Boolean)) files.add(line.slice(3).replace(/^.* -> /, ""));
  return [...files].filter((f) => !f.startsWith(".quality/")).sort();
}
