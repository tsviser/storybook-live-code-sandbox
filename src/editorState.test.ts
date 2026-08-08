import { describe, expect, it } from "vitest";
import { createDefaultStorage, insertSnippet, safeParseStorage, validateJsx } from "./editorState";

describe("insertSnippet", () => {
  it("inserts at a cursor", () => {
    expect(insertSnippet("<A />", "<B />", { from: 3 })).toEqual({
      code: "<A <B />/>",
      cursor: 8,
    });
  });

  it("replaces a selection", () => {
    expect(insertSnippet("<A><Old /></A>", "<New />", { from: 3, to: 10 })).toEqual({
      code: "<A><New /></A>",
      cursor: 10,
    });
  });
});

describe("storage", () => {
  it("restores persisted state", () => {
    const stored = {
      version: 1,
      code: "<Button />",
      cursor: 5,
      open: true,
      layout: "fullscreen",
      lastSuccessfulCode: "<Button />",
    };

    expect(safeParseStorage(JSON.stringify(stored))).toEqual(stored);
  });

  it("falls back on invalid storage", () => {
    expect(safeParseStorage("{")).toEqual(createDefaultStorage());
  });
});

describe("validateJsx", () => {
  it("reports incomplete JSX", () => {
    expect(validateJsx("<Button")).toMatch("unbalanced");
  });

  it("accepts balanced JSX", () => {
    expect(validateJsx("<Button />")).toBeNull();
  });
});
