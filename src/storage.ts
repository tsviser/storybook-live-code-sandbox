import type { AddStoryToSandboxInput, LiveCodeSandboxStorage } from "./types";

/**
 * Docs-side entry point for transferring a story's displayed source into the
 * sandbox workspace.
 *
 * The JSX parser used to find a safe top-level insertion point is loaded on
 * demand rather than at module scope, so importing this subpath from a Docs
 * page does not pull the CodeMirror language bundle into the page's initial
 * load. The parser is fetched the first time a story is actually transferred.
 *
 * Rejects with the same errors the synchronous implementation throws: empty
 * source, unavailable storage, or no safe insertion point. The workspace is
 * left unchanged in every rejection case.
 */
export async function addStoryToSandboxStorage(
  input: AddStoryToSandboxInput,
): Promise<LiveCodeSandboxStorage> {
  const { addStoryToSandboxStorage: transfer } = await import("./editorState");
  return transfer(input);
}

export type { AddStoryToSandboxInput, LiveCodeSandboxStorage } from "./types";
