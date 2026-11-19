import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateCase } from "./run.mjs";

const CASES = [
  ["within-limit", "WithinLimit", 0, "success", "tested"],
  ["over-limit", "WithinLimit", 10, "violation", "refuted"],
  ["withdraw-right", "WithdrawNeverRaises", 0, "success", "tested"],
  ["withdraw-wrong", "WithdrawNeverRaises", 10, "violation", "refuted"],
];

function example([id, clause, exit, category, result]) {
  const doc = {
    artifacts: [], category, diagnostics: [], format: "filament-outcome/1",
    items: [{ category, cause: null, clause, request_index: 0, result }],
    last_stage: "S6a", operation: "monitor", result: null,
  };
  return {
    c: { id, status: "running", expect_exit: exit },
    run: { exit, stdout: JSON.stringify(doc) },
    expected: JSON.stringify(doc),
    doc,
  };
}

test("all four tutorial outcomes retain their clause and verdict when witness details are added", () => {
  for (const row of CASES) {
    const { c, run, expected, doc } = example(row);
    doc.items[0].axes = {
      activation: "active", execution: "completed",
      truth: row[2] === 0 ? "true" : "false",
      settlement: row[2] === 0 ? "decisive-witness" : "decisive-counterexample",
    };
    doc.items[0].witness = { deciding_element: { kind: "boolean", value: row[2] === 0 } };
    run.stdout = JSON.stringify(doc, null, 2);
    assert.deepEqual(evaluateCase(c, run, expected), { ok: true, message: `${c.id}: exit ${run.exit} ok` });
  }
});

test("a different clause fails even when exit and verdict match", () => {
  for (const row of CASES) {
    const { c, run, expected, doc } = example(row);
    doc.items[0].clause = "AnotherRule";
    run.stdout = JSON.stringify(doc);
    const result = evaluateCase(c, run, expected);
    assert.equal(result.ok, false, c.id);
    assert.match(result.message, /outcome\.items\[0\]\.clause differs/);
  }
});

test("a different verdict fails even when exit and category match", () => {
  for (const row of CASES) {
    const { c, run, expected, doc } = example(row);
    doc.items[0].result = row[4] === "tested" ? "refuted" : "tested";
    run.stdout = JSON.stringify(doc);
    const result = evaluateCase(c, run, expected);
    assert.equal(result.ok, false, c.id);
    assert.match(result.message, /outcome\.items\[0\]\.result differs/);
  }
});

test("malformed or incomplete outcome documents fail without throwing", () => {
  const { c, run, expected } = example(CASES[0]);
  for (const stdout of ["not JSON", "null", "{}", '{"format":"filament-outcome/1","items":[null]}']) {
    assert.equal(evaluateCase(c, { ...run, stdout }, expected).ok, false, stdout);
  }
  assert.equal(evaluateCase(c, run, "{").ok, false);
});

test("all four promised exit codes remain mandatory", () => {
  for (const row of CASES) {
    const { c, run, expected } = example(row);
    run.exit = row[2] === 0 ? 10 : 0;
    const result = evaluateCase(c, run, expected);
    assert.equal(result.ok, false, c.id);
    assert.match(result.message, new RegExp(`exit ${run.exit}, expected ${c.expect_exit}`));
  }
});
