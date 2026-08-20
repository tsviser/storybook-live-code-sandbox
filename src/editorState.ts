import type {
  AddStoryToSandboxInput,
  LiveCodeCheckpoint,
  LiveCodeRegistryProp,
  LiveCodeSandboxStorage,
} from "./types";
import { jsxLanguage } from "@codemirror/lang-javascript";
import { getLiveCodeSandboxSyncEvent } from "./events";

export const DEFAULT_CODE = "";
export const DEFAULT_CHECKPOINT_INTERVAL = 5;
export const DEFAULT_HISTORY_LIMIT = 8;
export const MAX_HISTORY_LIMIT = 50;

export type SandboxStorageReadOutcome = "empty" | "invalid" | "loaded" | "unavailable";
export type SandboxStorageWriteFailure = "quota" | "unavailable" | "unknown";
export type SandboxStorageReadResult = {
  outcome: SandboxStorageReadOutcome;
  state: LiveCodeSandboxStorage;
};
export type SandboxStorageWriteResult =
  | { ok: true }
  | { ok: false; reason: SandboxStorageWriteFailure };

let fallbackCheckpointSequence = 0;

export const normalizeCheckpointInterval = (value: number | undefined): number =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value ?? 0)) : DEFAULT_CHECKPOINT_INTERVAL;

export const normalizeHistoryLimit = (value: number | undefined): number =>
  Number.isFinite(value)
    ? Math.min(MAX_HISTORY_LIMIT, Math.max(1, Math.floor(value ?? DEFAULT_HISTORY_LIMIT)))
    : DEFAULT_HISTORY_LIMIT;

export const createDefaultStorage = (
  initialCode = DEFAULT_CODE,
  checkpointInterval = DEFAULT_CHECKPOINT_INTERVAL,
  historyLimit = DEFAULT_HISTORY_LIMIT,
): LiveCodeSandboxStorage => ({
  version: 3,
  code: initialCode,
  cursor: initialCode.length,
  lastSuccessfulCode: initialCode,
  checkpoints: [],
  checkpointInterval: normalizeCheckpointInterval(checkpointInterval),
  historyLimit: normalizeHistoryLimit(historyLimit),
  insertionActionCount: 0,
});

export const clampCursor = (cursor: number, code: string): number =>
  Math.max(0, Math.min(cursor, code.length));

export const insertSnippet = (
  code: string,
  snippet: string,
  selection: { from: number; to?: number },
): { code: string; cursor: number } => {
  const from = clampCursor(selection.from, code);
  const to = clampCursor(selection.to ?? from, code);
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  return {
    code: `${code.slice(0, start)}${snippet}${code.slice(end)}`,
    cursor: start + snippet.length,
  };
};

const withSnippetSpacing = (code: string, snippet: string, offset: number) => {
  const before = code.slice(0, offset);
  const after = code.slice(offset);
  const leading = before && !/\s$/.test(before) ? "\n" : "";
  const trailing = after && !/^\s/.test(after) ? "\n" : "";
  return { leadingLength: leading.length, text: `${leading}${snippet}${trailing}` };
};

const treeHasErrors = (code: string) => {
  const cursor = jsxLanguage.parser.parse(`<>${code}</>`).cursor();
  do {
    if (cursor.type.isError) return true;
  } while (cursor.next());
  return false;
};

export const getSafeTopLevelInsertionOffset = (code: string, cursor: number): number | null => {
  if (!code.trim()) return 0;
  const prefixLength = 2;
  const wrapped = `<>${code}</>`;
  const tree = jsxLanguage.parser.parse(wrapped);
  if (treeHasErrors(code) || tree.length !== wrapped.length) return null;

  const root = tree.cursor();
  let outerFragmentFound = false;
  do {
    if (root.name === "JSXElement" && root.from === 0 && root.to === wrapped.length) {
      outerFragmentFound = true;
      break;
    }
  } while (root.next());
  if (!outerFragmentFound || !root.firstChild()) return null;

  const safeCursor = clampCursor(cursor, code) + prefixLength;
  const boundaries = [prefixLength];
  do {
    if (root.name === "JSXElement" && root.from >= prefixLength && root.to <= wrapped.length - 3) {
      boundaries.push(root.to);
    }
  } while (root.nextSibling());
  boundaries.push(wrapped.length - 3);

  const exact = boundaries.find((boundary) => boundary === safeCursor);
  if (exact !== undefined) return exact - prefixLength;
  const next = boundaries.find((boundary) => boundary > safeCursor);
  return next === undefined ? code.length : next - prefixLength;
};

