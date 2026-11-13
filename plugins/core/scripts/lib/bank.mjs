// Reference bank: for each type of site, what visitors expect, real sites recognised as excellent with the
// reason, what to avoid, and the measured visual profile of those sites. The bank holds addresses, descriptions
// and numbers measured on the live pages; it never stores screenshots of other people's sites.
// Files: plugins/core/bank/<type>.json (written by hand from research) and plugins/core/bank/profiles/<type>.json
// (written by `sw bank measure`, numbers only).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const BANK_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "bank");

export function loadBank(dir = BANK_DIR) {
  const types = {};
  if (!existsSync(dir)) return { types };
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json") && x !== "calibration.json").sort()) {
    const t = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const id = t.id || f.replace(/\.json$/, "");
    const pf = join(dir, "profiles", `${id}.json`);
    const measured = existsSync(pf) ? JSON.parse(readFileSync(pf, "utf8")) : null;
    types[id] = { ...t, id, profile: measured?.summary || null, measured: measured?.measured || null, measured_sites: measured?.sites || [] };
  }
  return { types };
}

// Check a bank file. Returns readable errors; used by the tests so that a broken entry cannot ship.
export function validateType(t, id) {
  const errors = [];
  const need = (k) => { if (!t[k] || (Array.isArray(t[k]) && !t[k].length)) errors.push(`${id}: ${k} is required`); };
  for (const k of ["label", "expects", "sites", "avoid"]) need(k);
  if (t.label && (!t.label.fr || !t.label.en)) errors.push(`${id}: label needs fr and en`);
  const seen = new Set();
  for (const [i, s] of (t.sites || []).entries()) {
    const where = `${id}.sites[${i}]`;
    try { const u = new URL(s.url); if (u.protocol !== "https:") errors.push(`${where}: https address expected`); } catch { errors.push(`${where}: url is not an address`); }
    if (seen.has(s.url)) errors.push(`${where}: duplicate ${s.url}`);
    seen.add(s.url);
    if (!s.name) errors.push(`${where}: name is required`);
    if (!s.why || s.why.length < 30) errors.push(`${where}: why says in concrete terms what makes it excellent (30 characters or more)`);
    if (!s.recognition) errors.push(`${where}: recognition names who recognised it and when (award, gallery, article)`);
  }
  for (const [i, e] of (t.expects || []).entries()) if (!e.rule) errors.push(`${id}.expects[${i}]: rule is required`);
  return errors;
}

export function listBank(bank, type) {
  if (!type) return { types: Object.values(bank.types).map((t) => ({ id: t.id, label: t.label?.en, sites: (t.sites || []).length, profile: t.profile ? `${t.profile.n} sites measured ${t.measured}` : "not measured yet" })),
    usage: "sw.mjs bank <type> for the expectations, the reference sites and what to avoid; sw.mjs gap <url> --type <type> to compare a screen with them." };
  const t = bank.types[type];
  if (!t) return { errors: [`Unknown site type "${type}". Types: ${Object.keys(bank.types).join(", ")}`] };
  return { id: t.id, label: t.label, expects: t.expects, traits: t.traits || [], sites: t.sites, avoid: t.avoid, sources: t.sources || [],
    profile: t.profile ? { measured: t.measured, sites: t.profile.n, desktop: t.profile.desktop, mobile: t.profile.mobile } : null,
    note: "Open two or three of these sites before designing: the descriptions say what to look at. They are references to learn from, never to copy." };
}

// Run a page-measuring function on several slices of the list at once (one browser each), and give the pages
// back in the order of the list. Measuring 200 sites one after the other takes hours; four at a time does not.
export async function inParallel(urls, workers, fn) {
  const n = Math.max(1, Math.min(workers, urls.length));
  const slices = Array.from({ length: n }, (_, i) => urls.filter((_, j) => j % n === i));
  const results = await Promise.all(slices.map((slice) => (slice.length ? fn(slice) : { available: true, pages: [] })));
  const missing = results.find((r) => !r.available);
  if (missing) return missing;
  const byUrl = new Map(results.flatMap((r) => r.pages || []).map((p) => [p.url, p]));
  return { ...results[0], pages: urls.map((u) => byUrl.get(u) || { url: u, error: "not measured" }) };
}

export async function measureBank(type, { cwd, limit = 0, dir = BANK_DIR, parallel = 4 } = {}) {
  const { profileAt, summarize, PROFILE_VERSION } = await import("./profile.mjs");
  const bank = loadBank(dir);
  const ids = type === "all" ? Object.keys(bank.types) : [type];
  const out = [];
  for (const id of ids) {
    const t = bank.types[id];
    if (!t) { out.push({ type: id, error: "unknown type" }); continue; }
    const urls = t.sites.map((s) => s.url).slice(0, limit || undefined);
    const r = await inParallel(urls, parallel, (slice) => profileAt(slice, { cwd }));
    if (!r.available) return r;
    const ok = r.pages.filter((p) => !p.error && p.desktop && p.mobile);
    const file = join(dir, "profiles", `${id}.json`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ type: id, version: PROFILE_VERSION, measured: new Date().toISOString().slice(0, 10), summary: summarize(ok),
      sites: r.pages.map((p) => ({ url: p.url, ok: !p.error, error: p.error, desktop: p.desktop, mobile: p.mobile })) }, null, 1) + "\n");
    out.push({ type: id, measured: ok.length, failed: r.pages.filter((p) => p.error).map((p) => `${p.url}: ${p.error}`) });
  }
  return { measured: out, note: "Profiles are numbers measured on the live pages today; sites change, so measure again before relying on them." };
}

