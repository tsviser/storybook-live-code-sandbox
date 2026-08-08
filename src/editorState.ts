import type { LiveCodeSandboxStorage } from "./types";

export const DEFAULT_CODE = `<div style={{ display: "grid", gap: 12 }}>
  {/* Insert components from the registry */}
</div>`;

const getInitialCursor = (code: string): number => {
  const closingWrapper = code.lastIndexOf("</div>");
  return closingWrapper >= 0 ? closingWrapper : code.length;
};

export const createDefaultStorage = (initialCode = DEFAULT_CODE): LiveCodeSandboxStorage => ({
  version: 1,
  code: initialCode,
  cursor: getInitialCursor(initialCode),
  open: false,
  layout: "drawer",
  lastSuccessfulCode: initialCode,
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

export const safeParseStorage = (
  raw: string | null,
  initialCode = DEFAULT_CODE,
): LiveCodeSandboxStorage => {
  if (!raw) {
    return createDefaultStorage(initialCode);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LiveCodeSandboxStorage>;
    if (parsed.version !== 1 || typeof parsed.code !== "string") {
      return createDefaultStorage(initialCode);
    }

    const lastSuccessfulCode =
      typeof parsed.lastSuccessfulCode === "string" ? parsed.lastSuccessfulCode : parsed.code;

    return {
      version: 1,
      code: parsed.code,
      cursor: clampCursor(typeof parsed.cursor === "number" ? parsed.cursor : parsed.code.length, parsed.code),
      open: Boolean(parsed.open),
      layout: parsed.layout === "fullscreen" ? "fullscreen" : "drawer",
      lastSuccessfulCode,
    };
  } catch {
    return createDefaultStorage(initialCode);
  }
};

export const validateJsx = (code: string): string | null => {
  const trimmed = code.trim();
  if (!trimmed) {
    return "Composition is empty.";
  }

  const openAngles = (trimmed.match(/</g) ?? []).length;
  const closeAngles = (trimmed.match(/>/g) ?? []).length;
  if (openAngles !== closeAngles) {
    return "JSX appears incomplete: angle brackets are unbalanced.";
  }

  return null;
};
