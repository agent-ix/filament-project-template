---
id: SR-1424
title: "Gap analysis of first-project tutorial journey assertions"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-project-template; QSL-2481; PR 6; Makefile, tutorial/steps.md, tutorial/tutorial.test.mjs"
review_set: subset
---

## Summary

Scope is the three-file tutorial slice at frozen head 209425144129b9ad441b99566a16c953c91871ec. The dispatch supplies ticket/team/project metadata; no issue metadata or peer-result rechecks were needed. Checked the changed assertions and entry point against this tutorial's stated public journey; this is a diff-scoped check, not a repository inventory.

## Verdict

**PASS for the changed assertion coverage at c6641934f015056fdd2a16ac6c71b2ab9923d91c.** The separate code-review finding is fixed; the actual current-main runtime gate remains pending. This does not assert that every documented tutorial or the gated native FSL model-author route is delivered.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

The existing first-project sequence still performs checks, an expected violation, an intentional data mutation and refusal, restoration, model regeneration, an appended rule and new cases, recording, and a final check. New assertions independently require WithinLimit to refute the over-limit data and DepositWithinLimit to distinguish the small and large deposits. They would fail on an incorrect public FSL verdict, category, stage, diagnostics, clause selection or axes. The updated unit ID list preserves the sequence and existing output-file checks; it is supporting metadata rather than the only claimed feature evidence. The new host entry reuses the established runner.

No new ignored test, fabricated passing oracle, private-engine bypass, model/schema/binary copy or additional framework was found. QSL-1980 remains an explicit pending native model-author route, not coverage claimed by these template steps. Accepted the coder's five unit passes; actual main-CLI journey execution has not occurred and remains necessary. Matrix, builds, tests, repository-wide coverage and repeated peer measurements were excluded by the review brief. Semantic intent was checked only for this diff's tutorial assertions.
Plan completion: not assessed.

## Examined Scope

```json
{
  "clean": true,
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
    }
  ],
  "findings": [],
  "bindings": []
}
```

## Follow-up Scope

The confined fix preserves the public tutorial oracles. Restoring the plain fsl invocation repairs the standalone reader path; the host Make entry selects the configured shared binary for the existing runner. The deposit test still requires the intended clause, category, verdict, stage, diagnostics, activation, execution and truth. Removing the unpromised closed-scope settlement assumption follows the supplied FR-521 fact that settlement is independent of truth, rather than weakening an intended tutorial outcome. No additional finding arose from this correction. Accepted the reported shared current-main CLI build; the lead still owns the final actual tutorial gate. No tests, builds, matrix, ticket metadata rechecks or full review sweep were repeated.

