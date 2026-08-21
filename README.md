# storybook-live-code-sandbox

`storybook-live-code-sandbox` provides one persistent composition workspace for Storybook. Stories send their displayed source to a dedicated sandbox story; individual previews do not mount drawers, launchers, or sandbox providers.

The package is design-system agnostic. It ships core behavior, a default artifact, and a Crossroads UI adapter contract without depending on Crossroads UI.

## Install

```sh
npm install storybook-live-code-sandbox
```

## Try the Example

The repository includes a runnable Storybook example with local demo components:

```sh
npm install
npm --prefix examples/basic-storybook install
npm --prefix examples/basic-storybook run storybook
```

The example intentionally links `file:../..`, so repository development and
browser verification exercise the current checkout instead of the last
published npm version.

Open the `Tools/Live Sandbox` story, insert components from the sidebar, paste JSX, or copy examples from the demo stories. See the [quick-start guide](https://github.com/tsviser/storybook-live-code-sandbox/blob/main/docs/quick-start.md) and [basic Storybook example](https://github.com/tsviser/storybook-live-code-sandbox/tree/main/examples/basic-storybook) in GitHub.

For governed, read-only discovery by the Crossroads Agent System, see the [integration contract](./docs/CROSSROADS_AGENT_INTEGRATION.md).

![Basic Storybook example sandbox](https://raw.githubusercontent.com/tsviser/storybook-live-code-sandbox/main/examples/images/Sandbox_sampleApp-Screenshot.jpeg)

## Dedicated Sandbox Story

Create one full-screen Storybook story and keep live component references in the preview runtime:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LiveCodeSandboxProvider } from "storybook-live-code-sandbox";
import { addons } from "storybook/preview-api";
import "storybook-live-code-sandbox/styles.css";
import { liveCodeRegistry } from "../src/liveCodeRegistry";
import { liveCodeScope } from "../src/liveCodeScope";

function Workspace() {
  return (
    <LiveCodeSandboxProvider
      channel={addons.getChannel()}
      checkpointInterval={5}
      historyLimit={8}
      registry={liveCodeRegistry}
      scope={liveCodeScope}
      storageKey="my-library-live-code-sandbox"
    />
  );
}

const meta = {
  title: "Tools/Live Sandbox",
  parameters: { layout: "fullscreen" },
  render: () => <Workspace />
} satisfies Meta;

export default meta;
export const Sandbox: StoryObj<typeof meta> = {};
```

## Add Story Source

Use the exact source string already resolved by Storybook's Docs `Canvas` and pass it unchanged:

```ts
import { addStoryToSandboxStorage } from "storybook-live-code-sandbox/storage";

await addStoryToSandboxStorage({
  channel: addons.getChannel(),
  code: sourceProps.code,
  storageKey: "my-library-live-code-sandbox",
  storyName: story.name
});
```

The helper inserts at the saved cursor, creates an immediate `Added <story>` checkpoint, and broadcasts a storage-key-scoped synchronization event. It updates draft code without executing it, and it does not navigate to or open the sandbox. Open the sandbox and activate **Run** to update the preview. Empty source, unavailable storage, or the absence of a safe top-level insertion point rejects without changing the workspace.

The `storage` subpath is asynchronous because it loads the JSX parser on first use instead of at module scope. Importing it into a Docs page costs under 1 kB; the parser arrives only when a story is actually transferred. The synchronous export from the package root is unchanged and stays appropriate inside the sandbox workspace, which already loads the editor.

Manager links can navigate to the shared host in response to the exported event:

```ts
import { LIVE_CODE_SANDBOX_OPEN_EVENT } from "storybook-live-code-sandbox/events";
```

Preview-side links can request that navigation with `requestLiveCodeSandboxOpen(channel)`.

## Registry

```ts
export type LiveCodeRegistryItem = {
  name: string;
  importPath?: string;
  description?: string;
  category?: string;
  disabledReason?: string;
  sandboxVisible?: boolean;
  examples: Array<{ name: string; code: string; description?: string }>;
  props?: Array<{
    name: string;
    type?: string;
    required?: boolean;
    defaultValue?: string;
    description?: string;
    importance?: "high" | "normal" | "advanced";
  }>;
  metadata?: Record<string, unknown>;
};
```

Only entries with `sandboxVisible: true` appear. Categories create single-select filters; categories with fewer than three visible components are combined under `Other`. Props are ordered required, high, normal, advanced, then alphabetically.

## Configuration

- `scope`: names available to `react-live` while evaluating compositions.
- `registry`: visual components, insertion examples, availability, and prop metadata.
- `storageKey`: namespace for persisted state and synchronization events.
- `initialCode`: optional initial content; the default is empty.
- `checkpointInterval`: component/prop insertions per automatic checkpoint. Default `5`; `0` disables interval checkpoints.
- `historyLimit`: retained checkpoints. Default `8`; constrained to `1-50`.
- `channel`: optional Storybook-compatible channel for cross-frame synchronization.
- `managed`: enables host-managed workspace behavior.
- `workspaceOrientation`: current managed Code and Canvas orientation.
- `onWorkspaceOrientationChange`: changes managed orientation; the Layout action is shown only when this callback is provided.
- `hideFullscreenAction` and `hideWorkspaceOrientationAction`: hide the corresponding toolbar actions.
- `toolbarActions`: additional host-owned toolbar content.
- `ui`: optional `LiveCodeSandboxUIAdapter`.

Typing checkpoints on blur, paste checkpoints immediately, and story-source transfers checkpoint immediately. Reset remains in the dedicated view and clears code, history, undo/redo state, insertion progress, selection, and pending typing.

## Execution Model

Editor content is draft code. Typing, pasting, registry insertion, prop insertion, checkpoint restoration, and Storybook source transfer do not execute code automatically. Activate **Run** to validate and evaluate the current draft. A compile or runtime failure leaves the previous successful preview in place and reports the error.

The preview runs through `react-live` in the Storybook preview page. It inherits that page's providers and runtime context, but it is not a security boundary. Only expose trusted runtime values through `scope`, and do not use the sandbox to execute untrusted code.

## UI Artifacts

The default artifact uses the package's accessible fallback controls:

```ts
import { defaultLiveCodeSandboxArtifact } from "storybook-live-code-sandbox/artifacts/default";
```

The fallback dialogs trap focus, close with Escape, and return focus to the
control that opened them. Fallback tabs use roving focus with arrow, Home, and
End keys and expose their associated panels. Component search offers the
registered component names as native suggestions. The package styles use
logical layout properties and provide system dark-mode and forced-color
defaults; adapters remain responsible for equivalent behavior in replacement
controls.

Design systems can supply render functions for buttons, chips, fields, tabs, dialogs, notifications, and the root surface. The Crossroads export applies the artifact identity while receiving components through an adapter, avoiding a package dependency cycle:

```ts
import { createCrossroadsUIArtifact } from "storybook-live-code-sandbox/artifacts/crossroads-ui";

export const artifact = createCrossroadsUIArtifact(crossroadsAdapter);
```

## Persistence

Storage version 3 persists code, cursor, last successful preview code, checkpoints, checkpoint interval, history retention, and insertion progress. Existing version 1 and version 2 data is migrated when read. Browser storage events and scoped channel events keep Docs frames, tabs, and the dedicated preview synchronized.

Storage reads and writes degrade safely when browser storage is blocked or full. Frequent edits are persisted after a short debounce and the latest state is flushed when the page is hidden. Invalid browser or Storybook channel payloads are ignored instead of resetting the workspace.

Synchronization uses a last-arriving-valid-state-wins policy for the complete workspace. It does not merge concurrent edits. Use a distinct `storageKey` for independent workspaces; tabs and frames that share a key intentionally share one composition and may replace each other's unpersisted drafts.

## Release Process

For a development checkout, run `npm run hooks:install` once. The tracked pre-push hook checks
artifact metadata and workflow action pins before running the full release validation.

Install the pinned browser engines once with
`npx playwright install chromium firefox webkit`, then run
`npm run test:browser` for the local Storybook matrix.

1. Run `npm run release:check`.
2. Run `npm run test:browser`.
3. Install the generated tarball in a consuming Storybook.
4. Complete manual desktop and mobile testing.
5. Publish only after explicit approval. Do not combine validation with versioning or publication.