// ---------------------------------------------------------------------------------------------------------
// Calibration: run the pack's own measures on the sites recognised as excellent. A "should" that most of them
// fail does not separate excellent from average, so it becomes advice instead of a finding. A "must" stays a
// must (a stretched image is a defect on any site), but its rate is shown so that nobody treats it as rare.
export const CALIBRATION_FILE = join(BANK_DIR, "calibration.json");
// A "should" failed by this share of the excellent sites, or more, is advice.
export const ADVICE_RATE = 0.4;

export function loadCalibration(file = CALIBRATION_FILE) {
  try { return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null; } catch { return null; }
}

export function summarizeCalibration(pages, { mode } = {}) {
  const craft = {}, signals = {}, tiers = {};
  let n = 0;
  for (const p of pages) {
    if (!p.craft && !p.look) continue;
    n++;
    for (const [id, c] of Object.entries(p.craft?.checks || {})) { const k = (craft[id] ||= { level: c.level, n: 0, failed: 0 }); k.n++; if (!c.ok) k.failed++; }
    if (p.look) { tiers[p.look.tier] = (tiers[p.look.tier] || 0) + 1; for (const s of p.look.signals || []) signals[s] = (signals[s] || 0) + 1; }
  }
  for (const k of Object.values(craft)) k.fail_rate = Math.round((k.failed / k.n) * 100) / 100;
  const looked = Object.values(tiers).reduce((a, b) => a + b, 0);
  return { sites: n, mode, craft,
    look: { tiers, signals: Object.fromEntries(Object.entries(signals).sort((a, b) => b[1] - a[1]).map(([id, c]) => [id, { sites: c, rate: looked ? Math.round((c / looked) * 100) / 100 : 0 }])) },
    advice: Object.entries(craft).filter(([, k]) => k.level === "should" && k.n >= 10 && k.fail_rate >= ADVICE_RATE).map(([id]) => id).sort(),
    frequent_must: Object.entries(craft).filter(([, k]) => k.level === "must" && k.n >= 10 && k.fail_rate >= 0.2).map(([id, k]) => `${id} (${Math.round(k.fail_rate * 100)} %)`).sort() };
}

export async function calibrateBank(type, { cwd, limit = 0, dir = BANK_DIR, file = CALIBRATION_FILE, parallel = 4 } = {}) {
  const { craftAt } = await import("./craft.mjs");
  const { lookAt } = await import("./look.mjs");
  const bank = loadBank(dir);
  const ids = type === "all" ? Object.keys(bank.types) : [type];
  const prev = loadCalibration(file) || { pages: [] };
  const pages = prev.pages.filter((p) => !ids.includes(p.type));
  for (const id of ids) {
    const t = bank.types[id];
    if (!t) return { errors: [`Unknown site type "${id}"`] };
    const urls = t.sites.map((s) => s.url).slice(0, limit || undefined);
    // The sites of the bank are public pages meant to convince or to be read: measured in "persuade" mode.
    const craft = await inParallel(urls, parallel, (slice) => craftAt(slice, { cwd, mode: "persuade", calibration: null }));
    if (!craft.available) return craft;
    const look = await inParallel(urls, parallel, (slice) => lookAt(slice, { cwd, mode: "persuade" }));
    urls.forEach((url, i) => {
      const c = craft.pages[i], l = look.pages?.[i];
      if (!c || c.error === "not measured") { pages.push({ type: id, url, error: "not measured" }); return; }
      if (c?.error) { pages.push({ type: id, url, error: c.error }); return; }
      pages.push({ type: id, url, craft: { checks: Object.fromEntries(Object.entries(c.checks).map(([k, v]) => [k, { level: v.level, ok: v.ok }])) },
        look: l && !l.error ? { tier: l.tier, points: l.points, signals: l.counted } : null });
    });
  }
  const summary = summarizeCalibration(pages, { mode: "persuade" });
  writeFileSync(file, JSON.stringify({ measured: new Date().toISOString().slice(0, 10), advice_rate: ADVICE_RATE, ...summary, pages }, null, 1) + "\n");
  return { measured: summary.sites, failed_to_load: pages.filter((p) => p.error).length, advice: summary.advice, frequent_must: summary.frequent_must, look: summary.look,
    reading: `A "should" failed by ${ADVICE_RATE * 100} % or more of the excellent sites becomes advice in sw craft. Sites change: calibrate again before a release.` };
}
