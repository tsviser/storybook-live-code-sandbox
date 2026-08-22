# Migrating to 0.2.0

One breaking change: `addStoryToSandboxStorage` from the `storybook-live-code-sandbox/storage`
subpath is asynchronous. Nothing else in the public surface changed, and persisted workspaces are
unaffected — storage is still at version 3 and still migrates versions 1 and 2 on read.

If you do not import the `./storage` subpath, upgrading needs no code change.

## Why

The subpath re-exported the transfer function from the module that imports the CodeMirror JSX
parser at module scope. Every Docs page that wired story transfer therefore loaded that parser on
page load, pulling a 441 kB chunk, of which the parser alone measures 343 kB minified and 116 kB
gzipped. The parser is only needed when a transfer actually runs.

The subpath is now a shell that imports the parser on first transfer. `dist/storage.js` is
under 1 kB, and the parser arrives only when a story is really sent to the sandbox.

## What changed

The function returns a promise and rejects instead of throwing synchronously.

Before:

```ts
import { addStoryToSandboxStorage } from "storybook-live-code-sandbox/storage";

function sendToSandbox(code: string, storyName: string) {
  try {
    addStoryToSandboxStorage({
      channel: addons.getChannel(),
      code,
      storageKey: "my-library-live-code-sandbox",
      storyName,
    });
  } catch (error) {
    reportFailure(error);
  }
}
```

After:

```ts
import { addStoryToSandboxStorage } from "storybook-live-code-sandbox/storage";

async function sendToSandbox(code: string, storyName: string) {
  try {
    await addStoryToSandboxStorage({
      channel: addons.getChannel(),
      code,
      storageKey: "my-library-live-code-sandbox",
      storyName,
    });
  } catch (error) {
    reportFailure(error);
  }
}
```

The input and the resolved value are unchanged: the same `AddStoryToSandboxInput`, and the updated
`LiveCodeSandboxStorage`.

Call it from an event handler and handle the rejection. An unhandled rejection is the one way this
change can fail quietly, because a synchronous `try`/`catch` that used to catch the throw will no
longer see it:

```ts
<button onClick={() => { void sendToSandbox(code, storyName); }}>Send to sandbox</button>
```

## Rejection reasons

The rejection carries the same messages the synchronous version threw:

| Message | Cause |
| --- | --- |
| `Story source is unavailable.` | Empty or whitespace-only source, or no `window`. |
| `Sandbox storage is unavailable.` | The browser refused access to the store. |
| `Sandbox storage quota was exceeded.` | The write exceeded the available quota. |
| `No safe top-level insertion point is available.` | The saved cursor is not at a position where a top-level insertion is safe. |

The workspace is left unchanged in every rejection case, and nothing is announced to listeners.

## What did not change

The synchronous export from the package root is unchanged and stays correct inside the workspace,
which already loads the editor. Only the `./storage` subpath is asynchronous.

Version pinning is worth a look while you are here. Under this package's
[compatibility policy](./COMPATIBILITY.md) a breaking change moves the minor position before 1.0,
so `^0.2.0` will not pick up `0.3.0`.
