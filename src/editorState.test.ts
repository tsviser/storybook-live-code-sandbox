import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCheckpoint,
  addStoryToSandboxStorage,
  createDefaultStorage,
  createPropAssignment,
  getStringLiteralOptions,
  addRequiredPropsToSnippet,
  getOpeningTagPropNames,
  getPreviewCode,
  getPropInsertionOffset,
  getSafeTopLevelInsertionOffset,
  insertSnippet,
  insertSnippetSafely,
  safeParseStorage,
  validateJsx,
} from "./editorState";

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

describe("safe component insertion", () => {
  it("keeps a top-level cursor and inserts between render nodes", () => {
    const code = "<Before /><After />";
    expect(insertSnippetSafely(code, "<Button />", 10)?.code).toBe(
      "<Before />\n<Button />\n<After />",
    );
  });

  it("moves a cursor inside nested JSX after its containing top-level node", () => {
    const code = "<Card><Button>Save</Button></Card><After />";
    const cursor = code.indexOf("Save") + 2;
    const result = insertSnippetSafely(code, "<Divider />", cursor);

    expect(getSafeTopLevelInsertionOffset(code, cursor)).toBe(code.indexOf("<After"));
    expect(result?.code).toBe("<Card><Button>Save</Button></Card>\n<Divider />\n<After />");
  });

  it("refuses insertion when the existing render source cannot be parsed safely", () => {
    expect(insertSnippetSafely("<Card>", "<Button />", 3)).toBeNull();
  });
});

describe("storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("restores version 3 state", () => {
    const stored = {
      version: 3 as const,
      code: "<Button />",
      cursor: 5,
      lastSuccessfulCode: "<Button />",
      checkpoints: [],
      checkpointInterval: 3,
      historyLimit: 12,
      insertionActionCount: 2,
    };

    expect(safeParseStorage(JSON.stringify(stored))).toEqual(stored);
  });

  it("falls back on invalid storage", () => {
    expect(safeParseStorage("{")).toEqual(createDefaultStorage());
  });

  it.each([1, 2])("migrates version %s storage without losing the composition", (version) => {
    expect(safeParseStorage(JSON.stringify({
      version,
      code: "<Button />",
      cursor: 4,
      open: true,
      layout: "drawer",
      lastSuccessfulCode: "<Button />",
      checkpoints: [{ id: "old", label: "Old", code: "<Button />", cursor: 4, createdAt: 1 }],
    }))).toMatchObject({
      version: 3,
      code: "<Button />",
      cursor: 4,
      checkpointInterval: 5,
      historyLimit: 8,
      insertionActionCount: 0,
      checkpoints: [{ id: "old" }],
    });
  });

  it("adds exact Storybook source at the next safe boundary and creates a checkpoint", () => {
    const storageKey = "source-transfer";
    window.localStorage.setItem(storageKey, JSON.stringify({
      ...createDefaultStorage("<Before /><After />"),
      cursor: 10,
    }));
    const listener = vi.fn();
    window.addEventListener(`live-code-sandbox:${storageKey}`, listener);

    const source = '<Button variant="quiet">Exact source</Button>';
    const result = addStoryToSandboxStorage({ storageKey, code: source, storyName: "Quiet" });

    expect(result.code).toBe(`<Before />\n${source}\n<After />`);
    const stored = safeParseStorage(window.localStorage.getItem(storageKey));
    expect(stored.code).toBe(`<Before />\n${source}\n<After />`);
    expect(stored.checkpoints.at(-1)?.label).toBe("Added Quiet");
    expect(stored.insertionActionCount).toBe(0);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("rejects missing Storybook source without changing the workspace", () => {
    const storageKey = "missing-source";
    const original = createDefaultStorage("<Before />");
    window.localStorage.setItem(storageKey, JSON.stringify(original));

    expect(() => addStoryToSandboxStorage({ storageKey, code: "", storyName: "Missing" })).toThrow(
      "Story source is unavailable",
    );
    expect(safeParseStorage(window.localStorage.getItem(storageKey))).toEqual(original);
  });

  it("reports an unavailable storage write", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "QuotaExceededError");
    });

    expect(() => addStoryToSandboxStorage({
      storageKey: "blocked-storage",
      code: "<Button />",
      storyName: "Blocked",
    })).toThrow("Storage unavailable");

    setItem.mockRestore();
  });
});

describe("checkpoints", () => {
  it("honors a custom retention limit", () => {
    const checkpoints = Array.from({ length: 5 }, (_, index) => index).reduce(
      (current, index) => addCheckpoint(current, {
        label: `Point ${index}`,
        code: `<div>${index}</div>`,
        cursor: index,
      }, 3),
      [] as ReturnType<typeof addCheckpoint>,
    );

    expect(checkpoints.map((checkpoint) => checkpoint.label)).toEqual(["Point 2", "Point 3", "Point 4"]);
  });
});

describe("prop suggestions", () => {
  it("positions suggestions inside the first component opening tag", () => {
    expect(getPropInsertionOffset("<Button>Save</Button>")).toBe(7);
    expect(getPropInsertionOffset("<Divider />")).toBe(8);
  });

  it("creates typed JSX prop assignments", () => {
    expect(createPropAssignment({ name: "disabled", type: "boolean" })).toBe(" disabled");
    expect(createPropAssignment({
      name: "variant",
      type: '"primary" | "secondary"',
      defaultValue: "primary",
    })).toBe(' variant="primary"');
    expect(createPropAssignment({ name: "onClick", type: "() => void" })).toBe(
      " onClick={() => {}}",
    );
  });

  it("extracts available values from string-union props", () => {
    expect(getStringLiteralOptions('"primary" | "secondary" | "danger"')).toEqual([
      "primary",
      "secondary",
      "danger",
    ]);
    expect(getStringLiteralOptions("ButtonBaseColor")).toEqual([]);
  });

  it("adds missing required props without replacing authored values or children", () => {
    expect(addRequiredPropsToSnippet('<Button label="Save">Continue</Button>', [
      { name: "label", required: true, type: "ReactNode" },
      { name: "aria-label", required: true, type: "string", defaultValue: "Save changes" },
      { name: "children", required: true, type: "ReactNode" },
    ])).toBe('<Button label="Save" aria-label="Save changes">Continue</Button>');
  });

  it("finds props already present before the insertion cursor", () => {
    const code = '<Button color="primary" disabled>Save</Button>';
    expect(getOpeningTagPropNames(code, code.indexOf(">"))).toEqual(["color", "disabled"]);
  });
});

describe("preview source", () => {
  it("keeps multiple top-level snippets untouched in storage and wraps only evaluation", () => {
    expect(getPreviewCode("<Button /><Card />")).toBe("<><Button /><Card /></>");
    expect(getPreviewCode("")).toBe("null");
  });

  it("does not warn for empty JSX", () => {
    expect(validateJsx("")).toBeNull();
    expect(validateJsx("<Button")).toMatch("unbalanced");
  });
});
