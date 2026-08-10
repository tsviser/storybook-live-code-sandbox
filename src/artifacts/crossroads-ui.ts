import type { LiveCodeSandboxUIAdapter } from "../types";

export function createCrossroadsUIArtifact(
  adapter: LiveCodeSandboxUIAdapter,
): LiveCodeSandboxUIAdapter {
  return {
    ...adapter,
    name: adapter.name ?? "crossroads-ui",
    rootClassName: ["sb-live-code-sandbox--crossroads", adapter.rootClassName]
      .filter(Boolean)
      .join(" "),
  };
}
