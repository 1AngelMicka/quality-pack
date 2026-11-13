// Compare several versions of the same screen instead of producing one. A single attempt lands on the average;
// three attempts that really differ, measured and then compared two by two by jurors who do not know which is
// which, land higher. This file does the mechanical part:
//   shoot   screenshots of each variant on desktop and phone under shuffled letters (A, B, C…), the measures
//           of each (finish, generic look, visual profile), and the list of pairs to judge
//   tally   reads the jurors' votes (.quality/variants/<name>/votes/*.json) and ranks the variants
// The jurors are agents (sw:juror) or people; the user chooses between the finalists.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { profileAt } from "./profile.mjs";

const LETTERS = ["A", "B", "C", "D", "E"];
const posix = (p) => p.split("\\").join("/");

export function variantsDir(root, name) { return join(root, ".quality", "variants", name); }

export async function shootVariants(name, urls, { root, cwd = root, mode = "operate", seed = Math.random } = {}) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name || "")) return { errors: ["name must be lower-case letters, digits and dashes (for example: pricing-page)"] };
  if (urls.length < 2 || urls.length > LETTERS.length) return { errors: [`give 2 to ${LETTERS.length} variants (addresses or HTML files)`] };
  const dir = variantsDir(root, name);
  mkdirSync(join(dir, "votes"), { recursive: true });
  // Shuffle which variant gets which letter, so that the order of creation says nothing.
  const order = urls.map((u, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(seed() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const letterOf = Object.fromEntries(order.map((src, k) => [src, LETTERS[k]]));
  const prof = await profileAt(urls, { cwd, shots: (n, device) => join(dir, `${letterOf[n]}-${device}.png`) });
  if (!prof.available) return prof;
  const { craftAt } = await import("./craft.mjs");
  const { lookAt } = await import("./look.mjs");
  const craft = await craftAt(urls, { cwd, mode });
  // Same hollow-wording list as `sw look`, so that a variant's copy counts in its generic-look measure.
  const { loadReferential } = await import("./ref.mjs");
  const words = loadReferential().slop_words || {};
  const look = await lookAt(urls, { cwd, mode, slopWords: [...(words.fr || []), ...(words.en || [])] });
  const variants = urls.map((url, i) => {
    const c = craft.pages?.[i], l = look.pages?.[i], p = prof.pages[i];
    return { letter: letterOf[i], error: p.error || c?.error || l?.error,
      screenshots: { desktop: posix(relative(root, join(dir, `${letterOf[i]}-desktop.png`))), mobile: posix(relative(root, join(dir, `${letterOf[i]}-mobile.png`))) },
      measures: { finish_must_failed: c?.summary?.must_failed ?? null, finish_should_failed: c?.summary?.should_failed?.length ?? null,
        generic_look: l ? { tier: l.tier, points: l.points, signals: (l.counted || []) } : null,
        first_screen: p.desktop?.first_screen ?? null, typefaces: p.desktop?.type?.families ?? null, text_sizes: p.desktop?.type?.sizes ?? null } };
  }).sort((a, b) => a.letter.localeCompare(b.letter));
  const letters = variants.map((v) => v.letter);
  const pairs = [];
  for (let i = 0; i < letters.length; i++) for (let j = i + 1; j < letters.length; j++) pairs.push(seed() < 0.5 ? [letters[i], letters[j]] : [letters[j], letters[i]]);
  // The key (which letter is which address) stays in a file the jurors are not given.
  writeFileSync(join(dir, "key.json"), JSON.stringify({ name, created: new Date().toISOString(), mode, key: Object.fromEntries(urls.map((u, i) => [letterOf[i], u])) }, null, 2));
  const result = { name, dir: posix(relative(root, dir)), variants, pairs,
    votes_dir: posix(relative(root, join(dir, "votes"))),
    next: "Give each pair to three jurors (agent sw:juror) with only the two screenshots, the brief and the device; each writes one vote file. Then run the same command with --tally.",
    vote_format: { juror: "j1", device: "desktop", pair: ["A", "B"], winner: "A", margin: "clear | slight", reasons: ["what makes the winner better, on the screen"], loser_keeps: ["what the loser does better"] } };
  writeFileSync(join(dir, "variants.json"), JSON.stringify(result, null, 2));
  return result;
}

export function tallyVariants(name, { root } = {}) {
  const dir = variantsDir(root, name);
  if (!existsSync(join(dir, "variants.json"))) return { errors: [`no variants named ${name}: run \`sw variants ${name} <url> <url>…\` first`] };
  const meta = JSON.parse(readFileSync(join(dir, "variants.json"), "utf8"));
  const key = JSON.parse(readFileSync(join(dir, "key.json"), "utf8")).key;
  const letters = meta.variants.map((v) => v.letter);
  const votes = [], bad = [];
  const vdir = join(dir, "votes");
  for (const f of existsSync(vdir) ? readdirSync(vdir).filter((x) => x.endsWith(".json")) : []) {
    try {
      const raw = JSON.parse(readFileSync(join(vdir, f), "utf8"));
      for (const v of Array.isArray(raw) ? raw : [raw]) {
        if (!Array.isArray(v.pair) || v.pair.length !== 2 || !v.pair.every((x) => letters.includes(x)) || !v.pair.includes(v.winner)) { bad.push(`${f}: pair and winner must be letters among ${letters.join(", ")}`); continue; }
        votes.push({ ...v, file: f });
      }
    } catch (e) { bad.push(`${f}: ${e.message}`); }
  }
  if (!votes.length) return { errors: ["no vote yet in " + posix(relative(root, vdir)), ...bad] };
  // Each pair is decided by the majority of its jurors; a variant's rank is the number of pairs it wins.
  const pairKey = (p) => [...p].sort().join("");
  const byPair = new Map();
  for (const v of votes) { const k = pairKey(v.pair); (byPair.get(k) || byPair.set(k, []).get(k)).push(v); }
  const score = Object.fromEntries(letters.map((l) => [l, { pairs_won: 0, pairs_tied: 0, votes: 0, clear_votes: 0 }]));
  const duels = [];
  for (const [k, vs] of byPair) {
    const [x, y] = k.split("");
    const wx = vs.filter((v) => v.winner === x).length, wy = vs.length - wx;
    for (const v of vs) { score[v.winner].votes++; if (v.margin === "clear") score[v.winner].clear_votes++; }
    if (wx === wy) { score[x].pairs_tied++; score[y].pairs_tied++; } else score[wx > wy ? x : y].pairs_won++;
    duels.push({ pair: [x, y], votes: { [x]: wx, [y]: wy }, winner: wx === wy ? null : wx > wy ? x : y, jurors: vs.length, split: Math.min(wx, wy) > 0,
      reasons: [...new Set(vs.filter((v) => v.winner === (wx >= wy ? x : y)).flatMap((v) => v.reasons || []))].slice(0, 5) });
  }
  const ranking = letters.map((l) => ({ letter: l, ...score[l], address: key[l],
    measures: meta.variants.find((v) => v.letter === l)?.measures, keeps: [...new Set(votes.filter((v) => v.pair.includes(l) && v.winner !== l).flatMap((v) => v.loser_keeps || []))].slice(0, 4) }))
    .sort((a, b) => b.pairs_won - a.pairs_won || b.votes - a.votes || b.clear_votes - a.clear_votes);
  const expected = (letters.length * (letters.length - 1)) / 2;
  const thin = duels.filter((d) => d.jurors < 3).map((d) => d.pair.join(" vs "));
  const top = ranking[0], second = ranking[1];
  const close = second && top.pairs_won === second.pairs_won;
  const result = { name, votes: votes.length, pairs_judged: duels.length, pairs_expected: expected, ranking, duels, invalid_votes: bad,
    warnings: [duels.length < expected ? `${expected - duels.length} pair(s) not judged yet` : null, thin.length ? `fewer than 3 jurors on: ${thin.join(", ")}` : null,
      top.measures?.finish_must_failed?.length ? `the leader (${top.letter}) has finish defects to fix: ${top.measures.finish_must_failed.join(", ")}` : null].filter(Boolean),
    verdict: close ? `${top.letter} and ${second.letter} are tied on pairs won: show both to the user.` : `${top.letter} leads. Show ${top.letter} and ${second?.letter ?? "—"} to the user, with what ${second?.letter ?? "the other"} does better.`,
    reading: "The jury ranks; the user chooses. Carry into the chosen variant what the others were said to do better (keeps)." };
  writeFileSync(join(dir, "tally.json"), JSON.stringify(result, null, 2));
  return result;
}
