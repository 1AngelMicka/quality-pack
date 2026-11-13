// Scoring and report rendering. Port of the scoring rules in referential/scoring.yaml.
// Two scores, each with its own blockers: Experience (what the user lives) and Engineering and operations
// (what keeps it safe and running). A missing uptime probe no longer hides how the interface fares, and a
// clean server no longer hides an interface people cannot use. The overall score is kept for history.
import { allDomains, applies, resolveFlags } from "./ref.mjs";

const STATUSES = new Set(["pass", "partial", "fail", "unknown", "na"]);
const ORDER = { blocker: 0, major: 1, minor: 2 };
const round1 = (x) => Math.round(x * 10) / 10;

// Status the heuristic review allows for its criterion: a critical finding fails it, a major one caps it at partial.
export function reviewCap(findings) {
  const list = findings || [];
  if (list.some((f) => f.severity === "critical")) return "fail";
  if (list.some((f) => f.severity === "major")) return "partial";
  return null;
}

export function compute(audit, ref) {
  const profile = ref.profiles[audit.profile];
  if (!profile) throw new Error(`Unknown profile "${audit.profile}"`);
  const flags = resolveFlags(audit.flags ?? profile.default_flags, ref);
  const { severity_weight: sw, status_value: sv, blocker_cap: cap, global_blocker_cap: gcap } = ref.scoring;
  const areas = ref.score_areas || {};
  const areaOf = Object.fromEntries(Object.entries(areas).flatMap(([k, a]) => a.domains.map((d) => [d, k])));
  const results = audit.results || {};
  const domains = [];
  const issues = [];
  const raw = {};
  let carried = 0;
  let total = 0;
  let totalW = 0;

  for (const d of allDomains(ref)) {
    const weight = profile.weights[d.id] ?? 0;
    const entry = { id: d.id, group: d.group, area: areaOf[d.id] || null, label: d.label, weight, score: null, capped: false };
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
        issues.push({ id: c.id, domain: d.id, group: d.group, area: entry.area, severity: c.severity, status, label: c.label,
          fix: r.fix || "", evidence: r.evidence || "", challenged_from: r.challenged_from });
        if (c.severity === "blocker") blockerFailed = true;
      }
    }
    if (den === 0) { domains.push(entry); continue; }
    let score = (10 * num) / den;
    if (blockerFailed && score > cap) { score = cap; entry.capped = true; }
    entry.score = round1(score);
    raw[d.id] = score;
    total += score * weight;
    totalW += weight;
    domains.push(entry);
  }
  const blockersIn = (area) => issues.filter((i) => i.severity === "blocker" && (area == null || i.area === area)).length;
  const scores = {};
  for (const [k, a] of Object.entries(areas)) {
    let t = 0, w = 0;
    for (const e of domains) if (e.area === k && e.score != null) { t += raw[e.id] * e.weight; w += e.weight; }
    let s = w ? round1(t / w) : null;
    const open = blockersIn(k);
    let capped = false;
    if (s !== null && gcap != null && open && s > gcap) { s = gcap; capped = true; }
    scores[k] = { score: s, capped, open_blockers: open };
  }
  let global = totalW ? round1(total / totalW) : null;
  const openBlockers = blockersIn(null);
  let globalCapped = false;
  if (global !== null && gcap != null && openBlockers && global > gcap) { global = gcap; globalCapped = true; }
  issues.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]
    || Number(a.status === "unknown") - Number(b.status === "unknown") || a.id.localeCompare(b.id));
  return { run: audit.run || audit.date, date: audit.date, project: audit.project, profile: audit.profile, scores, global, global_capped: globalCapped,
    open_blockers: openBlockers, carried, domains, issues, review: audit.review_findings || [], challenged: audit.challenged || [] };
}

