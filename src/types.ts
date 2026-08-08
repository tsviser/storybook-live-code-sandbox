import type { ComponentType, ReactNode } from "react";

export type LiveCodeScope = Record<string, unknown>;

export type LiveCodeRegistryProp = {
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  description?: string;
};

export type LiveCodeRegistryExample = {
  name: string;
  code: string;
  description?: string;
};

export type LiveCodeRegistryItem = {
  name: string;
  importPath?: string;
  description?: string;
  category?: string;
  examples: LiveCodeRegistryExample[];
  props?: LiveCodeRegistryProp[];
  metadata?: Record<string, unknown>;
};

export type LiveCodeSandboxStorage = {
  version: 1;
  code: string;
  cursor: number;
  open: boolean;
  layout: "drawer" | "fullscreen";
  lastSuccessfulCode: string;
};

export type LiveCodeSandboxConfig = {
  scope: LiveCodeScope;
  registry: LiveCodeRegistryItem[];
  storageKey: string;
  initialCode?: string;
};

export type LiveCodeSandboxProviderProps = LiveCodeSandboxConfig & {
  children: ReactNode;
};

export type StorybookStoryComponent = ComponentType<Record<string, unknown>>;
