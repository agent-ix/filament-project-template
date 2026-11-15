// Rewrites the FSL identifiers that the language rename changed, in every text file of a repository.
//   node tools/rename-ids.mjs [--check] [root]
// The rewrite is mechanical and repeatable: run it again and nothing changes. With --check the files are not
// written and the exit status is 1 when any file would change. Recorded results, models and the licence data
// are not rewritten by hand; run `make models record readme index` afterwards so that the driver writes them.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Each rule maps an old identifier family to its new spelling.
export const RULES = [
  // Wire ids of profiles and constructs: quire.value.complete/v1 becomes filament.value.complete/v1.
  { name: "wire ids", from: /\bquire\.(?=[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)*\/v\d+)/g, to: "filament." },
  { name: "result document format", from: /\bquire-outcome\/(\d+)/g, to: "filament-outcome/$1" },
  { name: "identities", from: /\bix:\/\/quire\//g, to: "ix://filament/" },
  { name: "URNs", from: /\burn:quire:/g, to: "urn:filament:" },
  { name: "schema ids", from: /\bagent-ix\.github\.io\/quire-/g, to: "agent-ix.github.io/filament-" },
];

// Folders and files the rewrite never reads: history, caches, and licence data that records the driver release.
const SKIP_DIRS = new Set([".git", "node_modules", "licenses"]);
// The rewrite and its test name the old identifiers on purpose.
const SELF = /^rename-ids(\.test)?\.mjs$/;

export function rewrite(text) {
  let out = text;
  const counts = {};
  for (const rule of RULES) {
    out = out.replace(rule.from, (...m) => {
      counts[rule.name] = (counts[rule.name] ?? 0) + 1;
      return rule.to.replace(/\$(\d)/g, (_, i) => m[Number(i)]);
    });
  }
  return { text: out, counts };
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || SELF.test(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (st.size < 32 * 1024 * 1024) yield p;
  }
}

export function rewriteTree(root, { write = true } = {}) {
  const changed = [];
  const totals = {};
  for (const file of walk(root)) {
    const buf = readFileSync(file);
    if (buf.includes(0)) continue; // binary
    const { text, counts } = rewrite(buf.toString("utf8"));
    if (text === buf.toString("utf8")) continue;
    changed.push(file);
    for (const [k, v] of Object.entries(counts)) totals[k] = (totals[k] ?? 0) + v;
    if (write) writeFileSync(file, text);
  }
  return { changed, totals };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const root = resolve(args.find((a) => !a.startsWith("--")) ?? ".");
  const { changed, totals } = rewriteTree(root, { write: !check });
  console.log(`${check ? "would change" : "changed"} ${changed.length} files`);
  for (const [k, v] of Object.entries(totals)) console.log(`  ${k}: ${v}`);
  if (check && changed.length) process.exit(1);
}
