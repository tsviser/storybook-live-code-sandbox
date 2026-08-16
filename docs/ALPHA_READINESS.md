# Alpha readiness

Status: **alpha candidate** for the `0.1.2` package. The sandbox is usable and
validated through its real basic Storybook consumer, but it is not yet a
production-readiness claim.

## Evidence completed

- Package unit tests: 36 passed.
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
- The example build reports chunks larger than 500 kB after minification;
  investigate code-splitting before a performance-focused release.
- `react-live` evaluation limitations and the preview error model should be
  documented before a production stability claim.

The agent integration remains read-only discovery. It does not authorize
source mutation, publishing, releases, or external repository writes.