export const insertSnippetSafely = (
  code: string,
  snippet: string,
  cursor: number,
  snippetCursorOffset = snippet.length,
): { code: string; cursor: number } | null => {
  const offset = getSafeTopLevelInsertionOffset(code, cursor);
  if (offset === null) return null;
  const spacedSnippet = withSnippetSpacing(code, snippet, offset);
  const inserted = insertSnippet(code, spacedSnippet.text, { from: offset });
  if (treeHasErrors(inserted.code)) return null;
  return {
    code: inserted.code,
    cursor: offset + spacedSnippet.leadingLength + Math.min(snippet.length, Math.max(0, snippetCursorOffset)),
  };
};

export const addCheckpoint = (
  checkpoints: LiveCodeCheckpoint[],
  checkpoint: Omit<LiveCodeCheckpoint, "id" | "createdAt">,
  historyLimit = DEFAULT_HISTORY_LIMIT,
  createdAt = Date.now(),
): LiveCodeCheckpoint[] => [
  ...checkpoints,
  {
    ...checkpoint,
    id: `${createdAt}-${createCheckpointSuffix(checkpoints.length)}`,
    createdAt,
  },
].slice(-normalizeHistoryLimit(historyLimit));

const createCheckpointSuffix = (checkpointCount: number): string => {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return uuid;
  } catch {
    // Fall through to a process-local unique suffix.
  }
  fallbackCheckpointSequence += 1;
  return `${checkpointCount}-${fallbackCheckpointSequence}-${Math.random().toString(36).slice(2)}`;
};

export const getPropInsertionOffset = (snippet: string): number => {
  const openingTag = snippet.match(/<[A-Z][\w.]*(?=[\s/>])/);
  if (!openingTag || openingTag.index === undefined) return snippet.length;
  const tagStart = openingTag.index + openingTag[0].length;
  const closingBracket = snippet.indexOf(">", tagStart);
  if (closingBracket < 0) return snippet.length;
  if (snippet[closingBracket - 1] !== "/") return closingBracket;
  let insertionOffset = closingBracket - 1;
  while (insertionOffset > tagStart && /\s/.test(snippet[insertionOffset - 1])) {
    insertionOffset -= 1;
  }
  return insertionOffset;
};

export const getOpeningTagPropNames = (code: string, cursor: number): string[] => {
  const safeCursor = clampCursor(cursor, code);
  const tagStart = code.lastIndexOf("<", safeCursor);
  if (tagStart < 0) return [];
  return Array.from(
    code.slice(tagStart, safeCursor).matchAll(/\s([A-Za-z_$][\w$:-]*)(?=\s*=|\s|$)/g),
    (match) => match[1],
  );
};

export const getStringLiteralOptions = (type = ""): string[] =>
  Array.from(type.matchAll(/["']([^"']+)["']/g), (match) => match[1]);

const firstStringLiteral = (type = "") => getStringLiteralOptions(type)[0];

