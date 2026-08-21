#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
let mode = "branch";
let baseRef = "origin/main";
let root = process.cwd();

for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--staged") {
    mode = "staged";
  } else if (argument === "--all") {
    mode = "all";
  } else if (argument === "--base") {
    baseRef = args[++index];
    if (!baseRef) throw new Error("--base requires a Git ref");
  } else if (argument === "--root") {
    const rootArgument = args[++index];
    if (!rootArgument) throw new Error("--root requires a directory");
    root = resolve(rootArgument);
  } else {
    throw new Error(`Unknown argument: ${argument}`);
  }
}

function git(commandArgs, encoding = "utf8") {
  return execFileSync("git", ["-C", root, ...commandArgs], {
    encoding,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function splitNull(value) {
  return value.split("\0").filter(Boolean);
}

function changedFiles() {
  if (mode === "all") return [];
  const diffArgs = mode === "staged"
    ? ["diff", "--cached", "--name-status", "-z"]
    : ["diff", "--name-status", "-z", `${baseRef}...HEAD`];
  const fields = splitNull(git(diffArgs));
  const changes = [];

  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (status.startsWith("R") || status.startsWith("C")) {
      index += 1;
      changes.push({ status, path: fields[index++] });
    } else {
      changes.push({ status, path: fields[index++] });
    }
  }

  return changes;
}

function listFiles(pathspec) {
  if (mode === "staged") {
    return splitNull(git(["ls-files", "--cached", "-z", "--", pathspec]));
  }

  const directory = resolve(root, pathspec);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => `${pathspec}/${entry.name}`);
}

function readSnapshot(path) {
  if (mode === "staged") {
    try {
      return git(["show", `:${path}`]);
    } catch {
      return null;
    }
  }

  const absolutePath = resolve(root, path);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : null;
}

function parseJson(path, errors) {
  const source = readSnapshot(path);
  if (source === null) {
    errors.push(`${path} is missing`);
    return null;
  }

  try {
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${path} is not valid JSON: ${error.message}`);
    return null;
  }
}

const errors = [];
const warnings = [];
let changes;

try {
  changes = changedFiles();
} catch (error) {
  console.error(`Consistency check could not inspect the ${mode} diff.`);
  console.error(error.stderr?.toString().trim() || error.message);
  process.exit(2);
}

const packageJson = parseJson("package.json", errors);
const integration = parseJson(".crossroads/live-code-sandbox.integration.json", errors);

if (packageJson && integration) {
  const artifactNames = listFiles("src/artifacts")
    .filter((path) => /\.ts$/.test(path) && !/\.test\.ts$/.test(path))
    .map((path) => path.replace(/^src\/artifacts\//, "").replace(/\.ts$/, ""));
  const artifactNameSet = new Set(artifactNames);
  const packageArtifactSubpaths = Object.keys(packageJson.exports ?? {})
    .filter((subpath) => subpath.startsWith("./artifacts/"));
  const publicSubpaths = new Set(
    (integration.publicExports ?? []).map((entry) => entry.subpath),
  );
  const adapters = new Map(
    (integration.artifactAdapters ?? []).map((entry) => [entry.name, entry.subpath]),
  );

  for (const name of artifactNames) {
    const subpath = `./artifacts/${name}`;
    if (!packageJson.exports?.[subpath]) {
      errors.push(`src/artifacts/${name}.ts is missing package.json export ${subpath}`);
    }
    if (!publicSubpaths.has(subpath)) {
      errors.push(`${subpath} is missing from integration publicExports`);
    }
    if (adapters.get(name) !== subpath) {
      errors.push(`${subpath} is missing from integration artifactAdapters`);
    }
  }

  for (const subpath of packageArtifactSubpaths) {
    const name = subpath.replace(/^\.\/artifacts\//, "");
    if (!artifactNameSet.has(name)) {
      errors.push(`package.json export ${subpath} has no src/artifacts/${name}.ts source`);
    }
  }

  for (const subpath of publicSubpaths) {
    if (!subpath.startsWith("./artifacts/")) continue;
    const name = subpath.replace(/^\.\/artifacts\//, "");
    if (!artifactNameSet.has(name)) {
      errors.push(`integration publicExport ${subpath} has no src/artifacts/${name}.ts source`);
    }
  }

  for (const [name, subpath] of adapters) {
    if (!artifactNameSet.has(name)) {
      errors.push(`integration artifactAdapter ${name} has no src/artifacts/${name}.ts source`);
    } else if (subpath !== `./artifacts/${name}`) {
      errors.push(`integration artifactAdapter ${name} must use ./artifacts/${name}`);
    }
  }
}

const changedWorkflows = mode === "all"
  ? listFiles(".github/workflows").filter((path) => /\.ya?ml$/.test(path))
  : changes
    .filter(({ status, path }) => status !== "D" && /^\.github\/workflows\/.*\.ya?ml$/.test(path))
    .map(({ path }) => path);

for (const workflowPath of changedWorkflows) {
  const source = readSnapshot(workflowPath);
  if (source === null) continue;

  source.split("\n").forEach((line, index) => {
    const reference = line.match(/^\s*-?\s*uses:\s*([^\s#]+)/)?.[1];
    if (!reference || reference.startsWith("./") || reference.startsWith("docker://")) return;
    if (!/@[0-9a-f]{40}$/.test(reference)) {
      errors.push(`${workflowPath}:${index + 1} must pin ${reference} to a full commit SHA`);
    }
  });
}

const addedImages = changes
  .filter(({ status, path }) => status === "A" && /^examples\/images\//.test(path))
  .map(({ path }) => path);

if (addedImages.length > 0) {
  const documentation = ["README.md", ...listFiles("docs")]
    .filter((path) => /\.md$/.test(path))
    .map((path) => readSnapshot(path) ?? "")
    .join("\n");

  for (const imagePath of addedImages) {
    const filename = imagePath.split("/").at(-1);
    if (!documentation.includes(filename)) {
      warnings.push(`${imagePath} is not referenced by README.md or docs/*.md`);
    }
  }
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);

const summary = `${changes.length} changed file(s), ${errors.length} error(s), ${warnings.length} warning(s)`;
if (errors.length > 0) {
  console.error(`Consistency check failed: ${summary}.`);
  process.exit(1);
}

console.log(`Consistency check passed: ${summary}.`);
