// Stand-in for the claude command in the tests of sw.mjs install: it records what it is asked and answers like
// the real one. It fails when run with CLAUDECODE set, as the real command does inside a session.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
const log = process.env.FAKE_CLAUDE_LOG;
const args = process.argv.slice(2);
if (process.env.CLAUDECODE) { console.error("Error: Claude Code cannot be launched inside another Claude Code session."); process.exit(1); }
appendFileSync(log, args.join(" ") + "\n");
const before = existsSync(log) ? readFileSync(log, "utf8") : "";
const cmd = args.join(" ");
if (cmd === "--version") console.log("9.9.9 (Claude Code)");
else if (cmd === "plugin marketplace list") console.log(/marketplace add/.test(before) ? "Configured marketplaces:\n  ❯ shipwright" : "No marketplaces configured");
else if (cmd.startsWith("plugin marketplace add ") || cmd.startsWith("plugin marketplace update ")) console.log("✔ Successfully added marketplace: shipwright");
else if (cmd.startsWith("plugin install ")) {
  if (process.env.FAKE_CLAUDE_FAIL && cmd.includes(process.env.FAKE_CLAUDE_FAIL)) { console.error(`✘ Failed to install plugin "${args[2]}"`); process.exit(1); }
  console.log(`✔ Successfully installed plugin: ${args[2]}`);
} else { console.error("unknown " + cmd); process.exit(1); }
