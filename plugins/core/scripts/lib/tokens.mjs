// Design tokens in the W3C DTCG format (2025.10): structure, references, units, tiers, then colours —
// contrast of every text, border and focus colour against every background, per theme (WCAG 2 formula,
// never rounded), and whether OKLCH colours fit in sRGB. No dependency.

const NAME_BAD = /^\$|[{}.]/;
const isToken = (o) => o && typeof o === "object" && "$value" in o;
const TIERS = { primitive: 0, base: 0, ref: 0, core: 0, semantic: 1, sys: 1, alias: 1, component: 2, comp: 2 };

// Walk groups and tokens; $type is inherited from the closest group.
export function flatten(doc) {
  const tokens = new Map(), errors = [];
  const walk = (node, path, type) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("$")) continue;
      const p = [...path, k];
      if (NAME_BAD.test(k)) errors.push(`${p.join(".")}: a name cannot start with $ or contain { } .`);
      if (!v || typeof v !== "object") { errors.push(`${p.join(".")}: must be a token (with $value) or a group`); continue; }
      const t = v.$type || type;
      if (isToken(v)) tokens.set(p.join("."), { path: p, type: t, value: v.$value, ext: v.$extensions });
      else walk(v, p, t);
    }
  };
  walk(doc, [], doc.$type);
  return { tokens, errors };
}

const REF = /^\{([^{}]+)\}$/;
export function resolve(tokens) {
  const errors = [], out = new Map();
  const get = (name, seen = []) => {
    if (seen.includes(name)) { errors.push(`circular reference: ${[...seen, name].join(" → ")}`); return undefined; }
    const t = tokens.get(name);
    if (!t) return undefined;
    if (typeof t.value === "string" && REF.test(t.value)) {
      const target = REF.exec(t.value)[1];
      if (!tokens.has(target)) { errors.push(`${name}: unresolved reference {${target}}`); return undefined; }
      const r = get(target, [...seen, name]);
      return r && { ...r, type: t.type || r.type, via: target };
    }
    return { value: t.value, type: t.type };
  };
  for (const name of tokens.keys()) { const r = get(name); if (r) out.set(name, r); }
  return { resolved: out, errors: [...new Set(errors)] };
}

function checkValue(name, type, v, errors) {
  const unit = (allowed) => { if (!v || typeof v !== "object" || typeof v.value !== "number" || !allowed.includes(v.unit)) errors.push(`${name}: ${type} must be {value: number, unit: ${allowed.join("|")}}`); };
  switch (type) {
    case "dimension": return unit(["px", "rem"]);
    case "duration": return unit(["ms", "s"]);
    case "fontWeight": if (typeof v === "number" && (v < 1 || v > 1000)) errors.push(`${name}: fontWeight must be between 1 and 1000`); return;
    case "cubicBezier": if (!Array.isArray(v) || v.length !== 4 || v[0] < 0 || v[0] > 1 || v[2] < 0 || v[2] > 1) errors.push(`${name}: cubicBezier needs 4 numbers with x1 and x2 in [0, 1]`); return;
    case "color": if (parseColor(v) === null) errors.push(`${name}: colour not understood (DTCG {colorSpace, components} or #hex, rgb(), oklch())`); return;
    case undefined: errors.push(`${name}: no $type on the token or its groups (types are never guessed)`); return;
    default: return;
  }
}

// ---- Colour: everything goes to linear sRGB (values outside 0..1 mean out of the sRGB gamut).
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function oklabToLinearSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
const oklch = (L, C, H) => { const h = ((H || 0) * Math.PI) / 180; return oklabToLinearSrgb(L, C * Math.cos(h), C * Math.sin(h)); };

export function parseColor(v) {
  if (v && typeof v === "object" && Array.isArray(v.components)) {
    const c = v.components.map((x) => (x === "none" ? 0 : x));
    switch (v.colorSpace) {
      case "srgb": return c.map(toLinear);
      case "srgb-linear": return c;
      case "oklch": return oklch(...c);
      case "oklab": return oklabToLinearSrgb(...c);
      default: return v.hex ? parseColor(v.hex) : null;
    }
  }
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((x) => x + x).join("");
    return [0, 2, 4].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255));
  }
  m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) return m[1].split(/[\s,/]+/).slice(0, 3).map((x) => toLinear(x.endsWith("%") ? parseFloat(x) / 100 : Number(x) / 255));
  m = /^oklch\(([^)]+)\)$/.exec(s);
  if (m) {
    const [L, C, H] = m[1].split(/[\s/]+/).map((x) => (x.endsWith("%") ? parseFloat(x) / 100 : Number(x)));
    return oklch(L, C, H);
  }
  return null;
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const luminance = (lin) => 0.2126 * clamp01(lin[0]) + 0.7152 * clamp01(lin[1]) + 0.0722 * clamp01(lin[2]);
// WCAG 2 contrast ratio, truncated (never rounded up): 4.499 stays under 4.5.
export const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return Math.floor(((hi + 0.05) / (lo + 0.05)) * 100) / 100; };
export const inGamut = (lin) => lin.every((c) => c >= -0.0005 && c <= 1.0005);

