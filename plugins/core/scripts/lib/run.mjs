// Run a command and return a compact summary instead of its full output.
// The full output goes to a log file on disk; Claude only reads it when the summary is not enough.
// This is where most of the audit's token savings come from: test, lint, typecheck and audit
// commands often print thousands of lines when only the failures matter.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const SIGNAL = /\b(error|errors|fail|failed|failing|failure|exception|traceback|panic|fatal|warn|warning|vulnerab\w*|critical|high|denied|refused|timeout|cannot|not found|undefined|unexpected)\b|✗|✖|×|❌|\bFAIL\b|\bERR!/i;
const NOISE = /^\s*$|node_modules\/|^\s+at\s.+\(node:internal|^\s*\^+\s*$/;
export const estimateTokens = (text) => Math.ceil((text || "").length / 4);

export function summarize(output, { maxSignal = 40, tail = 15 } = {}) {
  const lines = output.split(/\r?\n/);
  const signal = [];
  const seen = new Set();
  for (const l of lines) {
    if (NOISE.test(l) || !SIGNAL.test(l)) continue;
    const key = l.trim().replace(/\d+/g, "#");
    if (seen.has(key)) continue;
    seen.add(key);
    signal.push(l.length > 300 ? l.slice(0, 300) + "…" : l);
    if (signal.length >= maxSignal) break;
  }
  const last = lines.filter((l) => l.trim()).slice(-tail).map((l) => (l.length > 300 ? l.slice(0, 300) + "…" : l));
  return { total_lines: lines.length, signal_lines: signal, last_lines: last };
}

// Running total of tokens saved in an audit run folder, shown in the report.
export function recordSavings(dir, fullOutput, returned) {
  const statsFile = join(dir, "token-savings.json");
  let stats = { commands: 0, full_output: 0, returned: 0, saved: 0 };
  try { if (existsSync(statsFile)) stats = JSON.parse(readFileSync(statsFile, "utf8")); } catch { /* reset */ }
  stats.commands++;
  stats.full_output += fullOutput;
  stats.returned += returned;
  stats.saved += Math.max(0, fullOutput - returned);
  mkdirSync(dir, { recursive: true });
  writeFileSync(statsFile, JSON.stringify(stats, null, 2));
}

export function runCommand(label, command, { cwd, logDir, timeoutMs = 15 * 60 * 1000, env = {}, record = true } = {}) {
  const started = Date.now();
  const r = spawnSync(command, { cwd, shell: true, encoding: "utf8", timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, CI: process.env.CI || "1", FORCE_COLOR: "0", NO_COLOR: "1", ...env } });
  const output = `${r.stdout || ""}${r.stderr ? `\n${r.stderr}` : ""}`.replace(/\x1b\[[0-9;]*m/g, "");
  const safe = label.replace(/[^a-z0-9_.-]+/gi, "-").slice(0, 60) || "command";
  mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, `${safe}.log`);
  writeFileSync(logFile, `$ ${command}\n# exit ${r.status ?? "killed"} after ${Math.round((Date.now() - started) / 1000)} s\n\n${output}`);
  const summary = summarize(output);
  const result = {
    label, command, exit_code: r.status, timed_out: r.error?.code === "ETIMEDOUT" || r.signal === "SIGTERM",
    duration_s: Math.round((Date.now() - started) / 100) / 10, log: relative(cwd, logFile), ...summary,
  };
  const returned = estimateTokens(JSON.stringify(result));
  result.tokens = { full_output: estimateTokens(output), returned, saved: Math.max(0, estimateTokens(output) - returned) };
  if (record) recordSavings(join(logDir, ".."), result.tokens.full_output, result.tokens.returned);
  return result;
}
