// Static scans of the project source: placeholder content, hollow wording, debug leftovers.
// Findings are signals for the auditor, who judges the context before failing a criterion.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { spawnSync } from "node:child_process";

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".nuxt", ".svelte-kit", ".output", "dist", "build", "out",
  "coverage", ".turbo", ".vercel", ".quality", "graphify-out", "vendor", ".cache", "public/build", "storybook-static", ".expo",
  "target", ".venv", "venv", "__pycache__", "Pods", ".gradle", "DerivedData", "test-results", "playwright-report"]);
// Working documents that are not shipped: research, reports, notes. `sw scan` leaves them out by default;
// project.json › scan_exclude adds folders or files (a trailing /** or / is optional, * matches within a name).
export const DEFAULT_EXCLUDE = ["docs", "reports", "research_notes"];
export function excluder(patterns = []) {
  const res = patterns.filter((p) => typeof p === "string" && p.trim()).map((p) => {
    const clean = p.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/(\*\*)?$/, "");
    const body = clean.split("/").map((seg) => seg === "**" ? ".*" : seg.replace(/[.+^${}()|[\]]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]")).join("/");
    return new RegExp(`^${body}(/|$)`, "i");
  });
  return (rel) => res.some((re) => re.test(rel));
}
const CODE_EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro"]);
const TEXT_EXT = new Set([...CODE_EXT, ".html", ".md", ".mdx", ".json", ".yml", ".yaml"]);
const MAX_SIZE = 512 * 1024;

const isTestPath = (p) => /(^|\/)(__tests__|tests?|e2e|spec|fixtures|__mocks__|stories)(\/|$)|\.(test|spec|stories)\.[a-z]+$/i.test(p);
const isConfigOrScript = (p) => /(^|\/)(scripts?|bin|tools)\/|\.config\.[a-z]+$|^(eslint|prettier|tailwind|postcss|next|vite|vitest|jest|playwright)\b/i.test(p);
const isDocPath = (p) => /(^|\/)(docs?|\.github)\/|^(README|CHANGELOG|CONTRIBUTING|LICENSE|CLAUDE|AGENTS|DESIGN)[^/]*$/i.test(p);
const isLockOrGenerated = (p) => /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|\.min\.[a-z]+|\.map)$/.test(p) || /(^|\/)tsconfig.*\.json$/.test(p);

// Files of the project. Inside a Git work tree, Git decides (tracked files plus untracked ones that
// .gitignore does not exclude), so build outputs and dependencies are never read. Elsewhere, or when
// Git lists nothing (the folder itself is ignored by a parent repository), walk the tree and skip SKIP_DIRS.
export function listFiles(root) {
  const skipped = (rel) => rel.split("/").some((seg, i, all) => SKIP_DIRS.has(seg) || SKIP_DIRS.has(all.slice(0, i + 1).join("/")));
  const git = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (git.status === 0 && git.stdout) {
    const files = git.stdout.split("\0").filter((f) => f && !skipped(f) && existsSync(join(root, f)));
    if (files.length) return files;
  }
  return walkFiles(root);
}

export function walkFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(dir, e.name);
      const rel = relative(root, p).split("\\").join("/");
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || SKIP_DIRS.has(rel)) continue;
        walk(p);
      } else if (e.isFile()) out.push(rel);
    }
  };
  walk(root);
  return out;
}

function read(root, rel) {
  try {
    if (statSync(join(root, rel)).size > MAX_SIZE) return null;
    return readFileSync(join(root, rel), "utf8");
  } catch { return null; }
}

const PLACEHOLDERS = [
  [/lorem ipsum|dolor sit amet/i, "lorem ipsum"],
  [/\b(john|jane) doe\b/i, "John/Jane Doe"],
  [/\bacme (corp|inc|ltd)\b/i, "Acme"],
  [/\b(your|votre) (title|text|company|name|titre|texte|entreprise|nom) (here|ici)\b/i, "\"your … here\""],
  [/\b(coming soon|bientôt disponible|under construction|en construction)\b/i, "coming soon"],
  [/\bplaceholder (text|image|content)\b|\btexte (de remplissage|factice)\b/i, "placeholder text"],
  [/(\+33|0)[ .]?6[ .]?12[ .]?34[ .]?56[ .]?78|555-?01\d\d|123-456-7890/, "fake phone number"],
  [/\bTODO\b|\bFIXME\b|\bXXX\b/, "TODO/FIXME"],
];