const ROLE = (name) => {
  const n = name.toLowerCase();
  if (/(^|[.-])(bg|background|surface|canvas|base|backdrop)([.-]|$)/.test(n)) return "bg";
  if (/(border|outline|focus|ring|divider|stroke)/.test(n)) return "line";
  if (/(^|[.-])(text|fg|foreground|on|ink|label|heading|link|icon)([.-]|$)/.test(n)) return "fg";
  return null;
};

export function checkTokens(doc) {
  const { tokens, errors } = flatten(doc);
  const warnings = [];
  const { resolved, errors: refErrors } = resolve(tokens);
  errors.push(...refErrors);
  for (const [name, t] of tokens) {
    const r = resolved.get(name);
    if (r) checkValue(name, r.type, r.value, errors);
    // Tiers: components point to semantic tokens, semantic tokens to primitives.
    const tier = TIERS[t.path[0]] ?? (t.path[0] === "light" || t.path[0] === "dark" ? 1 : undefined);
    if (tier != null && typeof t.value === "string" && REF.test(t.value)) {
      const target = REF.exec(t.value)[1].split(".")[0];
      const tt = TIERS[target] ?? (target === "light" || target === "dark" ? 1 : undefined);
      if (tt != null && tt >= tier) warnings.push(`${name}: a ${t.path[0]} token should point to a lower tier, not to ${target}`);
    }
  }
  // Themes: top-level light/dark groups, or groups under theme/themes. Otherwise the whole file is one theme.
  const themeRoots = Object.keys(doc).filter((k) => ["light", "dark"].includes(k)).map((k) => [k, [k]]);
  for (const k of ["theme", "themes", "mode", "modes"]) if (doc[k] && typeof doc[k] === "object") for (const t of Object.keys(doc[k]).filter((x) => !x.startsWith("$"))) themeRoots.push([t, [k, t]]);
  const themes = themeRoots.length ? themeRoots : [["default", []]];
  const contrastRows = [], gamut = [];
  for (const [theme, prefix] of themes) {
    // Primitives (raw palette steps) are not paired: only the colours that carry a role are.
    const inTheme = [...resolved].filter(([n, r]) => r.type === "color" && prefix.every((p, i) => tokens.get(n).path[i] === p)
      && (prefix.length > 0 || (TIERS[tokens.get(n).path[0]] ?? 1) >= 1));
    const by = (role) => inTheme.filter(([n]) => ROLE(n.split(".").slice(prefix.length).join(".")) === role);
    for (const [bgName, bg] of by("bg")) {
      const bgc = parseColor(bg.value);
      for (const [fgName, fg] of [...by("fg"), ...by("line")]) {
        const fgc = parseColor(fg.value);
        if (!bgc || !fgc) continue;
        const need = ROLE(fgName.split(".").slice(prefix.length).join(".")) === "line" ? 3 : 4.5;
        const ratio = contrast(fgc, bgc);
        contrastRows.push({ theme, fg: fgName, bg: bgName, ratio, need, ok: ratio >= need });
      }
    }
  }
  for (const [name, r] of resolved) {
    if (r.type !== "color") continue;
    const c = parseColor(r.value);
    if (c && !inGamut(c)) gamut.push(name);
  }
  if (gamut.length) warnings.push(`${gamut.length} colour(s) outside sRGB: give an sRGB fallback and the wider value inside @media (color-gamut: p3): ${gamut.slice(0, 6).join(", ")}`);
  if (!contrastRows.length) warnings.push("no contrast pair found: name semantic colours with text/fg/on… and bg/surface… (and border/focus) so they can be checked");
  const failing = contrastRows.filter((r) => !r.ok);
  return { tokens: tokens.size, errors, warnings, contrast: { pairs: contrastRows.length, failing: failing.length, rows: failing.concat(contrastRows.filter((r) => r.ok)).slice(0, 200) }, out_of_srgb: gamut };
}
