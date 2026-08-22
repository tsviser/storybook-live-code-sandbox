# Alpha readiness

Status: **alpha candidate** for the `0.1.2` package. The sandbox is usable and
validated through its real basic Storybook consumer, but it is not yet a
production-readiness claim.

## Evidence completed

- Package unit tests: 60 passed.
- Integration-contract tests: 5 passed.
- Package build: passed.
- Release check and `npm pack --dry-run`: passed.
- Mounted provider synchronization test: passed for a Storybook channel
  payload.
- Basic Storybook consumer build: passed.
- Desktop browser smoke test: component insertion, prop suggestions, invalid
  JSX diagnostics, last-successful-preview preservation, and reset behavior
  passed.
- Responsive browser smoke test at 390x844: workspace tabs, component search,
  component cards, and reset/settings controls remained visible and usable.
- Default UI artifact covered directly, with no adapter supplied: search
  suggestions, tab keyboard navigation, and dialog focus behavior.

## Remaining gates

- Complete human testing on the target browsers and real mobile devices.
- Verify migration from an older storage payload; persistence across a browser
  reload passed in the basic Storybook consumer.
- Synchronization across two local Storybook tabs with the same `storageKey`
  passed; the provider-level channel path is also covered by a test.
- Decide whether the `0.1.x` API and storage contract are stable enough to
  document as alpha.

## Known follow-ups

- Storybook currently reports an outdated JSX-transform warning during the
  example dev server startup.
- The example build reports chunks larger than 500 kB after minification;
  investigate code-splitting before a performance-focused release.
- `react-live` evaluation limitations and the preview error model should be
  documented before a production stability claim.
- The default tabs carry no `aria-controls`. The registry sidebar is a four-row
  grid whose rows are the tab strip's own siblings, so associating a tab with a
  panel needs that layout restructured rather than an attribute added. Keyboard
  navigation and roving focus are in place; the association is not.

## Resolved follow-ups

- The default UI artifact no longer trails the adapted path. Its search field
  renders the supplied `options` through a datalist and reports a pick through
  `onOptionSelect`, which was previously dead without an adapter. Its dialog
  traps Tab, cancels on Escape, restores focus to whatever opened it, and
  derives its element ids per instance instead of hardcoding them. Its tabs
  support arrow-key and Home/End navigation with a roving tab stop. Sixteen
  tests exercise this artifact directly; twelve of them fail against the
  previous implementation.
- `crypto.randomUUID` is reached through `globalThis` so a missing `crypto`
  global degrades to a positional checkpoint id. Reads and writes of
  `localStorage` in the provider are guarded, because touching the store throws
  outright in a sandboxed iframe and writes throw in Safari private mode or on
  an exhausted quota. A workspace that cannot be persisted now warns once and
  continues in memory rather than throwing on every keystroke. The
  `addStoryToSandboxStorage` entry point still rejects on a failed write, which
  is its documented contract, and announces nothing when it does.

The agent integration remains read-only discovery. It does not authorize
source mutation, publishing, releases, or external repository writes.
