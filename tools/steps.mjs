// Steps runner. Node, no dependencies.
//
//   node tools/steps.mjs extract <steps.md> [--skip id,id]
//   node tools/steps.mjs run <steps.md> (--image <image> | --host) [options]
//
// Options of `run`:
//   --shell bash|zsh     the shell the steps run in (default bash)
//   --skip id,id         leave these steps out
//   --copy <dir>         run in a fresh copy of <dir> (mounted read-only in a
//                        container and copied to /work; copied to a temp folder
//                        on the host)
//   --expected <dir>     compare the output of each step with <dir>/<id>.txt
//                        when that file exists
//   --record             write <dir>/<id>.txt for every step that prints
//                        something, instead of comparing (needs --expected)
//
// A steps file is Markdown. Every fenced block whose info string is
// `<language> step=<id>` is a step. Extra words after the id are attributes:
// `expect-exit=N` marks a step that must exit with N (default 0). `extract`
// prints the steps as one shell script. `run` streams that script into one shell
// session in a container or, with --host, on this machine, the way a reader types
// the commands into one terminal. It reports the duration of each step. The first
// failing step stops the run and is named.
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MARK = "@@STEP";
const EXIT = "@@EXIT";

export function extractSteps(markdown) {
  const steps = [];
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const open = /^```(\w+) step=([a-z0-9-]+)((?: [a-z-]+=\S+)*)\s*$/.exec(lines[i]);
    if (!open) continue;
    const attrs = Object.fromEntries(open[3].trim().split(" ").filter(Boolean).map((a) => a.split("=")));
    const expectExit = "expect-exit" in attrs ? Number(attrs["expect-exit"]) : 0;
    if (!Number.isInteger(expectExit)) throw new Error(`step ${open[2]}: expect-exit must be an integer`);
    const body = [];
    let closed = false;
    for (i++; i < lines.length; i++) {
      if (lines[i].startsWith("```")) {
        closed = true;
        break;
      }
      body.push(lines[i]);
    }
    if (!closed) throw new Error(`step ${open[2]}: fenced block is not closed`);
    if (steps.some((s) => s.id === open[2])) throw new Error(`duplicate step id ${open[2]}`);
    steps.push({ id: open[2], language: open[1], body: body.join("\n"), expectExit });
  }
  return steps;
}

export function selectSteps(steps, skip = []) {
  for (const id of skip) {
    if (!steps.some((s) => s.id === id)) throw new Error(`--skip names unknown step ${id}`);
  }
  return steps.filter((s) => !skip.includes(s.id));
}

// One script, with a marker line before each step. Standard error goes to
// standard output so a step's output keeps its order. The shell stops at the
// first failing step (set -e). A step with expect-exit other than 0 runs with
// set +e, and the script prints its exit status for the runner to check.
export function buildScript(steps) {
  const parts = ["set -eu -o pipefail", "exec 2>&1"];
  for (const s of steps) {
    if (s.language !== "bash") throw new Error(`step ${s.id}: only bash steps are supported`);
    parts.push(`echo "${MARK} ${s.id} $(date +%s)"`);
    if (s.expectExit === 0) parts.push(s.body);
    else parts.push("set +e", s.body, `echo "${EXIT} ${s.id} $?"`, "set -e");
  }
  parts.push(`echo "${MARK} end $(date +%s)"`);
  return parts.join("\n") + "\n";
}

// Turn the output lines into step records: { id, seconds, output, exit }.
// `end` closes the last step. `exit` is the status of an expect-exit step.
export function readMarkers(lines) {
  const marks = [];
  const exits = {};
  let current = null;
  for (const line of lines) {
    const m = new RegExp(`^${MARK} (\\S+) (\\d+)$`).exec(line);
    const x = new RegExp(`^${EXIT} (\\S+) (\\d+)$`).exec(line);
    if (m) {
      marks.push({ id: m[1], at: Number(m[2]), output: [] });
      current = marks[marks.length - 1];
    } else if (x) exits[x[1]] = Number(x[2]);
    else if (current) current.output.push(line);
  }
  const records = [];
  for (let i = 0; i + 1 < marks.length; i++) {
    const out = marks[i].output;
    records.push({
      id: marks[i].id,
      seconds: marks[i + 1].at - marks[i].at,
      output: out.length ? out.join("\n") + "\n" : "",
      exit: exits[marks[i].id] ?? null,
    });
  }
  return { records, last: marks.length ? marks[marks.length - 1].id : null };
}

