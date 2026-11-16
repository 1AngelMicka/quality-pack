// The user's choices. The pack's limits are defaults, never ceilings: when the user wants more than a rule
// allows (rich motion, glass, a third typeface, a long pinned scene…), it is built, its cost is said once, and
// the choice is written in .quality/project.json › choices: [{ id, what, why, date }]. `id` names what the choice
// lifts: a criterion (SLP-05), a scroll rule (SCRL-09), a `sw craft` check (heading_wrap) or a `sw look` signal
// or check (LOOK-GLASS, scroll_hijack). The measures then report it as "chosen", not as a defect.

export function choiceMap(project) {
  const map = new Map();
  for (const c of project?.choices || []) if (c && typeof c.id === "string" && c.id.trim()) map.set(c.id.trim(), c.why || c.what || "chosen by the user");
  return map;
}

// sw look: a chosen signal no longer counts towards the generic-look tier; a chosen check passes as "chosen".
export function applyLookChoices(result, map) {
  if (!map.size) return result;
  for (const p of result.pages || []) {
    if (!p.signals) continue;
    const chosen = [];
    for (const s of p.signals) if (map.has(s.id)) { s.chosen = map.get(s.id); chosen.push(s.id); }
    if (chosen.length && Array.isArray(p.counted)) {
      const weightOf = Object.fromEntries(p.signals.map((s) => [s.id, s.weight || 0]));
      p.counted = p.counted.filter((id) => !map.has(id));
      p.points = p.counted.reduce((t, id) => t + (weightOf[id] || 0), 0);
      if (typeof p.tier === "string" && !p.tier.startsWith("not measured")) p.tier = p.points >= 4 ? "strong" : p.points >= 2 ? "some" : "low";
    }
    for (const [k, c] of Object.entries(p.checks || {})) if (map.has(k) && c && !c.ok) { c.ok = true; c.chosen = map.get(k); chosen.push(k); }
    if (chosen.length) p.chosen = [...new Set(chosen)];
  }
  return result;
}

// sw craft: a chosen "must" or "should" leaves the failed lists and is listed under summary.chosen.
export function applyCraftChoices(result, map) {
  if (!map.size) return result;
  for (const p of result.pages || []) {
    if (!p.checks || !p.summary) continue;
    const chosen = [];
    for (const [k, c] of Object.entries(p.checks)) if (map.has(k) && !c.ok && (c.level === "must" || c.level === "should")) { c.chosen = map.get(k); c.level = "chosen"; chosen.push(k); }
    if (!chosen.length) continue;
    p.summary.must_failed = p.summary.must_failed.filter((k) => !chosen.includes(k));
    p.summary.should_failed = p.summary.should_failed.filter((k) => !chosen.includes(k));
    p.summary.chosen = chosen;
  }
  return result;
}
