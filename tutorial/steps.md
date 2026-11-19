# Your first project

These are the commands of the first-project tutorial. The tutorial test runs every fenced block on this page, in order, in one shell in the toolchain image, from a fresh copy of the template, and compares the output of each step with the recorded output in `tutorial/expected`. The commands run from the repository root. The files that the edit steps copy are in `tutorial/files`.

## Check the project

Run every case. Both rules pass their good case, and both rules reject their bad case.

```bash step=run-checks
make check
```

Run the failing data case by hand. Exit code 10 means the rule is violated.

```bash step=run-failing-case expect-exit=10
(cd system && fsl run requests/over-limit.json --format json) | tee tutorial-over-limit-result.json
```

```bash step=assert-failing-case
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const result = JSON.parse(readFileSync('tutorial-over-limit-result.json', 'utf8'));
assert.equal(result.format, 'filament-outcome/1');
assert.equal(result.category, 'violation');
assert.equal(result.last_stage, 'S6a');
assert.deepEqual(result.diagnostics, []);
assert.equal(result.items.length, 1);
const [item] = result.items;
assert.equal(item.clause, 'WithinLimit');
assert.equal(item.result, 'refuted');
assert.equal(item.axes.truth, 'false');
console.log('WithinLimit is refuted by the account above its limit');
JS
```

## Break a case

Raise the balance of the account in the passing data case above its limit of 1000. This step edits the file for the test. A reader edits the file in an editor.

```bash step=break-case
sed -i 's/"500"/"1500"/' system/data/within-limit.json
```

The check fails, and `make` ends with status 2.

```bash step=check-fails expect-exit=2
make check
```

Put the balance back.

```bash step=restore-case
sed -i 's/"1500"/"500"/' system/data/within-limit.json
```

## Add an operation to the model

Replace the model description with the one in `tutorial/files/model/account.mjs`, which adds the operation `deposit`.

```bash step=add-operation
cp tutorial/files/model/account.mjs system/model/account.mjs
```

Generate the model file again, then run the checks. The existing cases still pass.

```bash step=make-models
make models
```

```bash step=run-checks-after-model
make check
```

## Add your own rule

Append the rule in `tutorial/files/rules/deposit-rule.fsl` to the rule file.

```bash step=add-rule
cat tutorial/files/rules/deposit-rule.fsl >> system/rules/account.fsl
```

Add one case that holds and one that does not: the data files, the request files, and the two entries of `tutorial/files/example-deposit.toml`.

```bash step=add-cases
cp tutorial/files/data/* system/data/
cp tutorial/files/requests/* system/requests/
cat tutorial/files/example-deposit.toml >> system/example.toml
```

Record the driver output of the new cases. Read `system/expected/deposit-large.json` before you trust it: a failing case must fail for the reason it is meant to show.

```bash step=record
make record
```

Check the recorded deposit results before using them as expectations.

```bash step=assert-deposit-results
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
for (const [name, category, verdict, truth] of [
  ['deposit-small', 'success', 'tested', 'true'],
  ['deposit-large', 'violation', 'refuted', 'false'],
]) {
  const result = JSON.parse(readFileSync(`system/expected/${name}.json`, 'utf8'));
  assert.equal(result.format, 'filament-outcome/1', name);
  assert.equal(result.category, category, name);
  assert.equal(result.last_stage, 'S6a', name);
  assert.deepEqual(result.diagnostics, [], name);
  assert.equal(result.items.length, 1, name);
  const [item] = result.items;
  assert.equal(item.clause, 'DepositWithinLimit', name);
  assert.equal(item.category, category, name);
  assert.equal(item.result, verdict, name);
  assert.equal(item.axes.activation, 'active', name);
  assert.equal(item.axes.execution, 'completed', name);
  assert.equal(item.axes.truth, truth, name);
}
console.log('The small deposit holds; the large deposit violates DepositWithinLimit');
JS
```

```bash step=run-all-checks
make check
```
