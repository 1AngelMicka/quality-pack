// Maintainer tool: for each site of the reference bank, take one screenshot of the first screen and read a few
// facts from the rendered page (typefaces by name, sizes, colours). Used to write and review the `why` of each
// site from what is really on screen. The output goes to research_notes/reference-bank/shots/, which is not
// tracked by git: screenshots of other people's sites are never committed or redistributed.
//   node tools/bank-shots.mjs [type...]
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBank } from "../plugins/core/scripts/lib/bank.mjs";
import { loadBrowserTools, launch } from "../plugins/core/scripts/lib/browser.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "research_notes", "reference-bank", "shots");

function facts() {
  const shown = (e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && r.width > 1 && r.height > 1; };
  const hex = (c) => { const m = (c || "").match(/[\d.]+/g); if (!m || (m[3] !== undefined && Number(m[3]) < 0.5)) return null; return "#" + m.slice(0, 3).map((x) => Math.round(Number(x)).toString(16).padStart(2, "0")).join(""); };
  const own = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
  const all = [...document.querySelectorAll("body *")].filter(shown);
  const fam = new Map(), colours = new Map();
  let chars = 0;
  for (const e of all) { const t = own(e); if (t.length < 2) continue; const s = getComputedStyle(e); chars += t.length;
    const f = s.fontFamily.split(",")[0].trim().replace(/["']/g, ""); fam.set(f, (fam.get(f) || 0) + t.length);
    const c = hex(s.color); if (c) colours.set(c, (colours.get(c) || 0) + t.length); }
  const bg = (e) => { for (let n = e; n; n = n.parentElement) { const c = hex(getComputedStyle(n).backgroundColor); if (c) return c; } return "#ffffff"; };
  const h1 = document.querySelector("h1");
  const buttons = all.filter((e) => e.matches("button, [role=button], a[class*=btn], a[class*=button], a[class*=cta]")).map((e) => hex(getComputedStyle(e).backgroundColor)).filter(Boolean);
  const count = (a) => Object.entries(a.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {})).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k]) => k);
  const firstText = all.filter((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && own(e).length > 2; }).map(own).join(" · ").replace(/\s+/g, " ").slice(0, 400);
  return { title: document.title.slice(0, 100), lang: document.documentElement.lang || null,
    typefaces: [...fam.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, c]) => `${n} (${Math.round((c / chars) * 100)} %)`),
    h1: h1 && shown(h1) ? { text: h1.innerText.trim().slice(0, 120), size_px: Math.round(parseFloat(getComputedStyle(h1).fontSize)), typeface: getComputedStyle(h1).fontFamily.split(",")[0].replace(/["']/g, "").trim(), weight: getComputedStyle(h1).fontWeight } : null,
    body_size_px: Math.round(parseFloat(getComputedStyle(document.body).fontSize)), page_background: bg(document.body), text_colours: [...colours.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c),
    button_colours: count(buttons), images_on_first_screen: [...document.querySelectorAll("img, video, picture, canvas")].filter((e) => { const r = e.getBoundingClientRect(); return shown(e) && r.top < innerHeight && r.width > 100; }).length,
    first_screen_text: firstText, page_screens: Math.round((document.documentElement.scrollHeight / innerHeight) * 10) / 10 };
}

const only = process.argv.slice(2);
const bank = loadBank();
const tools = await loadBrowserTools(ROOT);
if (!tools) { console.error("Playwright is not available: run qp.mjs browser-setup"); process.exit(1); }
const browser = await launch(tools.chromium);
let done = 0, failed = 0;
for (const [id, t] of Object.entries(bank.types)) {
  if (only.length && !only.includes(id)) continue;
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "facts.json");
  const out = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  for (const [i, s] of t.sites.entries()) {
    if (out[s.url]?.screenshot && existsSync(join(ROOT, out[s.url].screenshot))) continue; // already captured
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "en-US" });
    const page = await ctx.newPage();
    const entry = { name: s.name };
    try {
      const resp = await page.goto(s.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1500);
      entry.status = resp?.status() ?? null;
      Object.assign(entry, await page.evaluate(facts));
      const shot = join(dir, `${String(i + 1).padStart(2, "0")}.jpg`);
      await page.screenshot({ path: shot, type: "jpeg", quality: 55 });
      entry.screenshot = `research_notes/reference-bank/shots/${id}/${String(i + 1).padStart(2, "0")}.jpg`;
      done++;
    } catch (e) { entry.error = String(e.message).split("\n")[0].slice(0, 160); failed++; }
    out[s.url] = entry;
    await ctx.close();
    writeFileSync(file, JSON.stringify(out, null, 1));
  }
  console.log(id, Object.values(out).filter((x) => x.screenshot).length, "of", t.sites.length);
}
await browser.close();
console.log(`captured ${done}, failed ${failed}`);