export const createPropAssignment = (prop: LiveCodeRegistryProp): string | null => {
  if (prop.name === "children") return null;
  const type = prop.type ?? "unknown";
  const defaultValue = prop.defaultValue;
  if (/boolean/.test(type)) return defaultValue === "false" ? ` ${prop.name}={false}` : ` ${prop.name}`;
  if (/=>|Handler|Callback|\bfunction\b/i.test(type)) return ` ${prop.name}={() => {}}`;
  if (/\[\]|Array<|ReadonlyArray</.test(type)) return ` ${prop.name}={[]}`;
  if (/\bnumber\b/.test(type) || /^\s*\d+(\s*\|\s*\d+)*\s*$/.test(type)) {
    return ` ${prop.name}={${defaultValue ?? type.match(/\d+/)?.[0] ?? "0"}}`;
  }
  if (/string|ReactNode|^["']/.test(type) || firstStringLiteral(type)) {
    return ` ${prop.name}=${JSON.stringify(defaultValue ?? firstStringLiteral(type) ?? "value")}`;
  }
  return ` ${prop.name}={${defaultValue ?? "undefined"}}`;
};

export const addRequiredPropsToSnippet = (
  snippet: string,
  props: LiveCodeRegistryProp[] = [],
): string => {
  const insertionOffset = getPropInsertionOffset(snippet);
  const existingProps = new Set(getOpeningTagPropNames(snippet, insertionOffset));
  const assignments = props
    .filter((prop) => prop.required && prop.name !== "children" && !existingProps.has(prop.name))
    .map(createPropAssignment)
    .filter((assignment): assignment is string => Boolean(assignment))
    .join("");

  return assignments
    ? `${snippet.slice(0, insertionOffset)}${assignments}${snippet.slice(insertionOffset)}`
    : snippet;
};

const isCheckpoint = (value: unknown): value is LiveCodeCheckpoint => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LiveCodeCheckpoint>;
  return typeof item.id === "string" && typeof item.label === "string" &&
    typeof item.code === "string" && Number.isFinite(item.cursor) &&
    Number.isFinite(item.createdAt);
};

export const parseSandboxStoragePayload = (
  value: unknown,
  checkpointInterval = DEFAULT_CHECKPOINT_INTERVAL,
  historyLimit = DEFAULT_HISTORY_LIMIT,
): LiveCodeSandboxStorage | null => {
  let parsed: Record<string, unknown>;
  try {
    const candidate = typeof value === "string" ? JSON.parse(value) : value;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    parsed = candidate as Record<string, unknown>;
  } catch {
    return null;
  }

  if (typeof parsed.version !== "number" || ![1, 2, 3].includes(parsed.version) ||
    typeof parsed.code !== "string") return null;
  const effectiveLimit = normalizeHistoryLimit(
    parsed.version === 3 && typeof parsed.historyLimit === "number"
      ? parsed.historyLimit
      : historyLimit,
  );
  const code = parsed.code;
  return {
    version: 3,
    code,
    cursor: clampCursor(Number.isFinite(parsed.cursor) ? Number(parsed.cursor) : code.length, code),
    lastSuccessfulCode: typeof parsed.lastSuccessfulCode === "string" ? parsed.lastSuccessfulCode : code,
    checkpoints: Array.isArray(parsed.checkpoints)
      ? parsed.checkpoints.filter(isCheckpoint).map((checkpoint) => ({
        ...checkpoint,
        cursor: clampCursor(checkpoint.cursor, checkpoint.code),
      })).slice(-effectiveLimit)
      : [],
    checkpointInterval: normalizeCheckpointInterval(
      parsed.version === 3 && typeof parsed.checkpointInterval === "number"
        ? parsed.checkpointInterval
        : checkpointInterval,
    ),
    historyLimit: effectiveLimit,
    insertionActionCount:
      parsed.version === 3 && typeof parsed.insertionActionCount === "number" &&
        Number.isFinite(parsed.insertionActionCount)
        ? Math.max(0, Math.floor(parsed.insertionActionCount))
        : 0,
  };
};

export const safeParseStorage = (
  raw: string | null,
  initialCode = DEFAULT_CODE,
  checkpointInterval = DEFAULT_CHECKPOINT_INTERVAL,
  historyLimit = DEFAULT_HISTORY_LIMIT,
): LiveCodeSandboxStorage => {
  if (!raw) return createDefaultStorage(initialCode, checkpointInterval, historyLimit);
  return parseSandboxStoragePayload(raw, checkpointInterval, historyLimit)
    ?? createDefaultStorage(initialCode, checkpointInterval, historyLimit);
};

const getBrowserStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const readSandboxStorage = (
  storageKey: string,
  initialCode = DEFAULT_CODE,
  checkpointInterval = DEFAULT_CHECKPOINT_INTERVAL,
  historyLimit = DEFAULT_HISTORY_LIMIT,
): SandboxStorageReadResult => {
  const storage = getBrowserStorage();
  if (!storage) {
    return {
      outcome: "unavailable",
      state: createDefaultStorage(initialCode, checkpointInterval, historyLimit),
    };
  }
  try {
    const raw = storage.getItem(storageKey);
    if (raw === null) {
      return {
        outcome: "empty",
        state: createDefaultStorage(initialCode, checkpointInterval, historyLimit),
      };
    }
    const state = parseSandboxStoragePayload(raw, checkpointInterval, historyLimit);
    return state
      ? { outcome: "loaded", state }
      : {
        outcome: "invalid",
        state: createDefaultStorage(initialCode, checkpointInterval, historyLimit),
      };
  } catch {
    return {
      outcome: "unavailable",
      state: createDefaultStorage(initialCode, checkpointInterval, historyLimit),
    };
  }
};

const isQuotaError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; name?: unknown };
  return candidate.name === "QuotaExceededError" || candidate.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    candidate.code === 22 || candidate.code === 1014;
};

export const writeSandboxStorage = (
  storageKey: string,
  state: LiveCodeSandboxStorage,
): SandboxStorageWriteResult => {
  const storage = getBrowserStorage();
  if (!storage) return { ok: false, reason: "unavailable" };
  try {
    storage.setItem(storageKey, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "quota" : "unknown" };
  }
};

export const validateJsx = (code: string): string | null => {
  const trimmed = code.trim();
  if (!trimmed) return null;
  return treeHasErrors(trimmed)
    ? "JSX appears incomplete: angle brackets are unbalanced."
    : null;
};

export const getPreviewCode = (code: string): string => {
  const trimmed = code.trim();
  return trimmed ? `<>${trimmed}</>` : "null";
};

export const addStoryToSandboxStorage = ({
  channel,
  code,
  storageKey,
  storyName,
  checkpointInterval,
  historyLimit,
}: AddStoryToSandboxInput): LiveCodeSandboxStorage => {
  if (typeof window === "undefined" || !code.trim()) {
    throw new Error("Story source is unavailable.");
  }
  const readResult = readSandboxStorage(
    storageKey,
    DEFAULT_CODE,
    checkpointInterval,
    historyLimit,
  );
  if (readResult.outcome === "unavailable") throw new Error("Sandbox storage is unavailable.");
  const current = readResult.state;
  const inserted = insertSnippetSafely(current.code, code, current.cursor);
  if (!inserted) throw new Error("No safe top-level insertion point is available.");
  const next: LiveCodeSandboxStorage = {
    ...current,
    code: inserted.code,
    cursor: inserted.cursor,
    lastSuccessfulCode: current.lastSuccessfulCode,
    insertionActionCount: 0,
    checkpoints: addCheckpoint(current.checkpoints, {
      label: `Added ${storyName}`,
      code: inserted.code,
      cursor: inserted.cursor,
    }, current.historyLimit),
  };
  const writeResult = writeSandboxStorage(storageKey, next);
  if (!writeResult.ok) {
    throw new Error(writeResult.reason === "quota"
      ? "Sandbox storage quota was exceeded."
      : "Sandbox storage is unavailable.");
  }
  window.dispatchEvent(new CustomEvent(`live-code-sandbox:${storageKey}`, { detail: next }));
  channel?.emit(getLiveCodeSandboxSyncEvent(storageKey), next);
  return next;
};
