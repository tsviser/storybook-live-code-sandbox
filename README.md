# storybook-live-code-sandbox

`storybook-live-code-sandbox` adds a persistent composition workspace inside the Storybook preview iframe. It is separate from `storybook-live-code` and depends on it as a package peer for the live-code ecosystem, while owning the sandbox-specific editor, persistence, registry, and preview workspace.

The sandbox renders in the preview iframe, not the manager iframe. This is required because Storybook manager and preview frames can only exchange serializable data; live React component references and providers must stay in the preview tree.

## Relationship To `storybook-live-code`

`storybook-live-code@0.3.3` currently exports complete block components and package CSS, not lower-level CodeMirror editor/session primitives. This package keeps `storybook-live-code` as a real dependency but owns the sandbox editor integration instead of importing private internals. If `storybook-live-code` later exports reusable editor primitives, the sandbox should consume those public APIs.

## Install

```sh
npm install storybook-live-code-sandbox storybook-live-code
```

For local development before publishing:

```json
{
  "devDependencies": {
    "storybook-live-code-sandbox": "file:../storybook-live-code-sandbox"
  }
}
```

## Storybook Usage

In `.storybook/preview.tsx`:

```tsx
import type { Preview } from "@storybook/react-vite";
import { withLiveCodeSandbox } from "storybook-live-code-sandbox/preview";
import "storybook-live-code-sandbox/styles.css";
import { liveCodeScope } from "../src/components/storybookLiveCodeScope";
import { liveCodeRegistry } from "../src/components/storybookLiveCodeRegistry";

const preview: Preview = {
  decorators: [
    withLiveCodeSandbox({
      scope: liveCodeScope,
      registry: liveCodeRegistry,
      storageKey: "crossroads-ui-live-code-sandbox",
    }),
  ],
};

export default preview;
```

If your design system provider is also mounted in Storybook preview decorators, keep the sandbox inside that preview-side provider tree so composed components inherit the same theme, direction, CSS variables, portal roots, and context as the active story.

## Public Configuration API

### `scope`

`Record<string, unknown>`

The runtime names available to `react-live` when evaluating the composition. This should be a broad name-to-component map, for example:

```ts
export const liveCodeScope = {
  Button,
  Stack,
  Surface,
};
```

### `registry`

`LiveCodeRegistryItem[]`

The selectable component list shown in the sandbox. Consumers own this data. The sandbox does not know about any specific design system.

```ts
export type LiveCodeRegistryItem = {
  name: string;
  importPath?: string;
  description?: string;
  category?: string;
  examples: Array<{
    name: string;
    code: string;
    description?: string;
  }>;
  props?: Array<{
    name: string;
    type?: string;
    required?: boolean;
    defaultValue?: string;
    description?: string;
  }>;
  metadata?: Record<string, unknown>;
};
```

The first example is used for the current insert action. Future autocomplete, linting, export, and AI composition features can use the same registry metadata.

### `storageKey`

`string`

The `localStorage` key for the workspace. The sandbox persists:

- current buffer
- cursor position
- open state
- drawer/fullscreen layout
- last successful code

### `initialCode`

`string | undefined`

Optional starting composition used when no saved state exists or when the user resets the workspace.

## Included Behavior

- One CodeMirror editor instance is created and reused across drawer and fullscreen modes.
- Component snippets insert at the active cursor or replace the active selection.
- `Tab` indents inside the editor.
- Invalid/incomplete JSX shows diagnostics and keeps rendering the last successful composition.
- The saved workspace restores after reloads and story navigation.

## Out Of Scope For This Package Version

- Prop-aware autocomplete and linting.
- Share links.
- AI composition.
- Exporting generated `.stories.tsx` files.

## Release Process

1. Run `npm run release:check`.
2. Install the resulting package in a consuming Storybook and manually test the editor, insertion, preview, persistence, drawer, and fullscreen workflows.
3. Publish to npm only after the manual test is explicitly approved.
