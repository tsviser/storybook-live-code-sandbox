import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, ".crossroads/live-code-sandbox.integration.json");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const fail = (errors, message) => errors.push(message);

function declarationExports(file) {
  const source = fs.readFileSync(file, "utf8");
  const symbols = new Set();
  for (const match of source.matchAll(/(?:^|\n)\s*export\s+(?:type\s+)?\{([^}]+)\}/gs)) {
    for (const item of match[1].split(",")) {
      const name = item.trim().split(/\s+as\s+/).at(-1)?.trim();
      if (name) symbols.add(name);
    }
  }
  for (const match of source.matchAll(/(?:^|\n)\s*export\s+(?:declare\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    symbols.add(match[1]);
  }
  return symbols;
}

function resolveLocalPointer(pointer) {
  if (!isNonEmptyString(pointer) || /^https?:\/\//.test(pointer)) return true;
  const match = /^(.*):(\d+)$/.exec(pointer);
  if (!match) return false;
  const file = path.resolve(root, match[1]);
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  const line = Number(match[2]);
  return Number.isInteger(line) && line > 0 && line <= fs.readFileSync(file, "utf8").split("\n").length;
}

export function validateManifest(manifest, { packageJson = readJson(path.join(root, "package.json")) } = {}) {
  const errors = [];
  if (!isObject(manifest)) return ["manifest must be an object"];
  if (manifest.kind === "registry-entry") return validateRegistryEntry(manifest.entry);
  if (manifest.contractVersion !== "0.1") fail(errors, "contractVersion must be 0.1");

  const pkg = manifest.package;
  if (!isObject(pkg)) fail(errors, "package must be an object");
  else {
    for (const key of ["name", "version", "repository", "defaultBranch"]) {
      if (!isNonEmptyString(pkg[key])) fail(errors, `package.${key} must be a non-empty string`);
    }
    if (pkg.name !== packageJson.name) fail(errors, "package.name does not match package.json");
    if (pkg.version !== packageJson.version) fail(errors, "package.version does not match package.json");
    if (pkg.repository !== "https://github.com/tsviser/storybook-live-code-sandbox") fail(errors, "package.repository is not canonical");
    if (pkg.defaultBranch !== "main") fail(errors, "package.defaultBranch must be main");
  }

  const agentSystem = manifest.agentSystem;
  if (!isObject(agentSystem)) fail(errors, "agentSystem must be an object");
  else {
    if (agentSystem.registryEntry !== "live_code_sandbox") fail(errors, "agentSystem.registryEntry must be live_code_sandbox");
    if (agentSystem.agent !== "live-code-sandbox-specialist") fail(errors, "agentSystem.agent must be live-code-sandbox-specialist");
    if (agentSystem.skill !== "crossroads-live-code-sandbox") fail(errors, "agentSystem.skill must be crossroads-live-code-sandbox");
    if (!/^https:\/\/github\.com\/tsviser\/crossroads-agent-system$/.test(agentSystem.source ?? "")) fail(errors, "agentSystem.source must point to the Agent System repository");
  }

  const declared = manifest.publicExports;
  if (!Array.isArray(declared) || declared.length === 0) fail(errors, "publicExports must be a non-empty array");
  const declaredSubpaths = new Set();
  for (const entry of declared ?? []) {
    if (!isObject(entry) || !isNonEmptyString(entry.subpath) || !Array.isArray(entry.symbols)) {
      fail(errors, "each publicExports entry needs a subpath and symbols array");
      continue;
    }
    if (declaredSubpaths.has(entry.subpath)) fail(errors, `duplicate public export ${entry.subpath}`);
    declaredSubpaths.add(entry.subpath);
    const duplicateSymbols = entry.symbols.filter((symbol, index) => entry.symbols.indexOf(symbol) !== index);
    if (entry.symbols.some((symbol) => !isNonEmptyString(symbol))) fail(errors, `public export ${entry.subpath} contains an invalid symbol`);
    if (duplicateSymbols.length) fail(errors, `public export ${entry.subpath} contains duplicate symbols: ${[...new Set(duplicateSymbols)].join(", ")}`);
  }
  const packageExports = Object.keys(packageJson.exports ?? {});
  for (const subpath of packageExports) {
    if (!declaredSubpaths.has(subpath)) fail(errors, `public export missing from manifest: ${subpath}`);
  }
  for (const subpath of declaredSubpaths) {
    if (!Object.hasOwn(packageJson.exports ?? {}, subpath)) fail(errors, `manifest declares unknown public export: ${subpath}`);
  }
  for (const entry of declared ?? []) {
    if (!isObject(entry) || !isNonEmptyString(entry.subpath) || !Array.isArray(entry.symbols)) continue;
    const packageExport = packageJson.exports?.[entry.subpath];
    const typesTarget = isObject(packageExport) && isNonEmptyString(packageExport.types)
      ? path.resolve(root, packageExport.types)
      : null;
    if (!typesTarget) {
      if (entry.symbols.length) fail(errors, `public export ${entry.subpath} declares symbols without a declaration file`);
      continue;
    }
    if (!fs.existsSync(typesTarget)) {
      fail(errors, `declaration file missing for public export ${entry.subpath}: ${path.relative(root, typesTarget)}`);
      continue;
    }
    const generatedSymbols = declarationExports(typesTarget);
    const declaredSymbols = new Set(entry.symbols);
    const missing = [...generatedSymbols].filter((symbol) => !declaredSymbols.has(symbol)).sort();
    const stale = [...declaredSymbols].filter((symbol) => !generatedSymbols.has(symbol)).sort();
    if (missing.length) fail(errors, `public export ${entry.subpath} is missing generated symbols: ${missing.join(", ")}`);
    if (stale.length) fail(errors, `public export ${entry.subpath} declares stale symbols: ${stale.join(", ")}`);
  }

  if (!isObject(manifest.boundaries)) fail(errors, "boundaries must be an object");
  else for (const key of ["editor", "preview", "runtimeScope", "registry", "storage", "managerCommunication"]) {
    if (!isNonEmptyString(manifest.boundaries[key])) fail(errors, `boundaries.${key} must be a non-empty string`);
  }
  const registryText = manifest.boundaries?.registry ?? "";
  if (/arbitrary executable|eval\(|new Function|provider code/i.test(registryText)) fail(errors, "registry boundary cannot declare arbitrary executable provider code");

  if (!Array.isArray(manifest.artifactAdapters)) fail(errors, "artifactAdapters must be an array");
  const adapterNames = new Set();
  for (const adapter of manifest.artifactAdapters ?? []) {
    if (!isObject(adapter) || !isNonEmptyString(adapter.name) || !isNonEmptyString(adapter.subpath) || typeof adapter.packageAgnostic !== "boolean") {
      fail(errors, "each artifact adapter needs name, subpath, and boolean packageAgnostic");
      continue;
    }
    if (adapterNames.has(adapter.name)) fail(errors, `duplicate artifact adapter ${adapter.name}`);
    adapterNames.add(adapter.name);
    if (!adapter.subpath.startsWith("./artifacts/") || !declaredSubpaths.has(adapter.subpath)) fail(errors, `artifact adapter subpath is not a declared artifact export: ${adapter.subpath}`);
  }

  if (!Array.isArray(manifest.validationCommands) || manifest.validationCommands.length === 0 || manifest.validationCommands.some((command) => !isNonEmptyString(command))) fail(errors, "validationCommands must contain non-empty strings");
  if (!Array.isArray(manifest.unsupportedCapabilities) || manifest.unsupportedCapabilities.length === 0 || manifest.unsupportedCapabilities.some((item) => !isNonEmptyString(item))) fail(errors, "unsupportedCapabilities must contain non-empty strings");

  if (!Array.isArray(manifest.provenance) || manifest.provenance.length === 0) fail(errors, "provenance must contain at least one claim");
  for (const claim of manifest.provenance ?? []) {
    if (!isObject(claim) || !["observed", "reported", "inferred", "proposed", "unknown"].includes(claim.label) || !isNonEmptyString(claim.claim) || !isNonEmptyString(claim.pointer)) {
      fail(errors, "each provenance claim needs a valid label, claim, and pointer");
      continue;
    }
    if (["observed", "reported"].includes(claim.label) && !resolveLocalPointer(claim.pointer)) fail(errors, `unresolvable provenance pointer: ${claim.pointer}`);
  }
  return errors;
}

function validateRegistryEntry(entry) {
  const errors = [];
  if (!isObject(entry)) return ["registry entry must be an object"];
  if (!isNonEmptyString(entry.name)) fail(errors, "registry entry name must be a non-empty string");
  if (!Array.isArray(entry.examples) || entry.examples.length === 0) fail(errors, "registry entry must contain at least one example");
  for (const example of entry.examples ?? []) {
    if (!isObject(example) || !isNonEmptyString(example.name) || !isNonEmptyString(example.code)) fail(errors, "registry examples need name and code");
    if (/\b(import|eval|Function)\b|window\.|document\./.test(example.code ?? "")) fail(errors, "registry examples cannot declare imports, dynamic execution, or ambient browser access");
  }
  if (entry.sandboxVisible !== false && isNonEmptyString(entry.disabledReason)) fail(errors, "an unavailable registry entry must not be sandbox-visible");
  return errors;
}

function run() {
  const errors = validateManifest(readJson(manifestPath));
  if (errors.length) throw new Error(["manifest validation failed", ...errors.map((error) => `- ${error}`)].join("\n"));
  const fixtureDir = path.join(root, ".crossroads/fixtures");
  for (const fixture of fs.readdirSync(fixtureDir).filter((file) => file.startsWith("invalid-") && file.endsWith(".json")).sort()) {
    const fixtureErrors = validateManifest(readJson(path.join(fixtureDir, fixture)));
    if (fixtureErrors.length === 0) throw new Error(`invalid fixture unexpectedly passed: ${fixture}`);
    console.log(`${fixture}: rejected as expected`);
  }
  console.log(`${path.relative(root, manifestPath)}: valid`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
