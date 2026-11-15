#!/usr/bin/env node
// PreToolUse hook (Write, Edit, MultiEdit): blocks writing a recognisable secret into a file that is
// not an env file. Exit 2 = block, the message on stderr goes to Claude. Never sends anything anywhere.
// To allow a deliberate value (e.g. a documented public test key), add "sw-allow-secret" on the same line
// (the former marker "qp-allow-secret" is still accepted). `sw guard-test` plays known cases through this script.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const PATTERNS = [
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Stripe live secret key", /\b(sk|rk)_live_[0-9a-zA-Z]{16,}\b/],
  // A test key opens the Stripe test account and often ends up committed: it belongs in .env too.
  ["Stripe test secret key", /\b(sk|rk)_test_[0-9a-zA-Z]{16,}\b/],
  ["Stripe webhook secret", /\bwhsec_[0-9a-zA-Z]{24,}\b/],
  ["GitHub token", /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["OpenAI API key", /\bsk-(proj-)?[A-Za-z0-9_-]{32,}\b/],
  ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{32,}\b/],
  ["Private key", /-----BEGIN ([A-Z]+ )?PRIVATE KEY-----/],
  ["Database URL with password", /\b(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp):\/\/[^:\s/'"]+:[^@\s'"$]{6,}@(?!(localhost|127\.0\.0\.1|db|postgres|redis|mysql|mongo)([:/"'`\s]|$))/],
  ["Secret exposed to the browser", /\b(NEXT_PUBLIC|VITE|EXPO_PUBLIC|PUBLIC|REACT_APP)_[A-Z0-9_]*(SECRET|PRIVATE|PASSWORD|SERVICE_ROLE|SK_)[A-Z0-9_]*\b/],
  ["Hard-coded credential", /\b(password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\b\s*[:=]\s*["'`](?![^"'`]*(\$\{|process\.env|import\.meta\.env|your|example|changeme|xxx|<|placeholder|dummy|test|\*\*\*))[^"'`\s]{16,}["'`]/i],
];

const ENV_FILE = /^\.env(\.(local|development|production|staging|test)(\.local)?)?$/;
const SKIP_FILE = /\.(lock|lockb|png|jpe?g|gif|webp|avif|ico|pdf|zip)$|^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/;
const ALLOW = /\b(sw|qp)-allow-secret\b/;

let input;
try { input = JSON.parse(readFileSync(0, "utf8")); } catch (e) {
  // Never block on an input it cannot read, but never stay silent either: a silent pass reads as "no secret found".
  process.stderr.write(`shipwright secrets guard: the hook input is not valid JSON (${String(e.message).replace(/\s+/g, " ").slice(0, 120)}); this write was not checked.\n`);
  process.exit(0);
}
const ti = input?.tool_input || {};
const file = ti.file_path || ti.path || "";
const name = basename(file);
if (!file || ENV_FILE.test(name) || SKIP_FILE.test(name)) process.exit(0);

const chunks = [ti.content, ti.new_string, ...(Array.isArray(ti.edits) ? ti.edits.map((e) => e?.new_string) : [])]
  .filter((x) => typeof x === "string");
const hits = [];
for (const text of chunks) {
  text.split(/\r?\n/).forEach((line, i) => {
    if (ALLOW.test(line)) return;
    for (const [label, re] of PATTERNS) if (re.test(line)) hits.push(`${label} (line ${i + 1} of the new text)`);
  });
}
if (!hits.length) process.exit(0);
process.stderr.write(
  `shipwright blocked this write to ${name}: it looks like it contains a secret.\n- ${[...new Set(hits)].join("\n- ")}\n` +
  "Put the value in an environment variable read on the server (and in .env, which must stay out of Git), then reference it here. " +
  "If it is a deliberate non-secret value, add the comment sw-allow-secret on that line.\n");
process.exit(2);
