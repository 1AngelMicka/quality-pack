// Claims shown on public pages: figures about customers and results, quotes attributed to people, customer names
// and logos, ratings, compliance badges. Each must come from a fact the user supplied, recorded in
// .quality/facts.json. Invented proof is the commonest sign of a generated page, and often unlawful.
// The page is rendered in a browser; claims are found with patterns, so read the list: a pattern can miss a
// claim written in an unusual way, and can flag a number that is not a claim.
//
// .quality/facts.json: { "facts": [ { "claim": "1,240 teams", "source": "admin dashboard, 2026-11-10", "date": "2026-11-10" },
//                                   { "claim": "Marie Dupont, Atelier Nord", "source": "email of 2026-10-02, agreed to be quoted" } ] }
import { loadBrowserTools, launch } from "./browser.mjs";

const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[  ]/g, " ").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
const digits = (s) => (String(s).match(/\d+(?:[.,]\d+)?/g) || []).map((d) => d.replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));

// Runs in the page.
function collect() {
  const shown = (e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && r.width > 1 && r.height > 1; };
  const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
  const out = [];
  const push = (kind, text, where) => { const t = clean(text); if (t.length >= 3 && !out.some((o) => o.kind === kind && o.text === t)) out.push({ kind, text: t.slice(0, 220), where }); };
  const NOUN = "(?:customers?|clients?|users?|utilisateurs?|teams?|equipes?|équipes?|companies|entreprises?|businesses|organi[sz]ations?|developers?|développeurs?|countries|pays|downloads?|téléchargements?|reviews?|avis|members?|membres?|projects?|projets?|stars?|installs?|subscribers?|abonnés?|sites?|stores?|boutiques?|restaurants?|students?|étudiants?|patients?|freelancers?|freelances?|indépendants?|independants?|professionals?|professionnels?|agencies|agences?|shops?|commerces?|creators?|créateurs?|people|personnes)";
  const FIGURE = new RegExp(`(?:\\+|plus de |over |more than |près de |nearly )?\\d[\\d\\s.,  ]*\\s?(?:k|m|million|millions|milliers|thousand)?\\+?\\s+(?:\\w+\\s){0,2}${NOUN}\\b`, "gi");
  const PERCENT = /\b\d{1,3}(?:[.,]\d+)?\s?%\s+(?:\w+\s){0,4}(?:faster|plus rapide|more|de plus|increase|augmentation|uptime|disponibilité|satisfaction|growth|croissance|reduction|réduction|less|de moins|conversion|saved|économisé|retention|rétention)/gi;
  const RATING = /\b[1-5](?:[.,]\d)?\s?(?:\/\s?5|out of 5|sur 5|stars?|étoiles?)\b[^.]{0,40}/gi;
  const TIMES = /\b\d+(?:[.,]\d+)?\s?[x×]\s+(?:faster|plus rapide|more|plus|cheaper|moins cher)/gi;
  const MONEY = /(?:[$€£]\s?\d[\d.,]*\s?(?:k|m|million|billion|milliards?)?|\d[\d.,]*\s?(?:k|m|millions?|milliards?)?\s?[$€£])\s+(?:\w+\s){0,3}(?:saved|économisés?|raised|levés?|processed|traités?|in revenue|de chiffre)/gi;
  const BADGE = /\b(?:SOC\s?2|ISO\s?27001|ISO\s?9001|HIPAA|PCI[- ]DSS|HDS|SecNumCloud|GDPR[- ]compliant|conforme (?:au )?RGPD|RGPD compliant|certified B Corp|B Corp)\b/gi;
  const body = document.querySelector("main") || document.body;
  const text = clean(body.innerText);
  for (const [kind, re] of [["figure", FIGURE], ["figure", PERCENT], ["rating", RATING], ["figure", TIMES], ["figure", MONEY], ["badge", BADGE]]) for (const m of text.matchAll(re)) push(kind, m[0], "text");
  // Quotes attributed to someone: blockquote or figure with a cite or caption, and common testimonial markup.
  for (const q of body.querySelectorAll("blockquote, figure, [class*=testimonial i], [class*=temoignage i], [class*=témoignage i], [class*=review i], [class*=quote i]")) {
    if (!shown(q)) continue;
    const who = q.querySelector("cite, figcaption, footer, [class*=author i], [class*=name i], [class*=auteur i]");
    const t = clean(q.innerText);
    if (t.length < 25 || t.length > 900) continue;
    if (q.querySelector("blockquote, [class*=testimonial i]") && q.tagName !== "BLOCKQUOTE") continue; // a wrapper around several quotes
    push("quote", who ? `${clean(who.innerText).slice(0, 80)}: “${t.replace(clean(who.innerText), "").slice(0, 110)}”` : `“${t.slice(0, 160)}”`, who ? "attributed quote" : "quote without a name");
  }
  // Customer names: a "trusted by" block and the logos next to it.
  for (const e of body.querySelectorAll("section, div, ul, p, h2, h3")) {
    const own = clean([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ")) || (e.children.length <= 1 ? clean(e.innerText) : "");
    if (!/trusted by|used by|loved by|they trust us|ils nous font confiance|elles nous font confiance|nos clients|our customers|as seen (?:on|in)|vu (?:sur|dans)|featured in|backed by|soutenu par/i.test(own) || own.length > 160) continue;
    const scope = e.closest("section") || e.parentElement || e;
    const names = [...scope.querySelectorAll("img[alt], svg[aria-label], [title]")].filter(shown).map((i) => clean(i.getAttribute("alt") || i.getAttribute("aria-label") || i.getAttribute("title"))).filter((n) => n.length >= 2 && n.length <= 60);
    push("customers", `${own.slice(0, 80)}${names.length ? `: ${[...new Set(names)].slice(0, 12).join(", ")}` : " (logos without a name)"}`, "logo block");
  }
  return out;
}

// Is a claim covered by a recorded fact? A figure is covered when a fact holds the same numbers; a quote or a
// customer block when a fact names the person or the companies.
export function traced(claim, facts) {
  const c = fold(claim.text), cd = digits(claim.text);
  for (const f of facts) {
    const t = fold(f.claim);
    if (!t) continue;
    if (c.includes(t) || t.includes(c)) return f;
    if (["figure", "rating"].includes(claim.kind)) { const fd = digits(f.claim); if (cd.length && fd.length && cd.every((d) => fd.includes(d))) return f; continue; }
    const words = t.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
    if (words.length && words.filter((w) => c.includes(w)).length >= Math.min(2, words.length)) return f;
  }
  return null;
}

export async function factsAt(urls, { cwd, known = null } = {}) {
  const tools = await loadBrowserTools(cwd);
  if (!tools) return { available: false, hint: "Playwright is not available. Run `node <qp.mjs> browser-setup` once (pack cache, not the project)." };
  const facts = (known?.facts || []).filter((f) => f && f.claim);
  const unsourced = facts.filter((f) => !f.source || String(f.source).trim().length < 5).map((f) => f.claim);
  const browser = await launch(tools.chromium);
  const pages = [];
  try {
    for (const url of urls) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => { if (!/Timeout/i.test(e.message)) throw e; });
        // Reveal lazy sections before reading.
        await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
        const claims = (await page.evaluate(collect)).map((c) => { const f = traced(c, facts); return { ...c, traced: !!f, source: f?.source }; });
        pages.push({ url, claims, untraced: claims.filter((c) => !c.traced).length });
      } catch (e) { pages.push({ url, error: String(e.message).split("\n")[0].slice(0, 200) }); }
      await ctx.close();
    }
  } finally { await browser.close(); }
  const all = pages.flatMap((p) => p.claims || []);
  return { available: true, facts_file: known ? `.quality/facts.json (${facts.length} facts)` : "no .quality/facts.json", pages,
    summary: { claims: all.length, traced: all.filter((c) => c.traced).length, untraced: all.filter((c) => !c.traced).length, by_kind: all.reduce((m, c) => (m[c.kind] = (m[c.kind] || 0) + 1, m), {}), facts_without_source: unsourced },
    note: "Found with patterns on the rendered page: read the list. For each untraced claim, ask the user for its source and record it in .quality/facts.json, or remove the claim. Never record a fact yourself without the user giving it." };
}
