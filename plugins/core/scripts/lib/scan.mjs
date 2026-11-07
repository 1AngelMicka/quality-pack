// Static scans of the project source: placeholder content, hollow wording, debug leftovers.
// Findings are signals for the auditor, who judges the context before failing a criterion.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".nuxt", ".svelte-kit", ".output", "dist", "build", "out",
  "coverage", ".turbo", ".vercel", ".quality", "graphify-out", "vendor", ".cache", "public/build", "storybook-static", ".expo"]);
const CODE_EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro"]);
const TEXT_EXT = new Set([...CODE_EXT, ".html", ".md", ".mdx", ".json", ".yml", ".yaml"]);
const MAX_SIZE = 512 * 1024;

const isTestPath = (p) => /(^|\/)(__tests__|tests?|e2e|spec|fixtures|__mocks__|stories)(\/|$)|\.(test|spec|stories)\.[a-z]+$/i.test(p);
const isConfigOrScript = (p) => /(^|\/)(scripts?|bin|tools)\/|\.config\.[a-z]+$|^(eslint|prettier|tailwind|postcss|next|vite|vitest|jest|playwright)\b/i.test(p);
const isDocPath = (p) => /(^|\/)(docs?|\.github)\/|^(README|CHANGELOG|CONTRIBUTING|LICENSE|CLAUDE|AGENTS|DESIGN)[^/]*$/i.test(p);
const isLockOrGenerated = (p) => /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|\.min\.[a-z]+|\.map)$/.test(p) || /(^|\/)tsconfig.*\.json$/.test(p);

export function listFiles(root) {
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

export function scan(root, ref) {
  const files = listFiles(root);
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
  return { root, files_scanned: files.length, findings,
    summary: Object.fromEntries(Object.entries(findings).map(([k, v]) => [k, v.length])) };
}

