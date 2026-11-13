// Audit of the screen shown on a running Android device or emulator, with adb alone (no change to the app,
// no extra tool): the view hierarchy gives every element's bounds, label and whether it can be tapped.
// From it: touch targets under the platform size, controls a screen reader cannot name, small targets packed
// too close. Then the same screen at 200 % text size and in dark theme, as screenshots to read.
// iOS has no equivalent reachable from Windows or Linux.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

export const ANDROID_TARGET_DP = 48, ANDROID_TINY_DP = 24, ANDROID_GAP_DP = 8;

export function findAdb() {
  const exe = process.platform === "win32" ? "adb.exe" : "adb";
  for (const home of [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT].filter(Boolean)) { const p = join(home, "platform-tools", exe); if (existsSync(p)) return p; }
  return spawnSync(exe, ["version"], { encoding: "utf8" }).status === 0 ? exe : null;
}

const attr = (s, n) => new RegExp(`\\b${n}="([^"]*)"`).exec(s)?.[1] ?? "";
const unxml = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#10;/g, " ").replace(/&amp;/g, "&");

// The XML written by `uiautomator dump` as a flat list of nodes, each knowing its parent, so that a control
// can find the texts inside it.
export function parseHierarchy(xml) {
  const nodes = [];
  const stack = [];
  const re = /<node\b([^>]*?)(\/?)>|<\/node>/g;
  for (let m; (m = re.exec(xml));) {
    if (m[0] === "</node>") { stack.pop(); continue; }
    const a = m[1];
    const b = /\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/.exec(attr(a, "bounds"));
    const node = { index: nodes.length, parent: stack.at(-1) ?? null, cls: attr(a, "class").split(".").pop(), id: attr(a, "resource-id").split("/").pop(), text: unxml(attr(a, "text")), desc: unxml(attr(a, "content-desc")),
      clickable: attr(a, "clickable") === "true", enabled: attr(a, "enabled") !== "false", pkg: attr(a, "package"),
      x: b ? +b[1] : 0, y: b ? +b[2] : 0, w: b ? b[3] - b[1] : 0, h: b ? b[4] - b[2] : 0 };
    nodes.push(node);
    if (!m[2]) stack.push(node.index);
  }
  return nodes;
}

export function auditHierarchy(nodes, { density = 160 } = {}) {
  const dp = (px) => Math.round((px * 160) / density);
  const within = (c, n) => { for (let p = c.parent; p != null; p = nodes[p].parent) if (p === n.index) return true; return false; };
  const label = (n) => n.text || n.desc || nodes.filter((c) => within(c, n)).map((c) => c.text || c.desc).filter(Boolean).join(" ");
  const name = (n) => `${n.cls}${n.id ? `#${n.id}` : ""}${label(n) ? ` "${label(n).slice(0, 40)}"` : ""} ${dp(n.w)}×${dp(n.h)} dp`;
  // A row cut by the edge of the list it scrolls in is not a small target: the rest of it is one swipe away.
  const cut = (n) => { for (let p = n.parent; p != null; p = nodes[p].parent) { const s = nodes[p];
    if (/RecyclerView|ScrollView|ListView|ViewPager|LazyColumn|LazyRow/.test(s.cls)) return n.y <= s.y || n.y + n.h >= s.y + s.h || n.x <= s.x - 1 && n.w < s.w || n.x + n.w > s.x + s.w; } return false; };
  const taps = nodes.filter((n) => n.clickable && n.enabled && n.w > 0 && n.h > 0 && !(cut(n) && Math.min(dp(n.w), dp(n.h)) < ANDROID_TARGET_DP));
  const smallSide = (n) => Math.min(dp(n.w), dp(n.h));
  const small = taps.filter((n) => smallSide(n) < ANDROID_TARGET_DP);
  const tiny = small.filter((n) => smallSide(n) < ANDROID_TINY_DP);
  const unnamed = taps.filter((n) => !label(n).trim());
  const close = [];
  for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++) {
    const a = taps[i], b = taps[j];
    if (within(a, b) || within(b, a)) continue;
    if (smallSide(a) >= ANDROID_TARGET_DP && smallSide(b) >= ANDROID_TARGET_DP) continue;
    const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)), dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
    // Neighbours share a row or a column; the gap is the distance on the other axis.
    const gap = dx === 0 && dy === 0 ? 0 : dx === 0 ? dy : dy === 0 ? dx : null;
    if (gap != null && dp(gap) < ANDROID_GAP_DP) close.push(`${name(a)} and ${name(b)}: ${dp(gap)} dp apart`);
  }
  const mid = small.filter((n) => !tiny.includes(n));
  const checks = {
    tiny_targets: { level: "must", ok: tiny.length === 0, value: `${tiny.length} target(s) under ${ANDROID_TINY_DP} dp`, rule: `no touch target under ${ANDROID_TINY_DP} × ${ANDROID_TINY_DP} dp (WCAG 2.2, 2.5.8)`, samples: tiny.slice(0, 8).map(name) },
    touch_targets: { level: "should", ok: mid.length === 0, value: `${mid.length} of ${taps.length} target(s) between ${ANDROID_TINY_DP} and ${ANDROID_TARGET_DP} dp`, rule: `touch targets are at least ${ANDROID_TARGET_DP} × ${ANDROID_TARGET_DP} dp (Android accessibility guidance)`, samples: mid.slice(0, 8).map(name) },
    unnamed_controls: { level: "must", ok: unnamed.length === 0, value: `${unnamed.length} control(s) with no text or description`, rule: "every control has a name a screen reader can say (text, or a content description)", samples: unnamed.slice(0, 8).map(name) },
    crowded_targets: { level: "should", ok: close.length === 0, value: `${close.length} pair(s) of small targets under ${ANDROID_GAP_DP} dp apart`, rule: `small targets are at least ${ANDROID_GAP_DP} dp apart`, samples: close.slice(0, 6) },
  };
  for (const c of Object.values(checks)) if (!c.samples.length) delete c.samples;
  return { targets: taps.length, texts: nodes.filter((n) => n.text).length, checks };
}

