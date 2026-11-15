// Unit tests for the identifier rewrite. They use a fixture folder and need no FSL binary.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { rewrite, rewriteTree } from "./rename-ids.mjs";

test("renames each identifier family", () => {
  const { text, counts } = rewrite(
    [
      'profile v = "quire.value.complete/v1";',
      '"format": "quire-outcome/1"',
      '"ix://quire/native/Integer" and ix://quire/unit/cm',
      "urn:quire:model and agent-ix.github.io/quire-outcome/1",
    ].join("\n"),
  );
  assert.equal(
    text,
    [
      'profile v = "filament.value.complete/v1";',
      '"format": "filament-outcome/1"',
      '"ix://filament/native/Integer" and ix://filament/unit/cm',
      "urn:filament:model and agent-ix.github.io/filament-outcome/1",
    ].join("\n"),
  );
  assert.equal(counts["wire ids"], 1);
  assert.equal(counts["result document format"], 2);
});

test("leaves names that are not FSL identifiers alone", () => {
  const same = "quire matrix, `quire` --version, quire.toml, @agent-ix/quire-cli, language \"ix:native\", quire-md";
  assert.equal(rewrite(same).text, same);
});

test("rewriting twice changes nothing more", () => {
  const once = rewrite('profile v = "quire.temporal.complete/v1";').text;
  assert.equal(rewrite(once).text, once);
});

test("rewrites a tree, skips licence data and .git", () => {
  const root = mkdtempSync(join(tmpdir(), "rename-"));
  mkdirSync(join(root, "rules"));
  mkdirSync(join(root, "licenses"));
  writeFileSync(join(root, "rules", "a.fsl"), 'profile v = "quire.state.snapshot/v1";\n');
  writeFileSync(join(root, "licenses", "d.json"), '"quire.state.snapshot/v1"');
  const dry = rewriteTree(root, { write: false });
  assert.equal(dry.changed.length, 1);
  assert.match(readFileSync(join(root, "rules", "a.fsl"), "utf8"), /quire\./);
  rewriteTree(root);
  assert.equal(readFileSync(join(root, "rules", "a.fsl"), "utf8"), 'profile v = "filament.state.snapshot/v1";\n');
  assert.equal(readFileSync(join(root, "licenses", "d.json"), "utf8"), '"quire.state.snapshot/v1"');
});
