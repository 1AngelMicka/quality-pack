// Guess stacks, flags and profile from an existing project. Suggestions only: /sw:kickoff confirms them with the user.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { listFiles, DEFAULT_EXCLUDE } from "./scan.mjs";
import { gitRoot } from "./git.mjs";

// Signs that the UI is an application (it keeps state or takes files), not a showcase site.
const APP_DEPS = ["zustand", "redux", "@reduxjs/toolkit", "jotai", "valtio", "mobx", "pinia", "vuex", "xstate", "@tanstack/react-query",
  "swr", "dexie", "idb", "idb-keyval", "localforage", "vite-plugin-pwa", "workbox-*", "@tauri-apps/*", "electron", "@capacitor/*",
  "react-dropzone", "fabric", "konva", "react-konva", "pdf-lib", "jszip", "html2canvas", "html-to-image"];
const APP_CODE = [
  [/type\s*=\s*["'{]?\s*["']?file\b/, "file input"],
  [/\bshowOpenFilePicker\b|\bshowDirectoryPicker\b|\bwebkitdirectory\b/, "file or folder picker"],
  [/\bnew FileReader\b|\bcreateObjectURL\b/, "reads user files"],
  [/\bonDrop\b|addEventListener\(\s*["']drop["']/, "drag and drop"],
  [/\bindexedDB\b|\blocalStorage\.setItem\b/, "stores data in the browser"],
  [/\bnavigator\.serviceWorker\.register\b/, "service worker (installable app)"],
  [/\.getContext\(\s*["']2d["']|\.toBlob\(/, "draws or exports images"],
];
const CODE_EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".vue", ".svelte", ".astro", ".html"]);

function appSignals(cwd, deps, file) {
  const out = [];
  for (const n of APP_DEPS) if (has(deps, [n])) out.push(`dependency ${n}`);
  if (file("src-tauri")) out.push("desktop app (src-tauri)");
  const seen = new Set();
  const files = listFiles(cwd).filter((f) => CODE_EXT.has(extname(f).toLowerCase()) && !/(^|\/)(tests?|e2e|__tests__|scripts?)\//.test(f)).slice(0, 600);
  for (const f of files) {
    let text = "";
    try { if (statSync(join(cwd, f)).size > 400 * 1024) continue; text = readFileSync(join(cwd, f), "utf8"); } catch { continue; }
    for (const [re, label] of APP_CODE) if (!seen.has(label) && re.test(text)) { seen.add(label); out.push(`${label} (${f})`); }
    if (seen.size === APP_CODE.length) break;
  }
  return out;
}

// Source code of the product. Notes, reports and Shipwright's own files (.quality/) are not code: a project
// with only those is still a new project.
const SOURCE = /\.(m?[jt]sx?|cjs|vue|svelte|astro|html|css|scss|py|php|rb|go|rs|java|kt|swift|cs|dart|sql|prisma)$/i;
const NOT_PRODUCT = [...DEFAULT_EXCLUDE, ".quality", ".claude", ".github"];
export const sourceFiles = (cwd) => listFiles(cwd).filter((f) => SOURCE.test(f) && !NOT_PRODUCT.some((d) => f === d || f.startsWith(`${d}/`)));

// Where the Git repository of the project starts. A project folder inside someone's home repository (or with no
// repository at all) would get its .gitignore and commits in the wrong place: say so.
function gitInfo(cwd) {
  const root = gitRoot(cwd);
  const norm = (p) => { const n = resolve(p).replace(/\\/g, "/").replace(/\/$/, ""); return process.platform === "win32" ? n.toLowerCase() : n; };
  if (!root) return { git_root: null, warning: "No Git repository: run git init in the project folder before writing .gitignore or committing .quality/." };
  if (norm(root) !== norm(cwd)) return { git_root: root, warning: `The project is inside the Git repository of a parent folder (${root}), not its own: run git init in the project folder first, or confirm with the user that the parent repository is intended.` };
  return { git_root: root, warning: null };
}

const has = (deps, names) => names.some((n) => n.endsWith("*") ? Object.keys(deps).some((d) => d.startsWith(n.slice(0, -1))) : n in deps);

export function detect(cwd, stacks) {
  const pkgPath = join(cwd, "package.json");
  const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf8")) : null;
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const file = (f) => existsSync(join(cwd, f));
  const pm = file("pnpm-lock.yaml") ? "pnpm" : file("yarn.lock") ? "yarn" : (file("bun.lockb") || file("bun.lock")) ? "bun" : "npm";


  const matched = stacks.filter((s) => {
    const d = s.detect || {};
    return (d.files_any || []).some(file) || (d.package_json_deps_any || []).some((n) => n in deps);
  }).map((s) => s.stack);

  const flags = new Set();
  const why = {};
  const add = (f, reason) => { flags.add(f); (why[f] ||= []).push(reason); };
  if (has(deps, ["next", "react", "vue", "svelte", "astro", "@remix-run/*", "nuxt", "react-native", "expo"]) || file("index.html")) add("has_ui", "UI framework or index.html");
  if (has(deps, ["fastify", "express", "@nestjs/core", "hono", "koa", "socket.io"]) || file("app/api") || file("src/app/api") || file("pages/api")) add("has_backend", "server framework or API routes");
  if (has(deps, ["next-auth", "@auth/*", "lucia", "@clerk/*", "@supabase/supabase-js", "better-auth", "passport", "@fastify/jwt", "jsonwebtoken"])) add("has_auth", "auth library");
  if (has(deps, ["@prisma/client", "prisma", "drizzle-orm", "mongoose", "pg", "mysql2", "typeorm", "@supabase/supabase-js", "kysely"])) add("has_db", "database client");
  if (has(deps, ["multer", "@fastify/multipart", "uploadthing", "formidable", "busboy"])) add("has_uploads", "upload library");
  if (has(deps, ["stripe", "@stripe/stripe-js", "@lemonsqueezy/*", "@paddle/*"])) { add("has_payments", "payment SDK"); add("has_webhooks", "payment webhooks"); add("has_external_api", "payment API"); }
  if (has(deps, ["expo", "react-native", "@capacitor/*"]) || file("capacitor.config.ts") || file("capacitor.config.json") || file("pubspec.yaml")) add("native_app", "mobile framework (Expo, React Native, Capacitor or Flutter)");
  if (has(deps, ["stripe", "@lemonsqueezy/*", "@paddle/*", "@polar-sh/*"])) add("has_subscriptions", "payment SDK (confirm the product sells subscriptions)");
  if (has(deps, ["@clerk/*", "@workos-inc/*", "better-auth"]) && /organi[sz]ation|workspace|tenant/i.test(JSON.stringify(Object.keys(deps)))) add("multi_tenant", "organisation feature of the auth library (confirm)");
  if (file("src-tauri") || has(deps, ["electron", "@tauri-apps/api", "@tauri-apps/cli"])) add("desktop_app", "Tauri folder or Electron dependency");
  if (has(deps, ["nodemailer", "resend", "@sendgrid/mail", "postmark", "@react-email/*", "mailgun.js", "brevo", "@getbrevo/*"])) add("has_email", "email library");
  if (has(deps, ["openai", "@anthropic-ai/sdk", "@google/generative-ai", "ai", "replicate"])) { add("uses_paid_services", "AI SDK"); add("has_external_api", "AI API"); }
  if (has(deps, ["axios", "ky", "got", "undici"])) add("has_external_api", "HTTP client (check what it calls)");
  if (has(deps, ["next-intl", "i18next", "react-i18next", "react-intl", "@nuxtjs/i18n", "next-i18next"])) add("multilingual", "i18n library");
  if (["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml", "ecosystem.config.js", "ecosystem.config.cjs"].some(file)) add("self_hosted", "Docker Compose or PM2 file");
  if (flags.has("has_auth") || flags.has("has_email") || flags.has("has_payments")) add("has_user_data", "accounts, emails or payments imply personal data");
  if (has(deps, ["next", "astro", "nuxt", "@remix-run/*", "gatsby"])) add("public_web", "server-rendered web framework (confirm the site is public)");

  const signals = flags.has("has_ui") ? appSignals(cwd, deps, file) : [];
  const source = sourceFiles(cwd).length;
  const isNew = source === 0;
  let profile = "webapp";
  let profileWhy = "UI with a server, a database or accounts";
  let profileDefault = false;
  // Nothing found: the profile is a default to confirm with the user, not a conclusion.
  if (!flags.size && !matched.length) {
    profileDefault = true;
    profileWhy = isNew ? "default for an empty project: nothing detected yet, ask the user" : "default: no UI, server, database or accounts detected, ask the user";
  }
  if (has(deps, ["expo", "react-native", "@capacitor/*"])) { profile = "mobile"; profileWhy = "React Native, Expo or Capacitor"; }
  else if (flags.has("desktop_app")) { profile = "desktop"; profileWhy = "Tauri or Electron"; }
  else if (flags.has("has_payments")) { profile = "saas"; profileWhy = "payment SDK"; }
  else if (!flags.has("has_ui") && flags.has("has_backend")) { profile = "api"; profileWhy = "server without UI"; }
  else if (flags.has("has_ui") && !flags.has("has_backend") && !flags.has("has_db") && !flags.has("has_auth")) {
    if (signals.length) { profile = "webapp"; profileWhy = "no server, but the UI is an application: it keeps state or takes files (see app_signals)"; }
    else { profile = "vitrine"; profileWhy = "UI without server, database, accounts, state or file input"; }
  }

  const git = gitInfo(cwd);
  return { package_manager: pm, name: pkg?.name || null, stacks: matched, flags: [...flags].sort(), why, profile, profile_why: profileWhy,
    profile_default: profileDefault, app_signals: signals, scripts: pkg?.scripts || {}, source_files: source, is_new_project: isNew,
    git_root: git.git_root, warnings: git.warning ? [git.warning] : [] };
}
