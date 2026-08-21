import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultConfigPath = path.join(repositoryRoot, "bundle-size-budgets.json");

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

export function globToRegExp(glob) {
  let source = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];
    if (character === "*" && glob[index + 1] === "*") {
      if (glob[index + 2] === "/") {
        source += "(?:.*/)?";
        index += 2;
      } else {
        source += ".*";
        index += 1;
      }
    } else if (character === "*") {
      source += "[^/]*";
    } else if (character === "?") {
      source += "[^/]";
    } else {
      source += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return new RegExp(`${source}$`);
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(target));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

export function validateConfig(config) {
  const errors = [];
  if (config?.version !== 1) errors.push("version must be 1");
  if (!Number.isInteger(config?.gzipLevel) || config.gzipLevel < 0 || config.gzipLevel > 9) {
    errors.push("gzipLevel must be an integer from 0 through 9");
  }
  if (!Array.isArray(config?.budgets) || config.budgets.length === 0) {
    errors.push("budgets must be a non-empty array");
    return errors;
  }

  const ids = new Set();
  for (const [index, budget] of config.budgets.entries()) {
    const prefix = `budgets[${index}]`;
    if (!budget || typeof budget !== "object" || Array.isArray(budget)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (typeof budget.id !== "string" || budget.id.length === 0) errors.push(`${prefix}.id must be a non-empty string`);
    else if (ids.has(budget.id)) errors.push(`${prefix}.id must be unique: ${budget.id}`);
    else ids.add(budget.id);
    if (typeof budget.label !== "string" || budget.label.length === 0) errors.push(`${prefix}.label must be a non-empty string`);
    if (!["package", "consumer"].includes(budget.scope)) errors.push(`${prefix}.scope must be package or consumer`);
    if (typeof budget.directory !== "string" || budget.directory.length === 0) errors.push(`${prefix}.directory must be a non-empty string`);
    if (!Array.isArray(budget.include) || budget.include.length === 0 || budget.include.some((item) => typeof item !== "string" || item.length === 0)) {
      errors.push(`${prefix}.include must contain non-empty glob strings`);
    }
    for (const key of ["expectedFiles", "maxBytes", "maxGzipBytes"]) {
      if (!isPositiveInteger(budget[key])) errors.push(`${prefix}.${key} must be a positive integer`);
    }
  }
  return errors;
}

export function evaluateBudgets(config, { root = repositoryRoot, scope } = {}) {
  const configErrors = validateConfig(config);
  if (configErrors.length) return { errors: configErrors.map((error) => `Invalid bundle budget config: ${error}`), results: [] };

  const selected = config.budgets.filter((budget) => !scope || budget.scope === scope);
  if (selected.length === 0) return { errors: [`No bundle budgets found for scope: ${scope}`], results: [] };

  const errors = [];
  const results = selected.map((budget) => {
    const directory = path.resolve(root, budget.directory);
    const patterns = budget.include.map(globToRegExp);
    const files = listFiles(directory)
      .filter((file) => patterns.some((pattern) => pattern.test(normalizePath(path.relative(directory, file)))))
      .sort();
    let bytes = 0;
    let gzipBytes = 0;
    for (const file of files) {
      const contents = fs.readFileSync(file);
      bytes += contents.length;
      gzipBytes += gzipSync(contents, { level: config.gzipLevel }).length;
    }

    if (files.length !== budget.expectedFiles) {
      errors.push(`${budget.id}: expected ${budget.expectedFiles} matching file(s), found ${files.length}`);
    }
    if (bytes > budget.maxBytes) {
      errors.push(`${budget.id}: ${bytes} bytes exceeds raw budget ${budget.maxBytes} by ${bytes - budget.maxBytes}`);
    }
    if (gzipBytes > budget.maxGzipBytes) {
      errors.push(`${budget.id}: ${gzipBytes} gzip bytes exceeds budget ${budget.maxGzipBytes} by ${gzipBytes - budget.maxGzipBytes}`);
    }

    return {
      ...budget,
      bytes,
      files: files.map((file) => normalizePath(path.relative(root, file))),
      gzipBytes,
    };
  });

  return { errors, results };
}

function formatBytes(bytes) {
  return `${(bytes / 1000).toFixed(1)} kB`;
}

function parseScope(argv) {
  const scopeFlag = argv.indexOf("--scope");
  if (scopeFlag === -1) return undefined;
  const scope = argv[scopeFlag + 1];
  if (!["package", "consumer"].includes(scope)) throw new Error("--scope must be package or consumer");
  return scope;
}

function run() {
  const config = JSON.parse(fs.readFileSync(defaultConfigPath, "utf8"));
  const { errors, results } = evaluateBudgets(config, { scope: parseScope(process.argv.slice(2)) });
  for (const result of results) {
    console.log(`${errors.some((error) => error.startsWith(`${result.id}:`)) ? "FAIL" : "PASS"} ${result.label}`);
    console.log(`  raw ${formatBytes(result.bytes)} / ${formatBytes(result.maxBytes)}; gzip ${formatBytes(result.gzipBytes)} / ${formatBytes(result.maxGzipBytes)}`);
    console.log(`  ${result.files.join(", ") || "no matching files"}`);
  }
  if (errors.length) {
    console.error(["Bundle-size check failed:", ...errors.map((error) => `- ${error}`)].join("\n"));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
