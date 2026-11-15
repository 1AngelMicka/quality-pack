// Style tiles shown side by side (`sw tiles [dir]`, default .quality/design/tiles). Each tile is an HTML page of
// the design-direction skill. Opened as a file, a tile loses its local fonts and shows as a frozen picture: here
// the project folder is served on a local port, every tile is captured on a desktop and a phone, a contact sheet
// is written (HTML and one PNG), and the fonts each tile declares but does not get are reported (document.fonts).
import { createServer } from "node:http";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { loadBrowserTools, launch } from "./browser.mjs";

const TYPES = { ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf" };

// A static server on 127.0.0.1 for one folder; nothing outside it is served.
export function serveFolder(root) {
  const top = resolve(root);
  const server = createServer((req, res) => {
    let path;
    try { path = decodeURIComponent(new URL(req.url, "http://localhost").pathname); } catch { res.statusCode = 400; return res.end(); }
    let file = resolve(top, `.${path}`);
    if (file !== top && !file.startsWith(top + sep)) { res.statusCode = 403; return res.end(); }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) { res.statusCode = 404; res.setHeader("content-type", "text/plain"); return res.end("not found"); }
    res.setHeader("content-type", TYPES[extname(file).toLowerCase()] || "application/octet-stream");
    res.setHeader("cache-control", "no-store");
    res.end(readFileSync(file));
  });
  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => ok({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

// In the tile: the faces declared with @font-face (and their load status once each was asked for), and the
// families the text asks for that no face declares (they show only on a machine where they are installed).
async function fontReport() {
  await document.fonts.ready;
  const faces = [...document.fonts];
  await Promise.all(faces.filter((f) => f.status === "unloaded").map((f) => f.load().catch(() => null)));
  const clean = (s) => s.replace(/["']/g, "").trim();
  const declared = faces.map((f) => ({ family: clean(f.family), weight: f.weight, style: f.style, status: f.status }));
  const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong|-apple-system|blinkmacsystemfont|inherit|initial)$/i;
  const used = new Set();
  for (const e of document.querySelectorAll("body *")) {
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    used.add(clean(getComputedStyle(e).fontFamily.split(",")[0]));
  }
  const names = new Set(declared.map((f) => f.family.toLowerCase()));
  return {
    title: document.title,
    declared: declared.length,
    loaded: declared.filter((f) => f.status === "loaded").length,
    failed: [...new Set(declared.filter((f) => f.status === "error").map((f) => `${f.family} ${f.weight} ${f.style}`))],
    used: [...used],
    used_not_loaded: [...used].filter((u) => names.has(u.toLowerCase()) && !declared.some((f) => f.family.toLowerCase() === u.toLowerCase() && f.status === "loaded")),
    not_declared: [...used].filter((u) => !GENERIC.test(u) && !names.has(u.toLowerCase())),
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function sheetHtml(tiles) {
  const cards = tiles.map((t) => `<section>
  <h2>${esc(t.file)}${t.title ? ` <small>${esc(t.title)}</small>` : ""}</h2>
  ${t.problems.length ? `<ul class="warn">${t.problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : `<p class="ok">Fonts: ${t.fonts.loaded} of ${t.fonts.declared} declared faces loaded</p>`}
  <div class="shots"><img src="${esc(basename(t.screenshots.desktop))}" alt="${esc(t.file)}, desktop"><img class="phone" src="${esc(basename(t.screenshots.phone))}" alt="${esc(t.file)}, phone"></div>
</section>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Style tiles</title>
<style>
  body { margin: 0; padding: 24px; background: #e9e7e3; color: #1d1c1a; font: 15px/1.5 system-ui, sans-serif; }
  main { display: grid; grid-template-columns: repeat(${Math.max(1, tiles.length)}, minmax(0, 1fr)); gap: 24px; align-items: start; }
  h2 { font-size: 16px; margin: 0 0 8px; } small { font-weight: 400; color: #5c5953; }
  .shots { display: grid; grid-template-columns: 1fr 28%; gap: 12px; align-items: start; }
  img { width: 100%; height: auto; display: block; background: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / 0.12), 0 4px 12px rgb(0 0 0 / 0.08); }
  .warn { color: #8a1c0b; margin: 0 0 8px; padding-left: 18px; } .ok { color: #2f5d2a; margin: 0 0 8px; }
</style></head>
<body><main>
${cards}
</main></body></html>
`;
}

export async function showTiles(dir, { cwd, root = cwd } = {}) {
  const folder = resolve(dir);
  if (!existsSync(folder) || !statSync(folder).isDirectory()) return { available: true, errors: [`no folder ${relative(cwd, folder) || folder}: write the style tiles there first (design-direction skill, step 4)`] };
  const files = readdirSync(folder).filter((f) => /\.html?$/i.test(f)).sort();
  if (!files.length) return { available: true, errors: [`no .html tile in ${relative(cwd, folder) || folder}`] };
  const tools = await loadBrowserTools(cwd);
  if (!tools) return { available: false, hint: "Playwright is not available. Run `node <sw.mjs> browser-setup` once (pack cache, not the project)." };
  // The project folder is served when the tiles are inside it, so that ../tokens.css or /fonts/ resolve as in the app.
  const top = resolve(root);
  const served = folder === top || folder.startsWith(top + sep) ? top : folder;
  const outDir = join(folder, "_sheet");
  mkdirSync(outDir, { recursive: true });
  const { server, base } = await serveFolder(served);
  const urlOf = (abs) => `${base}/${relative(served, abs).split(sep).map(encodeURIComponent).join("/")}`;
  const browser = await launch(tools.chromium);
  const tiles = [];
  try {
    for (const file of files) {
      const name = file.replace(/\.html?$/i, "").replace(/[^a-z0-9-]+/gi, "-");
      const tile = { file, url: urlOf(join(folder, file)), screenshots: {}, problems: [] };
      for (const [k, vp] of [["desktop", { viewport: { width: 1280, height: 800 } }], ["phone", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
        const ctx = await browser.newContext(vp);
        const page = await ctx.newPage();
        const failed = [];
        const note = (u, status) => { const name = u.startsWith(base) ? u.slice(base.length) : u; if (failed.length < 10 && !failed.some((f) => f.split(" (")[0] === name)) failed.push(status ? `${name} (${status})` : name); };
        page.on("requestfailed", (r) => note(r.url()));
        page.on("response", (r) => { if (r.status() >= 400) note(r.url(), r.status()); });
        await page.goto(tile.url, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => { if (!/Timeout/i.test(e.message)) tile.problems.push(`does not open: ${String(e.message).split("\n")[0].slice(0, 160)}`); });
        if (k === "desktop") {
          tile.fonts = await page.evaluate(fontReport).catch((e) => ({ error: String(e.message).slice(0, 160) }));
          tile.title = tile.fonts.title || "";
          delete tile.fonts.title;
          if (failed.length) tile.problems.push(`files that did not load: ${failed.slice(0, 4).join(", ")}`);
        }
        const shot = join(outDir, `${name}-${k}.png`);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
        tile.screenshots[k] = relative(cwd, shot).split(sep).join("/");
        await ctx.close();
      }
      const f = tile.fonts || {};
      for (const x of f.failed || []) tile.problems.push(`font declared but not loaded: ${x}`);
      for (const x of f.used_not_loaded || []) if (!(f.failed || []).some((y) => y.startsWith(x))) tile.problems.push(`font declared but not loaded: ${x}`);
      for (const x of f.not_declared || []) tile.problems.push(`font "${x}" is asked for but never declared (@font-face or a font stylesheet): it shows only where it is installed`);
      tiles.push(tile);
    }
    // The contact sheet, as HTML and as one image.
    writeFileSync(join(outDir, "index.html"), sheetHtml(tiles));
    const ctx = await browser.newContext({ viewport: { width: Math.min(2560, Math.max(1280, 700 * tiles.length)), height: 900 } });
    const page = await ctx.newPage();
    await page.goto(urlOf(join(outDir, "index.html")), { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    await page.screenshot({ path: join(outDir, "sheet.png"), fullPage: true }).catch(() => {});
    await ctx.close();
  } finally {
    await browser.close();
    server.close();
  }
  const rel = (p) => relative(cwd, p).split(sep).join("/");
  const result = { available: true, folder: rel(folder), served_from: rel(served) || ".", sheet: { html: rel(join(outDir, "index.html")), image: rel(join(outDir, "sheet.png")) },
    tiles: tiles.map(({ url, ...t }) => t), problems: tiles.reduce((n, t) => n + t.problems.length, 0),
    note: "Show the sheet to the user side by side (open the HTML or the PNG). A font problem means the tile does not show the type it describes: fix it before the user chooses." };
  writeFileSync(join(outDir, "tiles.json"), JSON.stringify(result, null, 2));
  return result;
}