const T = {
  fr: { title: "Rapport d'audit qualité", global: "Note d'ensemble", profile: "Profil", domain: "Domaine", score: "Note",
    trend: "Évolution", blockers: "Points bloquants", toFix: "À corriger ensuite", unknown: "Non vérifiés", na: "Sans objet",
    none: "Aucun", criterion: "Critère", severity: "Sévérité", fix: "Correctif", area: "Note",
    sev: { blocker: "bloquant", major: "majeur", minor: "mineur" }, capped: "plafonnée",
    cappedNote: "Note plafonnée : un critère bloquant de cette note est en échec ou non vérifié.", date: "Date", sep: " : ",
    globalNote: "Moyenne de tous les domaines, plafonnée dès qu'un point bloquant est ouvert, quelle que soit la note concernée. Les deux notes ci-dessus disent où agir.",
    mode: { full: "complet", incremental: "incrémental", scoped: "partiel", quick: "rapide" }, modeLabel: "Mode",
    saved: "tokens évités grâce aux sorties de commandes compactes", previous: "Audit précédent", carried: "critères repris d'un audit précédent sans nouvelle vérification",
    review: "Revue d'ergonomie", reviewIntro: "Problèmes relevés en parcourant les tâches clés (heuristiques de Nielsen, de Bastien et Scapin). Un problème critique fait échouer {id}, un majeur le plafonne à « partiel ». `/sw:fix` les corrige comme les autres.",
    problem: "Problème", where: "Où", rsev: { critical: "critique", major: "majeur", minor: "mineur" },
    challenge: "Contre-vérification", challengeIntro: "Critères réussis revus à la baisse en relisant les captures des parcours (« un utilisateur pressé s'en sortirait-il ? ») :",
    st: { pass: "réussi", partial: "partiel", fail: "échec", unknown: "non vérifié", na: "sans objet" } },
  en: { title: "Quality audit report", global: "Overall score", profile: "Profile", domain: "Domain", score: "Score",
    trend: "Trend", blockers: "Blockers", toFix: "Fix next", unknown: "Not checked", na: "Not applicable",
    none: "None", criterion: "Criterion", severity: "Severity", fix: "Fix", area: "Score",
    sev: { blocker: "blocker", major: "major", minor: "minor" }, capped: "capped",
    cappedNote: "Capped score: a blocker of this score failed or was not checked.", date: "Date", sep: ": ",
    globalNote: "Average of every domain, capped as soon as any blocker is open, whichever score it belongs to. The two scores above say where to act.",
    mode: { full: "full", incremental: "incremental", scoped: "scoped", quick: "quick" }, modeLabel: "Mode",
    saved: "tokens saved by compact command outputs", previous: "Previous audit", carried: "criteria carried over from a previous audit without a new check",
    review: "Ergonomics review", reviewIntro: "Problems found while walking through the key tasks (Nielsen's heuristics, Bastien and Scapin's criteria). A critical problem fails {id}, a major one caps it at partial. `/sw:fix` fixes them like the other issues.",
    problem: "Problem", where: "Where", rsev: { critical: "critical", major: "major", minor: "minor" },
    challenge: "Counter-check", challengeIntro: "Passed criteria lowered after re-reading the flow screenshots (\"would a user in a hurry get through?\"):",
    st: { pass: "pass", partial: "partial", fail: "fail", unknown: "not checked", na: "n/a" } },
};

export function grade(score, ref, lang) {
  const g = ref.scoring.grades.find((x) => score >= x.min);
  return g ? g[lang] : "";
}

