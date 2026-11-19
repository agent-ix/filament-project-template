---
id: SR-1423
title: "Code review of first-project tutorial journey assertions"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-project-template; QSL-2481; PR 6; Makefile, tutorial/steps.md, tutorial/tutorial.test.mjs"
review_set: subset
---

## Summary

Scope is the three-file tutorial slice at frozen head 209425144129b9ad441b99566a16c953c91871ec. The dispatch supplies ticket/team/project metadata; no issue metadata or peer-result rechecks were needed. One introduced default-driver regression affects a reader running the documented commands directly.

## Verdict

**PASS at fix head c6641934f015056fdd2a16ac6c71b2ab9923d91c** — FND-001 is fixed. The final current-main journey gate remains pending; the reported shared CLI build is accepted without rechecking it.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-001 | medium | The direct tutorial command requires an undocumented FSL environment variable instead of the documented fsl default. | tutorial/steps.md:16; config.mk:3-4; README.md:109 | correct-requirement-no-evidence |

A reader with `fsl` installed on PATH can run `make check` as documented without exporting FSL. Make's config.mk export reaches Make's children, not the reader's parent shell. The next standalone step now expands `"$FSL"` with no initialization in the tutorial and therefore cannot invoke the documented default. The host Make target supplies FSL, so its configured test path can work while this user path regresses. The steps runner also does not forward host FSL into Docker; no assumption about the current image's environment is needed for the manual-reader defect. Preserve the documented default invocation as well as the configured test binary without requiring an undocumented setup step.

## Coverage

The new structural assertions bind the actual public outputs to the intended clauses, stage, categories and truth values. Both deposit outcomes assert complete axes, rather than accepting whatever make record happened to produce. The host target reuses the existing steps runner and disposable copy mechanism. No copied model, schema, binary, external fixture, new framework, product API adapter, or TL behavior was introduced.

Accepted the reported five unit passes without rerunning them. No tests, builds, matrix or broad README audit were run. No Rust, specification or plan source changed, so Rust and spec reviews are inapplicable; no applicable AssuranceProfile was found in the repository scope. Documentation changes are executable tutorial steps with short lead-ins; the sole defect is the direct invocation above. Plan completion: not assessed.

## Examined Scope

```json
{
  "clean": false,
  "scope": [
    {
      "id": "QSL-2481",
      "path": "Linear QSL-2481",
      "role": "context_only",
      "excerpt": "Outcome: the end-to-end tutorial (write a model from source, check, compile, analyze, run) works as documented (QSL-1980 newcomer route). Acceptance: one journey per documented tutorial."
    },
    {
      "id": "run-failing-case",
      "path": "tutorial/steps.md:15-16",
      "role": "examined",
      "excerpt": "```bash step=run-failing-case expect-exit=10\n(cd system && \"$FSL\" run requests/over-limit.json --format json) | tee tutorial-over-limit-result.json"
    },
    {
      "id": "assert-failing-case",
      "path": "tutorial/steps.md:19-34",
      "role": "examined",
      "excerpt": "assert.equal(result.category, 'violation');\nassert.equal(result.last_stage, 'S6a');\nassert.deepEqual(result.diagnostics, []);\nassert.equal(item.clause, 'WithinLimit');\nassert.equal(item.result, 'refuted');\nassert.equal(item.axes.truth, 'false');"
    },
    {
      "id": "assert-deposit-results",
      "path": "tutorial/steps.md:99-123",
      "role": "examined",
      "excerpt": "['deposit-small', 'success', 'tested', 'true'],\n['deposit-large', 'violation', 'refuted', 'false'],\nassert.equal(item.clause, 'DepositWithinLimit', name);\nassert.equal(item.result, verdict, name);\nassert.deepEqual(item.axes, {\n  activation: 'active', execution: 'completed', settlement: 'closed-scope', truth,\n}, name);"
    },
    {
      "id": "tutorial-host-test",
      "path": "Makefile:34-35",
      "role": "examined",
      "excerpt": "tutorial-host-test:\n\t$(NODE) tools/steps.mjs run tutorial/steps.md --host --shell $(STEPS_SHELL) --copy ."
    },
    {
      "id": "tutorial-step-ids",
      "path": "tutorial/tutorial.test.mjs:15-18",
      "role": "examined",
      "excerpt": "\"run-checks\", \"run-failing-case\", \"assert-failing-case\", \"break-case\", \"check-fails\", \"restore-case\", \"add-operation\",\n\"make-models\", \"run-checks-after-model\", \"add-rule\", \"add-cases\", \"record\", \"assert-deposit-results\", \"run-all-checks\","
    },
    {
      "id": "default-driver-selection",
      "path": "config.mk:1-4; README.md:109",
      "role": "context_only",
      "excerpt": "FSL ?= fsl\nexport FSL"
    }
  ],
  "findings": [
    {
      "fnd": "FND-001",
      "severity": "medium",
      "confidence": "high",
      "method": "code-review",
      "check": "code-bug",
      "artifact_id": "run-failing-case",
      "related_ids": [
        "default-driver-selection"
      ],
      "path": "tutorial/steps.md",
      "lines": "16",
      "excerpt": "(cd system && \"$FSL\" run requests/over-limit.json --format json) | tee tutorial-over-limit-result.json",
      "finding": "The direct tutorial command requires an undocumented FSL environment variable instead of the documented fsl default."
    }
  ],
  "bindings": []
}
```

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | Restored the standalone documented fsl command. The host Make entry selects the configured shared binary through PATH for the existing runner, without requiring a reader to export FSL. |

## Disposition Scope

Inspected only the fix diff through c6641934f015056fdd2a16ac6c71b2ab9923d91c. The direct step now invokes `fsl run`; the host entry prepends the directory of the configured shared FSL binary to PATH. The related deposit correction drops only the unrelated closed-scope settlement assumption. Clause identity, category, verdict, stage, diagnostics, activation, execution and true/false assertions remain, so the documented tutorial outcomes still have independent structural oracles. Accepted the supplied FR-521 separation of settlement and truth; no specification lookup, metadata recheck or new review sweep was needed. No tests, builds or matrix were run.

```json
{
  "dispositions": [
    {
      "fnd": "FND-001",
      "outcome": "fixed",
      "after_excerpt": "(cd system && fsl run requests/over-limit.json --format json) | tee tutorial-over-limit-result.json"
    }
  ],
  "related_scope": [
    {
      "id": "assert-deposit-results",
      "path": "tutorial/steps.md",
      "role": "examined",
      "excerpt": "assert.equal(item.axes.activation, 'active', name);\n  assert.equal(item.axes.execution, 'completed', name);\n  assert.equal(item.axes.truth, truth, name);"
    }
  ]
}
```

