import type { ComponentType, ReactNode } from "react";

export type LiveCodeScope = Record<string, unknown>;
export type LiveCodeSandboxChannel = {
  emit: (eventName: string, payload?: unknown) => void;
  on?: (eventName: string, listener: (payload: unknown) => void) => void;
  off?: (eventName: string, listener: (payload: unknown) => void) => void;
};
export type LiveCodePropImportance = "high" | "normal" | "advanced";

export type LiveCodeRegistryProp = {
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  description?: string;
  importance?: LiveCodePropImportance;
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
  disabledReason?: string;
  sandboxVisible?: boolean;
  examples: LiveCodeRegistryExample[];
  props?: LiveCodeRegistryProp[];
  metadata?: Record<string, unknown>;
};

export type LiveCodeCheckpoint = {
  id: string;
  label: string;
  code: string;
  cursor: number;
  createdAt: number;
};

export type LiveCodeSandboxStorage = {
  version: 3;
  code: string;
  cursor: number;
  lastSuccessfulCode: string;
  checkpoints: LiveCodeCheckpoint[];
  checkpointInterval: number;
  historyLimit: number;
  insertionActionCount: number;
};

export type SandboxButtonProps = {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  icon?: "close" | "components" | "copy" | "dock-left" | "dock-right" | "exit-fullscreen" | "fullscreen" | "layout-horizontal" | "layout-vertical" | "minimize" | "pin" | "pin-off" | "reset" | "settings" | "undo" | "window";
  onClick: () => void;
  tone?: "default" | "danger";
};

export type SandboxSurfaceProps = {
  ariaLabel: string;
  children: ReactNode;
  className: string;
  fullscreen: boolean;
  surfaceRef: React.RefObject<HTMLElement | null>;
};

export type SandboxChipProps = {
  label: ReactNode;
  ariaLabel?: string;
  className?: string;
  color?: "primary" | "secondary";
  deleteLabel?: string;
  density?: "default" | "compact";
  disabled?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  pressed?: boolean;
  title?: string;
};

export type SandboxFieldProps = {
  ariaLabel: string;
  className?: string;
  max?: number;
  min?: number;
  onChange: (value: string) => void;
  onOptionSelect?: (value: string) => void;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  type: "number" | "search";
  value: string | number;
};

export type SandboxTabsProps = {
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
  tabs: Array<{
    disabled?: boolean;
    id?: string;
    label: string;
    panelId?: string;
    value: string;
  }>;
  value: string;
};

export type SandboxDialogProps = {
  cancelLabel: string;
  children: ReactNode;
  confirmLabel: string;
  description: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: ReactNode;
};

export type SandboxNotificationProps = {
  actionLabel?: string;
  message: ReactNode;
  onAction?: () => void;
  onDismiss: () => void;
  tone: "status" | "warning";
};

export type SandboxWorkspaceProps = {
  editor: ReactNode;
  managed: boolean;
  orientation: "horizontal" | "vertical";
  preview: ReactNode;
  registry: ReactNode;
};

export type LiveCodeSandboxUIAdapter = {
  name?: string;
  rootClassName?: string;
  renderButton?: (props: SandboxButtonProps) => ReactNode;
  renderChip?: (props: SandboxChipProps) => ReactNode;
  renderField?: (props: SandboxFieldProps) => ReactNode;
  renderTabs?: (props: SandboxTabsProps) => ReactNode;
  renderDialog?: (props: SandboxDialogProps) => ReactNode;
  renderNotification?: (props: SandboxNotificationProps) => ReactNode;
  renderSurface?: (props: SandboxSurfaceProps) => ReactNode;
  renderWorkspace?: (props: SandboxWorkspaceProps) => ReactNode;
};

export type LiveCodeSandboxConfig = {
  channel?: LiveCodeSandboxChannel;
  scope: LiveCodeScope;
  registry: LiveCodeRegistryItem[];
  storageKey: string;
  initialCode?: string;
  checkpointInterval?: number;
  historyLimit?: number;
  managed?: boolean;
  forceRegistryPinned?: boolean;
  hideFullscreenAction?: boolean;
  hideWorkspaceOrientationAction?: boolean;
  onWorkspaceOrientationChange?: (orientation: "horizontal" | "vertical") => void;
  toolbarActions?: ReactNode;
  ui?: LiveCodeSandboxUIAdapter;
  workspaceOrientation?: "horizontal" | "vertical";
};

export type LiveCodeSandboxProviderProps = LiveCodeSandboxConfig & {
  children?: ReactNode;
};

export type AddStoryToSandboxInput = {
  channel?: LiveCodeSandboxChannel;
  code: string;
  storageKey: string;
  storyName: string;
  checkpointInterval?: number;
  historyLimit?: number;
};

export type StorybookStoryComponent = ComponentType<Record<string, unknown>>;
