# Alpha readiness

Status: **alpha candidate** for the `0.1.2` package. The sandbox is usable and
validated through its real basic Storybook consumer, but it is not yet a
production-readiness claim.

## Evidence completed

- Package unit tests: 43 passed.
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
- `react-live` evaluation limitations and the preview error model should be
  documented before a production stability claim.
- The default UI artifact is thinner than the adapted path it is tested
  through: its search field ignores `options` and `onOptionSelect`, its dialog
  has no focus trap, Escape handling, or focus restoration, and its tabs have
  no `aria-controls` or arrow-key navigation. Cover the default artifact with
  its own tests before claiming accessibility parity.
- `crypto.randomUUID` and `localStorage.setItem` are called without guards.
  Both fail in real environments (non-secure contexts, Safari private mode,
  quota exhaustion) where the read path already degrades safely.
- The manifest declares two symbols for the root subpath while `src/index.ts`
  exports sixteen. The validator compares subpaths only, so the gap passes.

## Resolved follow-ups

- The `storage` subpath no longer imports the CodeMirror JSX parser at module
  scope. It was pulling a 441 kB chunk (the parser alone measures 343 kB
  minified, 116 kB gzipped) into every Docs page that wired story transfer.
  The subpath is now an asynchronous shell that loads the parser on first
  transfer; `dist/storage.js` is 0.21 kB. This was the cause of the
  larger-than-500 kB chunk warning in the example build.

The agent integration remains read-only discovery. It does not authorize
source mutation, publishing, releases, or external repository writes.
