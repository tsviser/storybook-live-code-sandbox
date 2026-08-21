import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const checker = fileURLToPath(new URL("./check-consistency.mjs", import.meta.url));
const actionSha = "11d5960a326750d5838078e36cf38b85af677262";

function write(root, path, contents) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function git(root, ...args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

function createRepository() {
  const root = mkdtempSync(join(tmpdir(), "sandbox-consistency-"));
  git(root, "init", "--initial-branch=main");
  write(root, "package.json", JSON.stringify({
    exports: { "./artifacts/default": "./dist/artifacts/default.js" },
  }));
  write(root, ".crossroads/live-code-sandbox.integration.json", JSON.stringify({
    publicExports: [{ subpath: "./artifacts/default", symbols: [] }],
    artifactAdapters: [{ name: "default", subpath: "./artifacts/default" }],
  }));
  write(root, "src/artifacts/default.ts", "export const defaultArtifact = {};\n");
  write(root, ".github/workflows/validate.yml", [
    "jobs:",
    "  validate:",
    "    steps:",
    `      - uses: actions/checkout@${actionSha}`,
    "",
  ].join("\n"));
  write(root, "README.md", "# Fixture\n");
  git(root, "add", ".");
  git(root, "-c", "user.name=Consistency Test", "-c", "user.email=test@example.invalid",
    "commit", "-m", "baseline");
  git(root, "switch", "--quiet", "-c", "feature");
  return root;
}

function runChecker(root, ...args) {
  return spawnSync(process.execPath, [checker, "--root", root, ...args], {
    encoding: "utf8",
  });
}

test("branch mode rejects an artifact without matching metadata", (context) => {
  const root = createRepository();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  write(root, "src/artifacts/missing.ts", "export const missingArtifact = {};\n");
  git(root, "add", ".");
  git(root, "-c", "user.name=Consistency Test", "-c", "user.email=test@example.invalid",
    "commit", "-m", "add missing artifact");

  const result = runChecker(root, "--base", "main");

  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing package\.json export/);
  assert.match(result.stderr, /missing from integration publicExports/);
  assert.match(result.stderr, /missing from integration artifactAdapters/);
});

test("staged mode warns without failing for an undocumented image", (context) => {
  const root = createRepository();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  write(root, "examples/images/new-example.png", "fixture\n");
  git(root, "add", "examples/images/new-example.png");

  const result = runChecker(root, "--staged");

  assert.equal(result.status, 0);
  assert.match(result.stderr, /WARNING: examples\/images\/new-example\.png/);
  assert.match(result.stdout, /0 error\(s\), 1 warning\(s\)/);
});

test("branch mode rejects mutable actions in a changed workflow", (context) => {
  const root = createRepository();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  write(root, ".github/workflows/validate.yml", [
    "jobs:",
    "  validate:",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "",
  ].join("\n"));
  git(root, "add", ".github/workflows/validate.yml");
  git(root, "-c", "user.name=Consistency Test", "-c", "user.email=test@example.invalid",
    "commit", "-m", "change workflow");

  const result = runChecker(root, "--base", "main");

  assert.equal(result.status, 1);
  assert.match(result.stderr, /must pin actions\/checkout@v4 to a full commit SHA/);
});
