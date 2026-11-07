// Guess stacks, flags and profile from an existing project. Suggestions only: /qp:kickoff confirms them with the user.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
  if (has(deps, ["nodemailer", "resend", "@sendgrid/mail", "postmark", "@react-email/*", "mailgun.js", "brevo", "@getbrevo/*"])) add("has_email", "email library");
  if (has(deps, ["openai", "@anthropic-ai/sdk", "@google/generative-ai", "ai", "replicate"])) { add("uses_paid_services", "AI SDK"); add("has_external_api", "AI API"); }
  if (has(deps, ["axios", "ky", "got", "undici"])) add("has_external_api", "HTTP client (check what it calls)");
  if (has(deps, ["next-intl", "i18next", "react-i18next", "react-intl", "@nuxtjs/i18n", "next-i18next"])) add("multilingual", "i18n library");
  if (["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml", "ecosystem.config.js", "ecosystem.config.cjs"].some(file)) add("self_hosted", "Docker Compose or PM2 file");
  if (flags.has("has_auth") || flags.has("has_email") || flags.has("has_payments")) add("has_user_data", "accounts, emails or payments imply personal data");
  if (has(deps, ["next", "astro", "nuxt", "@remix-run/*", "gatsby"])) add("public_web", "server-rendered web framework (confirm the site is public)");

  let profile = "webapp";
  if (has(deps, ["expo", "react-native"])) profile = "mobile";
  else if (flags.has("has_payments")) profile = "saas";
  else if (!flags.has("has_ui") && flags.has("has_backend")) profile = "api";
  else if (flags.has("has_ui") && !flags.has("has_backend") && !flags.has("has_db") && !flags.has("has_auth")) profile = "vitrine";

  return { package_manager: pm, name: pkg?.name || null, stacks: matched, flags: [...flags].sort(), why, profile,
    scripts: pkg?.scripts || {}, is_new_project: !pkg && !file(".git") };
}