export function parseArgs(argv) {
  const [command, file, ...rest] = argv;
  const opts = { command, file, skip: [], image: null, shell: "bash", host: false, copy: null, expected: null, record: false };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--skip") opts.skip = (rest[++i] ?? "").split(",").filter(Boolean);
    else if (rest[i] === "--image") opts.image = rest[++i];
    else if (rest[i] === "--shell") opts.shell = rest[++i];
    else if (rest[i] === "--host") opts.host = true;
    else if (rest[i] === "--copy") opts.copy = rest[++i];
    else if (rest[i] === "--expected") opts.expected = rest[++i];
    else if (rest[i] === "--record") opts.record = true;
    else throw new Error(`unknown argument ${rest[i]}`);
  }
  if (!["bash", "zsh"].includes(opts.shell)) throw new Error(`--shell must be bash or zsh, not ${opts.shell}`);
  if (opts.record && !opts.expected) throw new Error("--record needs --expected <dir>");
  return opts;
}

// The command that reads the script from stdin. In a container, zsh is
// installed first: the image is bare, and zsh is not part of the steps. With
// --copy, the folder is mounted read-only at /src and copied to /work.
export function shellCommand(opts, hostDir = null) {
  const shell = opts.shell === "zsh" ? "zsh -f -s" : "bash -s";
  if (opts.host) return { cmd: opts.shell, args: opts.shell === "zsh" ? ["-f", "-s"] : ["-s"], cwd: hostDir };
  const prepare = opts.shell === "zsh" ? "apt-get update -qq >/dev/null && apt-get install -y -qq zsh >/dev/null && " : "";
  const copy = opts.copy ? "cp -R /src /work && cd /work && " : "";
  const mount = opts.copy ? ["--volume", `${resolve(opts.copy)}:/src:ro`] : [];
  return { cmd: "docker", args: ["run", "--rm", "-i", ...mount, opts.image, "sh", "-c", `${prepare}${copy}exec ${shell}`] };
}

function runScript(opts, script) {
  return new Promise((resolveRun) => {
    // On the host the steps start in a new folder, as a reader's would: a copy
    // of --copy, or an empty one.
    let hostDir = null;
    if (opts.host) {
      hostDir = mkdtempSync(join(tmpdir(), "steps-"));
      if (opts.copy) cpSync(resolve(opts.copy), hostDir, { recursive: true });
    }
    const { cmd, args, cwd } = shellCommand(opts, hostDir);
    const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "inherit"], cwd: cwd ?? undefined });
    const lines = [];
    let pending = "";
    child.stdout.on("data", (chunk) => {
      pending += chunk;
      const parts = pending.split("\n");
      pending = parts.pop();
      for (const line of parts) {
        lines.push(line);
        console.log(line);
      }
    });
    child.on("close", (code) => {
      if (pending) lines.push(pending);
      resolveRun({ code, lines });
    });
    child.stdin.end(script);
  });
}

// Problems found by comparing records with the steps and the expected folder.
export function checkRecords(steps, records, opts) {
  const problems = [];
  for (const r of records) {
    const step = steps.find((s) => s.id === r.id);
    if (step.expectExit !== 0 && r.exit !== step.expectExit) problems.push(`${r.id}: exit ${r.exit}, expected ${step.expectExit}`);
    if (opts.expected && !opts.record) {
      const file = join(opts.expected, `${r.id}.txt`);
      if (existsSync(file) && readFileSync(file, "utf8") !== r.output) problems.push(`${r.id}: output differs from ${file}`);
    }
  }
  return problems;
}

async function main(argv) {
  const opts = parseArgs(argv);
  const steps = selectSteps(extractSteps(readFileSync(opts.file, "utf8")), opts.skip);
  const script = buildScript(steps);
  if (opts.command === "extract") {
    process.stdout.write(script);
    return 0;
  }
  if (opts.command !== "run" || (!opts.image && !opts.host)) throw new Error("usage: steps.mjs run <steps.md> (--image <image> | --host) [--shell bash|zsh] [--skip id,id] [--copy dir] [--expected dir [--record]]");
  const { code, lines } = await runScript(opts, script);
  const { records, last } = readMarkers(lines);
  console.log("\nstep durations");
  for (const r of records) console.log(`  ${r.id.padEnd(16)} ${r.seconds}s`);
  if (code !== 0) {
    console.error(`steps FAILED in step ${last} (exit ${code})`);
    return 1;
  }
  if (opts.record) {
    mkdirSync(opts.expected, { recursive: true });
    for (const r of records) if (r.output !== "") writeFileSync(join(opts.expected, `${r.id}.txt`), r.output);
    console.log(`recorded ${records.length} steps in ${opts.expected}`);
    return 0;
  }
  const problems = checkRecords(steps, records, opts);
  for (const p of problems) console.error(p);
  if (problems.length) return 1;
  console.log(`steps passed: ${records.length} steps`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(err.message);
      process.exit(2);
    },
  );
}
