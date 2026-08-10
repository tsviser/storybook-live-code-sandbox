import type { LiveCodeSandboxChannel } from "./types";

export const LIVE_CODE_SANDBOX_OPEN_EVENT = "live-code-sandbox/open";
export const getLiveCodeSandboxSyncEvent = (storageKey: string) => `live-code-sandbox/sync:${storageKey}`;

export function requestLiveCodeSandboxOpen(
  channel?: LiveCodeSandboxChannel,
  storyId = "tools-live-sandbox--workspace",
) {
  const detail = { storyId };
  channel?.emit(LIVE_CODE_SANDBOX_OPEN_EVENT, detail);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LIVE_CODE_SANDBOX_OPEN_EVENT, { detail }));
  }
}
