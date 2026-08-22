# storybook-live-code-sandbox — agent working notes

`storybook-live-code-sandbox` is a design-system-agnostic npm package that gives Storybook one
persistent live-composition workspace. Stories send their displayed source to a dedicated sandbox
story; individual previews never mount drawers or providers. The published package is `0.1.2`.

## Repository gotchas

**Fetch before every task, not once per session.** Work lands here from several machines, and
`codex/*` branches merge multiple pull requests a day. On 2026-08-22 a fetch at the start of a
session showed `origin/main` at `fd35a9d` with no open pull requests; a few hours later the same
command showed `e46b2b5`, eleven commits ahead, with pull requests 5 through 15 all merged. An
agent that trusted the first answer rebuilt two fixes that had already landed. Run `git fetch`
again immediately before starting each piece of work, and read `gh pr list --state all` — merged
titles reveal in-flight work that branch names do not.

**Verify a finding still exists before fixing it.** Any list of open work in this repository is a
snapshot. Check the current `origin/main` for the specific symbol or line before treating an item
as real.

**Native modules are platform-specific.** `node_modules/@rolldown/` may hold only the binding for
the current platform. A rolldown "Cannot find native binding" startup error on another platform
does not mean the install is corrupt, and deleting `node_modules` will not fix it. CI uses
`npm install` for this reason.

**The `.crossroads` manifest pins `package.version`.** `scripts/validate-integration.mjs` fails
when the manifest and `package.json` disagree, so a version bump has to touch both in one commit.

## Commands

`npm run` lists every script. The ones whose behaviour is not obvious from the name:

```sh
npm run test:browser       # Playwright: Chromium, Firefox, WebKit, and a 390x844 Chromium viewport
npm run release:check      # test, build, package size budgets, integration checks, npm pack --dry-run
npm run consistency:branch # metadata and workflow checks, diffed against origin/main
npm run hooks:install      # once per checkout; enables the tracked pre-push hook
```

Set `CONSISTENCY_BASE_REF` only when a branch deliberately targets a base other than `origin/main`.

Release work is staged on purpose: run `release:check`, install the tarball in a consuming
Storybook, complete manual desktop and mobile testing, and publish only after explicit approval.
Validation, versioning, and publication are never combined.

## Architecture

`LiveCodeSandboxProvider` composes the editor, registry, persistence, and the `react-live` preview
inside the Storybook preview boundary.

- `scope` (`LiveCodeScope`) is the runtime name-to-value namespace handed to `react-live`. It is
  intentionally broader than the picker and is not a component catalog.
- `registry` (`LiveCodeRegistryItem[]`) is curated metadata driving visible components, insertable
  examples, and prop suggestions. It is not a runtime import mechanism. Selectable entries cross a
  fail-closed validation boundary; entries that are unavailable or not `sandboxVisible` must never
  be selectable.
- `editorState.ts` holds the pure logic: safe top-level JSX insertion via the Lezer parser,
  checkpoints, prop-assignment synthesis, versioned storage parsing, and the guarded
  `readSandboxStorage` and `writeSandboxStorage` helpers. Storage is at version 3 and migrates
  versions 1 and 2 on read.
- Draft edits execute only after the explicit Run action. The preview renders `lastSuccessfulCode`,
  so a compile or runtime failure returns to the previous successful composition instead of
  blanking the canvas.
- The draft is wrapped as `<>{draft}</>` and evaluated as one JSX expression. Everything the
  preview can and cannot run follows from that, including the cases that fail silently.
  `docs/preview-model.md` records the measured behaviour and `src/previewModel.test.tsx` holds it
  in place.
- `ui.tsx` provides the fallback artifact; a `LiveCodeSandboxUIAdapter` lets a design system
  replace buttons, chips, fields, tabs, dialogs, notifications, the surface, and the workspace
  layout. The fallback is production-capable on its own and is tested without an adapter.

## What is open

`docs/PRODUCTION_READINESS.md` is the authority on status; read it rather than relying on a summary
here. As of 2026-08-22 the one open P0 is versioning the asynchronous `./storage` API: the subpath
returns a promise and rejects instead of throwing, which cannot ship under the published `0.1.2`.
It needs a compatibility policy, a `0.2.0` release, a matching `.crossroads` manifest update in the
same commit, and migration notes.

What remains beyond that is human acceptance rather than implementation: browser zoom, assistive
technology, and real-device passes, plus the decision recorded in `docs/ALPHA_READINESS.md` about
whether the `0.1.x` API and storage contract are stable enough to document as alpha.

Investigate and propose before implementing. Source edits, dependency changes, publishing,
releases, and external mutations require explicit authorization.

## Conventions

Prose in docs and commit messages is plain and declarative. Claims about sizes, counts, or
behaviour are measured before they are written down; the readiness documents record evidence and
open gates rather than assurances. Preserve unrelated dirty changes, verify branch, ref, and file
scope before editing, and commit or push only when asked.

The Crossroads agent integration is read-only discovery. It does not authorize source mutation,
publishing, releases, or external repository writes.
