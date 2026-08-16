import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateManifest } from "./validate-integration.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

test("the repository integration manifest is valid", () => {
  assert.deepEqual(validateManifest(read(".crossroads/live-code-sandbox.integration.json")), []);
});

for (const fixture of [
  "invalid-artifact-adapter.json",
  "invalid-missing-provenance.json",
  "invalid-observed-without-pointer.json",
  "invalid-unsafe-registry-entry.json",
]) {
  test(`${fixture} is rejected`, () => {
    assert.notDeepEqual(validateManifest(read(`.crossroads/fixtures/${fixture}`)), []);
  });
}