export function toMarkdown(report, ref, lang = "fr", previous = null) {
  const t = T[lang];
  const num = (x) => (lang === "fr" ? String(x).replace(".", ",") : String(x));
  const cell = (s) => String(s ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const trend = (n, o) => {
    if (n == null || o == null) return "";
    const d = Math.round((n - o) * 10) / 10;
    return d === 0 ? "=" : num((d > 0 ? "+" : "") + d.toFixed(1));
  };
  const areas = ref.score_areas || {};
  const prev = Object.fromEntries((previous?.domains || []).map((d) => [d.id, d.score]));
  const L = [`# ${t.title}${report.project ? ` — ${report.project}` : ""}`, ""];
  const line = (label, s, capped, old) => {
    if (s == null) return `**${label}${t.sep}—**`;
    let h = `**${label}${t.sep}${num(s.toFixed(1))}/10** (${grade(s, ref, lang)})`;
    if (capped) h += ` — ${t.capped}`;
    if (old != null) h += ` · ${t.trend} ${trend(s, old)}`;
    return h;
  };
  for (const [k, a] of Object.entries(areas)) {
    const s = report.scores?.[k];
    if (s) L.push(line(a.label[lang], s.score, s.capped, previous?.scores?.[k]?.score), "");
  }
  const g = report.global;
  L.push(`${t.global}${t.sep}${g == null ? "—" : `${num(g.toFixed(1))}/10`}${report.global_capped ? ` (${t.capped})` : ""}`
    + (previous?.global != null && g != null ? ` · ${t.trend} ${trend(g, previous.global)}` : "") + ` — _${t.globalNote}_`, "");
  L.push(`${t.profile}${t.sep}${ref.profiles[report.profile].label[lang]} · ${t.date}${t.sep}${report.date || "—"}`
    + (report.run && report.run !== report.date ? ` (${report.run})` : "")
    + (report.mode ? ` · ${t.modeLabel}${t.sep}${t.mode[report.mode] || report.mode}` : "")
    + (previous ? ` · ${t.previous}${t.sep}${previous.run || previous.date}` : ""));
  const groups = Object.keys(areas).length ? Object.entries(areas).map(([k, a]) => [a.label[lang], report.domains.filter((d) => d.area === k)])
    : [[t.domain, report.domains]];
  for (const [title, list] of groups) {
    const rows = list.filter((d) => d.score != null);
    if (!rows.length) continue;
    L.push("", `## ${title}`, "", `| ${t.domain} | ${t.score} | ${t.trend} |`, "| --- | --- | --- |");
    for (const d of rows) L.push(`| ${d.label[lang]} | ${num(d.score.toFixed(1))}${d.capped ? ` (${t.capped})` : ""} | ${trend(d.score, prev[d.id])} |`);
  }
  if (report.domains.some((d) => d.capped) || Object.values(report.scores || {}).some((s) => s.capped)) L.push("", `_${t.cappedNote}_`);
  if (report.carried) L.push("", `_${report.carried} ${t.carried}._`);
  if (report.token_savings?.saved) L.push("", `_~${report.token_savings.saved.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} ${t.saved} (${report.token_savings.commands} ${lang === "fr" ? "commande(s)" : "command(s)"})._`);
  const skipped = report.domains.filter((d) => d.score == null).map((d) => d.label[lang]);
  if (skipped.length) L.push("", `_${t.na}${t.sep}${skipped.join(", ")}_`);
  const areaLabel = (i) => areas[i.area]?.label[lang] || "—";
  const table = (rows, title) => {
    const o = ["", `## ${title}`, ""];
    if (!rows.length) return [...o, t.none];
    o.push(`| ${t.criterion} | ${t.area} | ${t.severity} | ${t.fix} |`, "| --- | --- | --- | --- |");
    for (const i of rows) o.push(`| ${i.id} — ${i.label[lang]} | ${areaLabel(i)} | ${t.sev[i.severity]} | ${cell(i.fix || "—")} |`);
    return o;
  };
  L.push(...table(report.issues.filter((i) => i.severity === "blocker"), t.blockers));
  if (report.review?.length) {
    L.push("", `## ${t.review}`, "", t.reviewIntro.replace("{id}", ref.scoring.review?.criterion || ""), "",
      `| ID | ${t.severity} | ${t.problem} | ${t.where} | ${t.fix} |`, "| --- | --- | --- | --- | --- |");
    for (const f of report.review) {
      const where = [f.flow, f.device, f.step ? `#${f.step}` : null].filter(Boolean).join(" · ") || f.screen || "—";
      L.push(`| ${f.id} | ${t.rsev[f.severity]}${f.heuristic ? ` (${cell(f.heuristic)})` : ""} | ${cell(f.problem)} | ${cell(where)} | ${cell(f.fix)} |`);
    }
  }
  if (report.challenged?.length) {
    L.push("", `## ${t.challenge}`, "", t.challengeIntro, "");
    for (const c of report.challenged) L.push(`- ${c.id}${t.sep}${t.st[c.from]} → ${t.st[c.to]}`);
  }
  L.push(...table(report.issues.filter((i) => i.severity !== "blocker" && i.status !== "unknown"), t.toFix));
  L.push(...table(report.issues.filter((i) => i.severity !== "blocker" && i.status === "unknown"), t.unknown));
  return L.join("\n") + "\n";
}
