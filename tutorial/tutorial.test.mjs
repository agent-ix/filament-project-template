// Checks of the tutorial files that need no driver and no Docker.
//   node --test tutorial/
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { extractSteps } from "../tools/steps.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const steps = extractSteps(readFileSync(resolve(ROOT, "tutorial/steps.md"), "utf8"));

// The ids the docs pages use. A page names a step by id, so an id changes only
// together with the page.
const IDS = [
  "run-checks", "run-failing-case", "break-case", "check-fails", "restore-case", "add-operation",
  "make-models", "run-checks-after-model", "add-rule", "add-cases", "record", "run-all-checks",
];
// Steps whose output the pages show.
const WITH_OUTPUT = ["run-checks", "run-failing-case", "check-fails", "make-models", "run-checks-after-model", "record", "run-all-checks"];

test("the tutorial has the documented step ids in order", () => {
  assert.deepEqual(steps.map((s) => s.id), IDS);
});

test("the steps that must fail say so", () => {
  const exits = Object.fromEntries(steps.map((s) => [s.id, s.expectExit]));
  assert.equal(exits["run-failing-case"], 10);
  assert.equal(exits["check-fails"], 2);
  assert.equal(steps.filter((s) => s.expectExit !== 0).length, 2);
});

test("every step whose output is shown has a recorded output file", () => {
  for (const id of WITH_OUTPUT) {
    const file = resolve(ROOT, "tutorial/expected", `${id}.txt`);
    assert.ok(existsSync(file), `${id}: tutorial/expected/${id}.txt is missing; run make tutorial-record`);
    assert.ok(readFileSync(file, "utf8").length > 0, id);
  }
});

test("every file a step copies exists", () => {
  const body = steps.map((s) => s.body).join("\n");
  for (const [, path] of body.matchAll(/(tutorial\/files\/[\w./-]+)/g)) {
    const dir = path.replace(/\/\*$/, "");
    assert.ok(existsSync(resolve(ROOT, dir)), `${path} does not exist`);
  }
  for (const f of ["data/deposit-small.json", "data/deposit-large.json", "requests/deposit-small.json", "requests/deposit-large.json"]) {
    assert.ok(existsSync(resolve(ROOT, "tutorial/files", f)), f);
  }
});

test("the recorded passing run lists four cases, and the final one six", () => {
  const first = readFileSync(resolve(ROOT, "tutorial/expected/run-checks.txt"), "utf8");
  assert.match(first, /check: 4 passed, 0 failed/);
  assert.match(readFileSync(resolve(ROOT, "tutorial/expected/check-fails.txt"), "utf8"), /check: 3 passed, 1 failed/);
  assert.match(readFileSync(resolve(ROOT, "tutorial/expected/run-all-checks.txt"), "utf8"), /check: 6 passed, 0 failed/);
});