const DEBUG = [
  [/\bconsole\.(log|debug|trace|dir)\s*\(/, "console.log"],
  [/^\s*debugger\s*;?\s*$/, "debugger"],
];

export function scan(root, ref, { exclude = [] } = {}) {
  // "!docs" in scan_exclude scans a default folder again (a documentation site whose product is docs/).
  const keep = new Set(exclude.filter((p) => typeof p === "string" && p.startsWith("!")).map((p) => p.slice(1).replace(/\/(\*\*)?$/, "")));
  const patterns = [...DEFAULT_EXCLUDE.filter((d) => !keep.has(d)), ...exclude.filter((p) => typeof p === "string" && !p.startsWith("!"))];
  const excluded = excluder(patterns);
  const all = listFiles(root);
  const files = all.filter((f) => !excluded(f));
  const findings = { placeholder_scan: [], slop_wording_scan: [], debug_leftovers_scan: [] };
  const slop = [...(ref.slop_words.fr || []), ...(ref.slop_words.en || [])].map((s) => new RegExp(s, "i"));
  const cap = (arr, item) => { if (arr.length < 200) arr.push(item); };

  for (const rel of files) {
    const ext = extname(rel).toLowerCase();
    if (/\.(bak|tmp|orig|swp|old)$/i.test(rel) || /~$/.test(rel)) {
      cap(findings.debug_leftovers_scan, { file: rel, line: 0, kind: "temporary file" });
      continue;
    }
    if (!TEXT_EXT.has(ext) || isLockOrGenerated(rel)) continue;
    const text = read(root, rel);
    if (text == null) continue;
    const lines = text.split(/\r?\n/);
    const test = isTestPath(rel);
    const doc = isDocPath(rel);
    const userFacing = !test && !doc && !isConfigOrScript(rel);
    let commentRun = 0;

    lines.forEach((line, i) => {
      const n = i + 1;
      if (userFacing) {
        for (const [re, kind] of PLACEHOLDERS) {
          if (re.test(line)) {
            if (kind === "TODO/FIXME" && !CODE_EXT.has(ext)) continue;
            cap(findings.placeholder_scan, { file: rel, line: n, kind, text: line.trim().slice(0, 160) });
          }
        }
        for (const re of slop) {
          const m = line.match(re);
          if (m) cap(findings.slop_wording_scan, { file: rel, line: n, match: m[0], text: line.trim().slice(0, 160) });
        }
      }
      if (CODE_EXT.has(ext) && !test && !isConfigOrScript(rel)) {
        for (const [re, kind] of DEBUG) {
          if (re.test(line) && !/qp-allow-debug/.test(line)) cap(findings.debug_leftovers_scan, { file: rel, line: n, kind, text: line.trim().slice(0, 160) });
        }
        // Commented-out code: 5+ consecutive // lines that look like code.
        if (/^\s*\/\/.*[;{}()=]\s*$/.test(line)) commentRun++;
        else {
          if (commentRun >= 5) cap(findings.debug_leftovers_scan, { file: rel, line: n - commentRun, kind: "commented-out code", text: `${commentRun} lines` });
          commentRun = 0;
        }
      }
    });
  }
  return { root, files_scanned: files.length, excluded: { patterns, files: all.length - files.length }, findings,
    summary: Object.fromEntries(Object.entries(findings).map(([k, v]) => [k, v.length])) };
}

// What the CLI prints: counts and the first findings of each kind. The full list stays in scan.json.
export function compactScan(result, perKind = 8) {
  return { summary: result.summary, files_scanned: result.files_scanned, excluded: result.excluded, full_list: "scan.json",
    findings: Object.fromEntries(Object.entries(result.findings).map(([k, v]) => [k, v.slice(0, perKind)])) };
}

