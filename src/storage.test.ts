import { beforeEach, describe, expect, it } from "vitest";
import { addStoryToSandboxStorage } from "./storage";
import { safeParseStorage } from "./editorState";

const STORAGE_KEY = "storage-entry-test";

describe("storage subpath entry", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("transfers story source into the persisted workspace", async () => {
    const next = await addStoryToSandboxStorage({
      code: "<Button>Save</Button>",
      storageKey: STORAGE_KEY,
      storyName: "Primary",
    });

    expect(next.code).toContain("<Button>Save</Button>");
    expect(next.lastSuccessfulCode).toBe("");
    expect(next.checkpoints.at(-1)?.label).toBe("Added Primary");
    expect(safeParseStorage(window.localStorage.getItem(STORAGE_KEY)).code).toBe(next.code);
  });

  it("rejects empty source without changing the workspace", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 3, code: "<Existing />" }),
    );

    await expect(
      addStoryToSandboxStorage({ code: "   ", storageKey: STORAGE_KEY, storyName: "Empty" }),
    ).rejects.toThrow("Story source is unavailable.");

    expect(safeParseStorage(window.localStorage.getItem(STORAGE_KEY)).code).toBe("<Existing />");
  });

  it("emits a storage-key scoped channel event", async () => {
    const emitted: Array<{ event: string; payload: unknown }> = [];
    await addStoryToSandboxStorage({
      channel: { emit: (event, payload) => emitted.push({ event, payload }) },
      code: "<Card />",
      storageKey: STORAGE_KEY,
      storyName: "Card story",
    });

    expect(emitted.map((entry) => entry.event)).toEqual([
      `live-code-sandbox/sync:${STORAGE_KEY}`,
    ]);
  });
});