export function mobileAudit({ outDir, root, passes = ["large_text", "dark"] } = {}) {
  const adb = findAdb();
  if (!adb) return { available: false, hint: "adb was not found: install the Android platform tools, or set ANDROID_HOME to the SDK folder." };
  const sh = (args, binary = false) => spawnSync(adb, args, { encoding: binary ? "buffer" : "utf8", timeout: 60000, maxBuffer: 64 * 1024 * 1024 });
  const wait = (ms) => spawnSync(process.execPath, ["-e", `setTimeout(() => {}, ${ms})`]);
  const devices = (sh(["devices"]).stdout || "").split(/\r?\n/).slice(1).filter((l) => /\tdevice$/.test(l)).map((l) => l.split("\t")[0]);
  if (!devices.length) return { available: true, errors: ["no Android device or emulator is running: start one (emulator -avd <name>) with the app on screen, then run this again"] };
  const density = Number(/(?:Override|Physical) density:\s*(\d+)/.exec(sh(["shell", "wm", "density"]).stdout || "")?.[1]) || 160;
  const size = /(\d+)x(\d+)/.exec(sh(["shell", "wm", "size"]).stdout || "");
  const dump = () => { const x = sh(["exec-out", "uiautomator", "dump", "/dev/tty"]).stdout || ""; const end = x.lastIndexOf("</hierarchy>"); return end < 0 ? "" : x.slice(0, end + 12); };
  const dir = join(outDir, "mobile");
  mkdirSync(dir, { recursive: true });
  const shot = (n) => { const r = sh(["exec-out", "screencap", "-p"], true); if (r.status !== 0 || !r.stdout?.length) return undefined; const f = join(dir, `audit-${n}.png`); writeFileSync(f, r.stdout); return relative(root, f).split("\\").join("/"); };
  const xml = dump();
  if (!xml) return { available: true, errors: ["the device did not return its view hierarchy (is the screen on and unlocked?)"] };
  const nodes = parseHierarchy(xml);
  const result = { available: true, device: devices[0], density_dpi: density, screen_px: size ? `${size[1]}×${size[2]}` : null, app: nodes.find((n) => n.pkg)?.pkg || null,
    screenshot: shot("normal"), ...auditHierarchy(nodes, { density }), screenshots: {} };
  // The same screen with the largest text size, then in dark theme; both settings are put back afterwards.
  if (passes.includes("large_text")) {
    const before = (sh(["shell", "settings", "get", "system", "font_scale"]).stdout || "").trim();
    sh(["shell", "settings", "put", "system", "font_scale", "2.0"]);
    wait(2000);
    result.screenshots.large_text = shot("text-200");
    const big = parseHierarchy(dump());
    result.large_text = { texts_before: result.texts, texts_after: big.filter((n) => n.text).length, note: "Read the screenshot: text must not be cut or overlap." };
    sh(["shell", "settings", "put", "system", "font_scale", /^[\d.]+$/.test(before) ? before : "1.0"]);
    wait(800);
  }
  if (passes.includes("dark")) {
    const was = /yes/.test(sh(["shell", "cmd", "uimode", "night"]).stdout || "");
    sh(["shell", "cmd", "uimode", "night", "yes"]);
    wait(2000);
    result.screenshots.dark = shot("dark");
    sh(["shell", "cmd", "uimode", "night", was ? "yes" : "no"]);
  }
  const must = Object.entries(result.checks).filter(([, c]) => c.level === "must" && !c.ok).map(([k]) => k);
  const should = Object.entries(result.checks).filter(([, c]) => c.level === "should" && !c.ok).map(([k]) => k);
  result.summary = { checks: Object.keys(result.checks).length, must_failed: must, should_failed: should };
  result.note = "One screen, as shown on the device. Open each screen of the key tasks and run it again. Android only; contrast, reading order and gestures are not measured.";
  return result;
}
