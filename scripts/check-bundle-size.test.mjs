import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { evaluateBudgets, globToRegExp, validateConfig } from "./check-bundle-size.mjs";

function write(root, relativePath, contents) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function config(overrides = {}) {
  return {
    version: 1,
    gzipLevel: 9,
    budgets: [{
      id: "fixture",
      label: "Fixture bundle",
      scope: "package",
      directory: "dist",
      include: ["**/*.js"],
      expectedFiles: 2,
      maxBytes: 100,
      maxGzipBytes: 100,
      ...overrides,
    }],
  };
}

test("glob matching supports root and nested generated chunks", () => {
  const pattern = globToRegExp("**/editorState-*.js");
  assert.equal(pattern.test("editorState-hash.js"), true);
  assert.equal(pattern.test("assets/editorState-hash.js"), true);
  assert.equal(pattern.test("assets/editorState-hash.css"), false);
});

test("bundle budgets pass with expected files below both limits", (context) => {
  const root = mkdtempSync(join(tmpdir(), "sandbox-bundle-size-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  write(root, "dist/index.js", "export {}\n");
  write(root, "dist/chunks/editor.js", "export const editor = true\n");

  const result = evaluateBudgets(config(), { root, scope: "package" });

  assert.deepEqual(result.errors, []);
  assert.equal(result.results[0].files.length, 2);
});

test("bundle budgets fail closed for missing chunks and size regressions", (context) => {
  const root = mkdtempSync(join(tmpdir(), "sandbox-bundle-size-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  write(root, "dist/index.js", "x".repeat(120));

  const result = evaluateBudgets(config({ maxBytes: 50 }), { root });

  assert.match(result.errors.join("\n"), /expected 2 matching file\(s\), found 1/);
  assert.match(result.errors.join("\n"), /exceeds raw budget/);
});

test("invalid or duplicate budget definitions are rejected", () => {
  const invalid = config();
  invalid.budgets.push({ ...invalid.budgets[0] });
  invalid.gzipLevel = 10;

  assert.match(validateConfig(invalid).join("\n"), /gzipLevel/);
  assert.match(validateConfig(invalid).join("\n"), /must be unique/);
});
