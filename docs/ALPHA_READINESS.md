# Alpha readiness

Status: **alpha candidate** for the `0.1.2` package. The sandbox is usable and
validated through its real basic Storybook consumer, but it is not yet a
production-readiness claim.

## Evidence completed

- Package unit tests: 93 passed.
- Repository integration and consistency tests: 9 passed.
- Package build: passed.
- Release check and `npm pack --dry-run`: passed.
- Mounted provider synchronization test: passed for a Storybook channel
  payload.
- Explicit Run tests: draft code remains unexecuted until Run, and a runtime
  failure restores the previous successful preview.
- Basic Storybook consumer build: passed against the local `file:../..`
  package link with React deduplicated by Vite.
- Current desktop browser verification: draft edits did not execute, Run
  promoted a valid draft, and a runtime failure preserved the last successful
  preview while exposing an alert.
- Current two-tab browser verification: debounced drafts synchronized without
  execution, successful Run state synchronized, and reload restored both the
  draft and last successful preview.
- Desktop browser smoke test: component insertion, prop suggestions, invalid
  JSX diagnostics, last-successful-preview preservation, and reset behavior
  passed.
- Responsive browser smoke test at 390x844: workspace tabs, component search,
  component cards, and reset/settings controls remained visible and usable.
- Default-artifact browser verification: the editor and tab panels exposed
  accessible names, component search offered native suggestions and selected
  an exact option, arrow keys activated tabs, and the settings dialog trapped
  focus, closed with Escape, and restored focus to its trigger.
- Committed Playwright automation: 30 checks passed across Chromium, Firefox,
  WebKit, and an exact 390 by 844 pixel Chromium mobile viewport. The suite
  covers explicit execution and rollback, fallback keyboard behavior, reload
  persistence, two-page synchronization, blocked and quota-limited storage,
  version 1 migration, mobile panel switching, and Chromium dark,
  reduced-motion, forced-color, and RTL preferences.

## Remaining gates

- Complete human testing on the target browsers and real mobile devices.
- Complete human browser zoom, assistive-technology, and real-device checks.
- Persistence across a browser reload and migration from a version 1 payload
  now pass in the basic Storybook consumer on Chromium, Firefox, and WebKit.
- The provider-level channel path and last-arriving-valid-state conflict policy
  have focused tests.
- Decide whether the `0.1.x` API and storage contract are stable enough to
  document as alpha.

## Known follow-ups

- Storybook currently reports an outdated JSX-transform warning during the
  example dev server startup.
- Persistence failure behavior and last-arriving-state synchronization have
  focused tests. Chromium, Firefox, and WebKit now run deterministic blocked
  storage and quota-failure checks; browser-policy-specific private modes
  remain a manual release-candidate check.

## Resolved follow-ups

- `react-live` evaluation limitations and the preview error model are documented
  in `docs/preview-model.md`. The draft is wrapped as `<>{draft}</>` and
  evaluated as one JSX expression, so statements, imports, comments, quoted
  strings, and `render()` calls render as text instead of executing, hooks raise
  an invalid-hook-call error, and unknown names fail at evaluation while the
  static check reports only that a draft does not parse. Twenty-two tests in
  `src/previewModel.test.tsx` hold the document to the measured behavior.

- Supported versions are now explicit: Storybook 10.x, React/React DOM 18-19,
  Node 20.19+/22.12+, npm 10-11, and the committed Playwright engines. CI adds
  lower-line Node/React consumer builds while retaining one full browser run.
- Root and example lockfiles are authoritative and checked after the
  platform-safe install; floating `latest` development ranges were removed.
- Selectable registry entries now cross a fail-closed validation boundary for
  unique identities, runtime scope membership, safe insertable examples,
  category consistency, and generated prop metadata. Invalid entries are
  hidden with an accessible warning and structured diagnostics are exported.
- Registry documentation now matches the default-visible `sandboxVisible`
  behavior and the `disabledReason` exclusion contract.
- Integration validation now compares every manifest symbol with generated
  declaration exports, closing the former root-export inventory gap.
- Clipboard and Fullscreen API failures now produce actionable warning alerts
  instead of false success or unhandled promise rejections. Managed workspaces
  render the Layout action only when an orientation-change callback exists.
- The default artifact now has focused tests for native search selection,
  instance-unique dialog labeling, modal focus handling, Escape and focus
  restoration, associated tab panels, roving focus, and LTR/RTL arrow-key
  navigation. The package also names the editor, separates polite diagnostics
  from assertive failures, uses logical layout properties, and provides system
  dark-mode and forced-color defaults.
- A WebKit browser check exposed that click activation does not reliably focus
  buttons. Dialogs now accept an explicit return-focus ref, and all supported
  desktop engines verify Escape restoration. Typing checkpoint creation is
  deferred until after the initiating pointer interaction so mobile panel tabs
  do not move between pointerdown and click.

- The `storage` subpath no longer imports the CodeMirror JSX parser at module
  scope. It was pulling a 441 kB chunk (the parser alone measures 343 kB
  minified, 116 kB gzipped) into every Docs page that wired story transfer.
  The subpath is now an asynchronous shell that loads the parser on first
  transfer; `dist/storage.js` is 0.21 kB. This was the cause of the
  larger-than-500 kB chunk warning in the example build.

The agent integration remains read-only discovery. It does not authorize
source mutation, publishing, releases, or external repository writes.
