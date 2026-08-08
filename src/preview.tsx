import type * as React from "react";
import { LiveCodeSandboxProvider } from "./LiveCodeSandboxProvider";
import type { LiveCodeSandboxConfig } from "./types";

type StorybookDecorator = (Story: React.ComponentType) => React.ReactElement;

export const withLiveCodeSandbox = (config: LiveCodeSandboxConfig): StorybookDecorator => {
  return (Story) => (
    <LiveCodeSandboxProvider {...config}>
      <Story />
    </LiveCodeSandboxProvider>
  );
};

export { LiveCodeSandboxProvider };
export type {
  LiveCodeRegistryExample,
  LiveCodeRegistryItem,
  LiveCodeRegistryProp,
  LiveCodeSandboxConfig,
  LiveCodeScope,
} from "./types";
