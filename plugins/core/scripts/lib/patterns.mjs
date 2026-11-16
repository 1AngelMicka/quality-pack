// Pattern bank: everything the pack can propose for an interface, beyond the rules it checks. Navigation
// patterns, motion, visual effects, features, UX laws, inspiration galleries and component libraries, each with
// where it fits, what it costs and how to build it with free tools. A pattern is a choice offered to the user,
// never a requirement: the rules and checks of the referential still apply to whatever is chosen.
// Files: plugins/core/bank/patterns/<family>.json, written by hand from research (sources in SOURCES.md).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BANK_DIR, loadBank } from "./bank.mjs";

export const PATTERNS_DIR = join(BANK_DIR, "patterns");
export const SURFACES = ["persuade", "operate", "read", "phone", "desktop-app"];
// Kinds of entry: a pattern to build, a place to look for ideas, a library to build with.
const KINDS = ["pattern", "gallery", "library"];

export function loadPatterns(dir = PATTERNS_DIR) {
  const families = {};
  if (!existsSync(dir)) return { families };
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const fam = JSON.parse(readFileSync(join(dir, f), "utf8"));
    families[fam.family || f.replace(/\.json$/, "")] = fam;
  }
  return { families };
}

const all = (bank) => Object.values(bank.families).flatMap((f) => (f.entries || []).map((e) => ({ ...e, family: f.family })));

// Check the pattern files. Returns readable errors; used by the tests so that a broken entry cannot ship.
export function validatePatterns(bank, siteTypes = Object.keys(loadBank().types)) {
  const errors = [];
  const ids = new Set();
  for (const fam of Object.values(bank.families)) {
    const F = fam.family || "?";
    if (!fam.label?.fr || !fam.label?.en) errors.push(`${F}: label needs fr and en`);
    if (!fam.summary) errors.push(`${F}: summary is required`);
    if (!KINDS.includes(fam.kind)) errors.push(`${F}: kind must be one of ${KINDS.join(", ")}`);
    if (!(fam.entries || []).length) errors.push(`${F}: entries are required`);
    for (const [i, e] of (fam.entries || []).entries()) {
      const where = `${F}.entries[${i}]${e.id ? ` (${e.id})` : ""}`;
      if (!e.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id)) errors.push(`${where}: id in kebab-case is required`);
      if (ids.has(e.id)) errors.push(`${where}: duplicate id ${e.id}`);
      ids.add(e.id);
      if (!e.label?.fr || !e.label?.en) errors.push(`${where}: label needs fr and en`);
      if (!e.what || e.what.length < 20) errors.push(`${where}: what says in concrete terms what it is (20 characters or more)`);
      for (const s of e.fits?.surfaces || []) if (!SURFACES.includes(s)) errors.push(`${where}: unknown surface ${s}`);
      for (const t of e.fits?.types || []) if (!siteTypes.includes(t)) errors.push(`${where}: unknown site type ${t}`);
      if (fam.kind === "pattern") {
        for (const k of ["use_when", "avoid_when", "build"]) if (!e[k]) errors.push(`${where}: ${k} is required`);
        if (!e.fits?.surfaces?.length) errors.push(`${where}: fits.surfaces is required`);
      } else {
        try { const u = new URL(e.url); if (u.protocol !== "https:") errors.push(`${where}: https address expected`); } catch { errors.push(`${where}: url is not an address`); }
        if (!e.access) errors.push(`${where}: access says what is free and what is paid`);
        if (fam.kind === "library" && !e.licence) errors.push(`${where}: licence is required`);
      }
      for (const [j, s] of (e.sources || []).entries()) {
        try { new URL(s.url); } catch { errors.push(`${where}.sources[${j}]: url is not an address`); }
        if (!s.name) errors.push(`${where}.sources[${j}]: name is required`);
      }
    }
  }
  return errors;
}

const fitsFilter = ({ type, surface }) => (e) =>
  (!type || !e.fits?.types?.length || e.fits.types.includes(type)) && (!surface || !e.fits?.surfaces?.length || e.fits.surfaces.includes(surface));

const brief = (e) => ({ id: e.id, label: e.label?.en, what: e.what, ...(e.url ? { url: e.url, access: e.access } : {}), ...(e.licence ? { licence: e.licence } : {}) });

// sw patterns                     the families, with counts
// sw patterns <family>            the entries of a family
// sw patterns <id>                one entry in full
// sw patterns search <words>      entries whose text matches every word
// Filters: --type <site type> and --surface <persuade|operate|read|phone|desktop-app> keep what fits.
export function listPatterns(bank, args = [], { type, surface } = {}) {
  const entries = all(bank).filter(fitsFilter({ type, surface }));
  const filters = { ...(type ? { type } : {}), ...(surface ? { surface } : {}) };
  if (!args.length) return {
    filters,
    families: Object.values(bank.families).map((f) => ({ family: f.family, kind: f.kind, label: f.label?.en, summary: f.summary, entries: entries.filter((e) => e.family === f.family).length })),
    usage: "sw.mjs patterns <family> | <id> | search <words> [--type <site type>] [--surface <persuade|operate|read|phone|desktop-app>]. Propose patterns as options; the referential's rules still apply to what is chosen.",
  };
  if (args[0] === "search") {
    const words = args.slice(1).map((w) => w.toLowerCase());
    if (!words.length) return { errors: ["Usage: sw.mjs patterns search <words>"] };
    const hits = entries.filter((e) => { const text = JSON.stringify(e).toLowerCase(); return words.every((w) => text.includes(w)); });
    return { filters, search: words.join(" "), count: hits.length, entries: hits.map((e) => ({ family: e.family, ...brief(e) })) };
  }
  const fam = bank.families[args[0]];
  if (fam) return { filters, family: fam.family, kind: fam.kind, label: fam.label, summary: fam.summary, count: entries.filter((e) => e.family === fam.family).length,
    entries: entries.filter((e) => e.family === fam.family).map(brief) };
  const one = all(bank).find((e) => e.id === args[0]);
  if (one) return { entry: one };
  return { errors: [`Unknown family or pattern "${args[0]}". Families: ${Object.keys(bank.families).join(", ")}. Try: sw.mjs patterns search <word>`] };
}
