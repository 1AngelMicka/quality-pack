// Scoring and report rendering. Port of the scoring rules in referential/scoring.yaml.
import { allDomains, applies, resolveFlags } from "./ref.mjs";

const STATUSES = new Set(["pass", "partial", "fail", "unknown", "na"]);
const ORDER = { blocker: 0, major: 1, minor: 2 };

export function compute(audit, ref) {
  const profile = ref.profiles[audit.profile];
  if (!profile) throw new Error(`Unknown profile "${audit.profile}"`);
  const flags = resolveFlags(audit.flags ?? profile.default_flags, ref);
  const { severity_weight: sw, status_value: sv, blocker_cap: cap, global_blocker_cap: gcap } = ref.scoring;
  const results = audit.results || {};
  const domains = [];
  const issues = [];
  let carried = 0;
  let total = 0;
  let totalW = 0;

  for (const d of allDomains(ref)) {
    const weight = profile.weights[d.id] ?? 0;
    const entry = { id: d.id, group: d.group, label: d.label, weight, score: null, capped: false };
    if (weight === 0 || !applies(d, flags)) { domains.push(entry); continue; }
    let num = 0, den = 0, blockerFailed = false;
    for (const c of d.criteria) {
      if (!applies(c, flags)) continue;
      const r = results[c.id] || {};
      let status = r.status || "unknown";
      if (!STATUSES.has(status)) throw new Error(`${c.id}: unknown status "${status}"`);
      if (status === "na") continue;
      if (r.carried_from) carried++;
      if (c.severity === "blocker" && status === "partial") status = "fail"; // a blocker is met or not
      const value = status === "unknown" ? sv.fail : sv[status];
      const w = sw[c.severity];
      num += w * value;
      den += w;
      if (value < 1) {
        issues.push({ id: c.id, domain: d.id, group: d.group, severity: c.severity, status, label: c.label,
          fix: r.fix || "", evidence: r.evidence || "" });
        if (c.severity === "blocker") blockerFailed = true;
      }
    }
    if (den === 0) { domains.push(entry); continue; }
    let score = (10 * num) / den;
    if (blockerFailed && score > cap) { score = cap; entry.capped = true; }
    entry.score = Math.round(score * 10) / 10;
    total += score * weight;
    totalW += weight;
    domains.push(entry);
  }
  let global = totalW ? Math.round((total / totalW) * 10) / 10 : null;
  const openBlockers = issues.filter((i) => i.severity === "blocker").length;
  let globalCapped = false;
  if (global !== null && gcap != null && openBlockers && global > gcap) { global = gcap; globalCapped = true; }
  issues.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]
    || Number(a.status === "unknown") - Number(b.status === "unknown") || a.id.localeCompare(b.id));
  return { date: audit.date, project: audit.project, profile: audit.profile, global, global_capped: globalCapped,
    open_blockers: openBlockers, carried, domains, issues };
}

const T = {
  fr: { title: "Rapport d'audit qualité", global: "Note globale", profile: "Profil", domain: "Domaine", score: "Note",
    trend: "Évolution", blockers: "Points bloquants", toFix: "À corriger ensuite", unknown: "Non vérifiés", na: "Sans objet",
    none: "Aucun", criterion: "Critère", severity: "Sévérité", fix: "Correctif",
    sev: { blocker: "bloquant", major: "majeur", minor: "mineur" }, capped: "plafonnée",
    cappedNote: "Note plafonnée : un critère bloquant est en échec ou non vérifié.", date: "Date", sep: " : ",
    previous: "Audit précédent", carried: "critères repris d'un audit précédent sans nouvelle vérification" },
  en: { title: "Quality audit report", global: "Overall score", profile: "Profile", domain: "Domain", score: "Score",
    trend: "Trend", blockers: "Blockers", toFix: "Fix next", unknown: "Not checked", na: "Not applicable",
    none: "None", criterion: "Criterion", severity: "Severity", fix: "Fix",
    sev: { blocker: "blocker", major: "major", minor: "minor" }, capped: "capped",
    cappedNote: "Capped score: a blocker failed or was not checked.", date: "Date", sep: ": ",
    previous: "Previous audit", carried: "criteria carried over from a previous audit without a new check" },
};

export function grade(score, ref, lang) {
  const g = ref.scoring.grades.find((x) => score >= x.min);
  return g ? g[lang] : "";
}

export function toMarkdown(report, ref, lang = "fr", previous = null) {
  const t = T[lang];
  const num = (x) => (lang === "fr" ? String(x).replace(".", ",") : String(x));
  const trend = (n, o) => {
    if (n == null || o == null) return "";
    const d = Math.round((n - o) * 10) / 10;
    return d === 0 ? "=" : num((d > 0 ? "+" : "") + d.toFixed(1));
  };
  const prev = Object.fromEntries((previous?.domains || []).map((d) => [d.id, d.score]));
  const L = [`# ${t.title}${report.project ? ` — ${report.project}` : ""}`, ""];
  const g = report.global;
  let head = g == null ? `**${t.global}${t.sep}—**` : `**${t.global}${t.sep}${num(g.toFixed(1))}/10** (${grade(g, ref, lang)})`;
  if (report.global_capped) head += ` — ${t.capped}`;
  if (previous?.global != null && g != null) head += ` · ${t.trend} ${trend(g, previous.global)}`;
  L.push(head, "", `${t.profile}${t.sep}${ref.profiles[report.profile].label[lang]} · ${t.date}${t.sep}${report.date || "—"}`
    + (previous ? ` · ${t.previous}${t.sep}${previous.date}` : ""), "");
  L.push(`| ${t.domain} | ${t.score} | ${t.trend} |`, "| --- | --- | --- |");
  for (const d of report.domains) {
    if (d.score == null) continue;
    L.push(`| ${d.label[lang]} | ${num(d.score.toFixed(1))}${d.capped ? ` (${t.capped})` : ""} | ${trend(d.score, prev[d.id])} |`);
  }
  if (report.domains.some((d) => d.capped) || report.global_capped) L.push("", `_${t.cappedNote}_`);
  if (report.carried) L.push("", `_${report.carried} ${t.carried}._`);
  const skipped = report.domains.filter((d) => d.score == null).map((d) => d.label[lang]);
  if (skipped.length) L.push("", `_${t.na}${t.sep}${skipped.join(", ")}_`);
  const table = (rows, title) => {
    const out = ["", `## ${title}`, ""];
    if (!rows.length) return [...out, t.none];
    out.push(`| ${t.criterion} | ${t.severity} | ${t.fix} |`, "| --- | --- | --- |");
    for (const i of rows) out.push(`| ${i.id} — ${i.label[lang]} | ${t.sev[i.severity]} | ${(i.fix || "—").replace(/\|/g, "\\|").replace(/\n/g, " ")} |`);
    return out;
  };
  L.push(...table(report.issues.filter((i) => i.severity === "blocker"), t.blockers));
  L.push(...table(report.issues.filter((i) => i.severity !== "blocker" && i.status !== "unknown"), t.toFix));
  L.push(...table(report.issues.filter((i) => i.severity !== "blocker" && i.status === "unknown"), t.unknown));
  return L.join("\n") + "\n";
}
