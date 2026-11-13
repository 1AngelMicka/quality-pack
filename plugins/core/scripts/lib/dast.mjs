// Passive security scan of the running app with OWASP ZAP's baseline scan (Apache-2.0), in Docker.
// The baseline crawls the site for about a minute and only reads the answers: missing security headers,
// cookies without flags, mixed content, information leaks, vulnerable libraries served to the browser.
// It sends no attack, so it is safe on any site the user owns; it finds configuration mistakes, not logic
// flaws (access control is `sw access`, and a real attack test stays a human pentest).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

export const ZAP_IMAGE = "ghcr.io/zaproxy/zaproxy:stable";
const RISK = ["info", "low", "medium", "high"];

const isLoopback = (h) => h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".localhost");

// The docker command for a target. A site on this machine is not "localhost" from inside the container:
// Docker Desktop (Windows, macOS) gives host.docker.internal, Linux needs the host gateway mapped to it.
export function zapCommand(target, outDir, { platform = process.platform, minutes = 1, image = ZAP_IMAGE } = {}) {
  const u = new URL(target);
  const args = ["run", "--rm", "-v", `${outDir}:/zap/wrk/:rw`];
  if (isLoopback(u.hostname)) {
    u.hostname = "host.docker.internal";
    if (platform === "linux") args.push("--add-host", "host.docker.internal:host-gateway");
  }
  // -I: warnings do not change the exit code; -m: minutes the spider runs; -J: JSON report in /zap/wrk
  args.push("-t", image, "zap-baseline.py", "-t", u.href, "-J", "zap.json", "-m", String(minutes), "-I");
  return { command: "docker", args, scanned_as: u.href };
}

// ZAP's JSON report → alerts by risk, one line each, most serious first.
export function parseZap(report) {
  const alerts = [];
  for (const site of report?.site || []) for (const a of site.alerts || []) {
    const risk = RISK[Number(a.riskcode)] || "info";
    alerts.push({ risk, name: a.name || a.alert, plugin: a.pluginid, cwe: a.cweid && a.cweid !== "-1" ? `CWE-${a.cweid}` : null,
      count: Number(a.count) || (a.instances || []).length, confidence: ["false positive", "low", "medium", "high", "confirmed"][Number(a.confidence)] || null,
      examples: (a.instances || []).slice(0, 3).map((i) => `${i.method || "GET"} ${i.uri}${i.param ? ` (${i.param})` : ""}`),
      solution: String(a.solution || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240) });
  }
  alerts.sort((x, y) => RISK.indexOf(y.risk) - RISK.indexOf(x.risk) || y.count - x.count);
  const by = Object.fromEntries(RISK.map((r) => [r, alerts.filter((a) => a.risk === r).length]));
  return { summary: { ...by, alerts: alerts.length }, alerts };
}

export function dockerAvailable() {
  const r = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], { encoding: "utf8", timeout: 15000 });
  return r.status === 0 ? { ok: true, version: r.stdout.trim() } : { ok: false, why: r.error?.code === "ENOENT" ? "Docker is not installed" : "Docker is installed but its engine does not answer (start Docker Desktop or the docker service)" };
}

export function runZap(target, { outDir, production, allowProduction = false, minutes = 1 } = {}) {
  let host;
  try { host = new URL(target).host; } catch { return { available: true, errors: [`not a URL: ${target}`] }; }
  let prodHost = null;
  try { prodHost = production ? new URL(production).host : null; } catch { /* ignore */ }
  if (prodHost && prodHost === host && !allowProduction)
    return { available: true, errors: [`${target} is the production site. The baseline scan is passive, but it crawls every link it finds: run it on local or staging, or pass --allow-production after the user agreed.`] };
  const d = dockerAvailable();
  if (!d.ok) return { available: false, hint: `${d.why}. The scan runs OWASP ZAP in Docker (image ${ZAP_IMAGE}, about 2 GB the first time): ask the user before installing or pulling it.` };
  const dir = join(outDir, "zap");
  mkdirSync(dir, { recursive: true });
  const reportFile = join(dir, "zap.json");
  if (existsSync(reportFile)) rmSync(reportFile);
  const { command, args, scanned_as } = zapCommand(target, dir, { minutes });
  const started = Date.now();
  const r = spawnSync(command, args, { encoding: "utf8", timeout: (minutes + 10) * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  const log = `${r.stdout || ""}\n${r.stderr || ""}`;
  if (!existsSync(reportFile)) return { available: true, errors: [`ZAP wrote no report (exit ${r.status ?? "killed"}): ${log.split(/\r?\n/).filter((l) => l.trim()).slice(-4).join(" | ").slice(0, 400)}`] };
  const parsed = parseZap(JSON.parse(readFileSync(reportFile, "utf8")));
  return { available: true, tool: "OWASP ZAP baseline (passive)", image: ZAP_IMAGE, target, scanned_as, duration_s: Math.round((Date.now() - started) / 1000), ...parsed,
    note: "Passive scan: configuration and header mistakes on the pages the crawler reached without logging in. It does not test access control (sw access), injection or business logic." };
}

export function compactZap(result) {
  if (!result.alerts) return result;
  return { target: result.target, summary: result.summary, full_report: "zap.json (and zap/zap.json, ZAP's own report)",
    alerts: result.alerts.filter((a) => a.risk !== "info").slice(0, 20).map((a) => `${a.risk}: ${a.name}${a.cwe ? ` (${a.cwe})` : ""} ×${a.count}`), note: result.note };
}
