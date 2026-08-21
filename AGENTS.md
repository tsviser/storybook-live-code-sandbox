# storybook-live-code-sandbox — agent working notes

`storybook-live-code-sandbox` is a design-system-agnostic npm package that gives Storybook one
persistent live-composition workspace. Stories send their displayed source to a dedicated sandbox
story; individual previews never mount drawers or providers. The published package is `0.1.2`.

## Repository gotchas

The local checkout can go stale. Fetch before drawing conclusions from local history, and compare
the current branch with its remote tracking branch.

Native modules are platform-specific. `node_modules/@rolldown/` may contain only the binding for
the current platform. A rolldown "Cannot find native binding" startup error on another platform
does not by itself mean the install is corrupt. Do not delete `node_modules` based only on that
error; CI uses `npm install` to resolve platform-specific dependencies.

The `.crossroads` manifest pins `package.version`. `scripts/validate-integration.mjs` fails if the
manifest and `package.json` disagree, so any version bump must update both in the same commit.

## Commands

```sh
npm test                  # vitest
npm run build             # vite library build + TypeScript declarations
npm run integration:check # validate the Crossroads manifest and invalid fixtures
npm run integration:test  # node:test suite around the validator
npm run release:check     # all checks above + npm pack --dry-run
npm run consistency:all   # full metadata and workflow snapshot
npm run consistency:staged # metadata checks for the staged snapshot
npm run consistency:branch # metadata checks against origin/main
```

Run `npm run hooks:install` once per checkout to enable the tracked pre-push hook. The hook runs
the inexpensive branch consistency check before the full release validation. Publication runs the
full-snapshot check before installing dependencies. Set
`CONSISTENCY_BASE_REF` only when the branch intentionally targets a base other than `origin/main`.

Release work is deliberately staged: run `release:check`, install the tarball in a consuming
Storybook, complete manual desktop and mobile testing, and publish only after explicit approval.
Validation, versioning, and publication are never combined.

## Architecture

`LiveCodeSandboxProvider` composes the editor, registry, persistence, and the `react-live` preview
inside the Storybook preview boundary.

- `scope` (`LiveCodeScope`) is the runtime name-to-value namespace handed to `react-live`. It is
  intentionally broader than the picker and is not a component catalog.
- `registry` (`LiveCodeRegistryItem[]`) is curated metadata driving visible components, insertable
  examples, and prop suggestions. It is not a runtime import mechanism. Entries that are
  unavailable or not `sandboxVisible` must never be selectable.
- `editorState.ts` holds pure logic: safe top-level JSX insertion via the Lezer parser,
  checkpoints, prop-assignment synthesis, and versioned storage parsing. Storage is at version 3
  and migrates versions 1 and 2 on read.
- The preview renders `lastSuccessfulCode`, so invalid intermediate JSX never blanks the canvas.
- `ui.tsx` provides fallback controls; a `LiveCodeSandboxUIAdapter` lets a design system replace
  buttons, chips, fields, tabs, dialogs, notifications, the surface, and the workspace layout.

## Current baseline

The current runtime baseline includes:

- lazy loading for the JSX parser used by the `./storage` entry point;
- the async `addStoryToSandboxStorage` API and corresponding documentation/tests;
- registry category ordering by relevance;
- managed empty-stage and preview interaction fixes;
- responsive registry styling and focused tests; and
- the repository-owned Crossroads integration contract and validation checks.

The lazy-loading change is a breaking change to the `./storage` subpath: it returns a promise and
rejects rather than throwing. The synchronous package-root export is unchanged. Versioning and the
matching `.crossroads` manifest update are required before publishing a release containing this
change.

## Open findings

These findings remain review items, not implicit implementation authorization:

1. The default UI artifact is weaker than the adapted path its tests run through. `SandboxField`'s
   fallback ignores `options` and `onOptionSelect`; `SandboxDialog` lacks focus trapping, Escape
   handling, and focus restoration; `SandboxTabs` lacks `aria-controls` and arrow-key navigation.
2. `crypto.randomUUID?.()` and `localStorage.setItem` are not fully guarded for environments such
   as non-secure contexts, Safari private mode, or storage quota exhaustion.
3. The manifest declares fewer root-subpath symbols than `src/index.ts` exports. The validator
   currently checks subpaths but not symbol parity against the built declarations.
4. The README omits several public props, including `managed`, workspace orientation controls, and
   toolbar actions.
5. The `storybook` peer range may be unnecessarily narrow because the source uses structural
   channel typing rather than importing Storybook directly.
6. `docs/ALPHA_READINESS.md` still records open alpha-stability and accessibility gates.

Investigate and propose before implementing. Source edits, dependency changes, publishing, releases,
and external mutations require explicit authorization.

## Conventions

Prose in docs and commit messages is plain and declarative. Claims about sizes, counts, or behavior
must be measured before being written down. Preserve unrelated dirty changes, verify branch/ref and
file scope before edits, and do not commit or push unless explicitly requested.

The Crossroads agent integration is read-only discovery. It does not authorize source mutation,
publishing, releases, or external repository writes.
