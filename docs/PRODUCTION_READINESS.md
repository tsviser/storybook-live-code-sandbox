# Production readiness roadmap

Status: **alpha candidate; not production-ready**

Last reviewed: 2026-08-21

This roadmap defines the work and evidence required to move
`storybook-live-code-sandbox` from its current alpha candidate to a supported
production release. It does not authorize implementation, versioning,
publication, or external writes.

## Current baseline

The package has a sound architectural foundation:

- the editor and preview run inside the Storybook preview boundary;
- runtime `scope` remains separate from the curated picker `registry`;
- one CodeMirror instance owns editor state across layouts;
- invalid intermediate JSX does not replace the stored preview source;
- versioned storage migrates versions 1 and 2 to version 3;
- registry visibility, insertion, props, checkpoints, reset, and channel
  synchronization have focused tests; and
- the repository ships a governed, read-only Crossroads integration contract.

Evidence verified through 2026-08-21:

- 93 package unit tests passed;
- 9 repository integration and consistency tests passed;
- the package build passed;
- the basic Storybook consumer build passed against the local package link;
- desktop browser verification confirmed draft isolation, explicit Run,
  empty-draft execution, last-good rollback, and an accessible runtime-error
  alert;
- two-tab browser verification confirmed debounced draft synchronization,
  executed-preview synchronization, and reload persistence;
- 30 committed browser checks passed across Chromium, Firefox, WebKit, and an
  exact 390 by 844 pixel Chromium mobile viewport;
- package contents passed `npm pack --dry-run --ignore-scripts` with an isolated
  npm cache; and
- the packed artifact contained the documented `dist`, README, license, and
  package metadata only.

The full local `release:check` passes with an isolated npm cache, and pull
request plus publication workflows now install and build the local-package
Storybook consumer. The default npm cache still contains root-owned files, so
release automation must continue to use a clean cache. Storybook reports an
outdated JSX-transform warning in development and a chunk above 500 kB in the
production build. Core browser evidence now runs from checked-in Playwright
tests in pull-request, main, and publication validation.

## Production blockers

### P0: Explicit execution and truthful preview state

Status: **implementation and core cross-browser verification complete; edge-case matrix open**

The editor now keeps typed, pasted, inserted, restored, and transferred source
as draft code until the user activates Run. Successful runs update the
persisted preview source. Compile and runtime failures return to the previous
successful preview and report an accessible error.

Remaining outcome:

- verify rapid edits during a run and scope changes; repeated runs and empty
  drafts have focused regression coverage;
- confirm error announcements and focus behavior with assistive technology;
- keep the documented `react-live` trust boundary visible in release notes;
  the boundary and its evaluation limits are recorded in
  `docs/preview-model.md`.

### P0: Persistence and synchronization resilience

Status: **implementation and automated browser failure-mode matrix complete**

Storage access now reports loaded, empty, invalid, unavailable, and quota
outcomes without crashing the workspace. Writes are debounced and flushed on
page exit. Browser, custom-event, and Storybook channel payloads cross one
normalization boundary before they can replace state. Changing `storageKey`
rehydrates deliberately, and checkpoint IDs have a non-crypto fallback.

The conflict policy is last-arriving valid state wins for the complete
workspace; concurrent field-level merging is intentionally unsupported.

Chromium, Firefox, and WebKit now verify that injected blocked-storage and
quota failures surface accessible warnings without crashing the workspace or
losing the in-memory draft. The same engines verify migration of a version 1
browser payload to version 3. Browser-policy-specific private-mode behavior
remains part of manual release-candidate acceptance.

### P0: Default artifact accessibility

Status: **fallback implementation and core rendered automation complete; human matrix open**

The package-owned fallback UI must be production-capable without a design
system adapter.

Required outcome:

- dialogs now trap focus, close with Escape, restore focus, and use
  instance-unique accessible IDs;
- tabs now expose associated panels, roving focus, and arrow-key navigation;
- the fallback search field now offers and selects registered component
  options;
- the editor is named, diagnostics are polite status updates, failed runs are
  assertive notifications, and dialogs expose modal state; and
- keyboard-only behavior now runs in all three desktop engines; Chromium also
  verifies reduced-motion, forced-color, RTL, and dark-theme preferences; and
- browser zoom, assistive-technology announcements, and real-device behavior
  still require human verification.

### P0: Version the asynchronous storage API

The `./storage` entry point now returns a promise and rejects instead of
returning synchronously and throwing. This change must not ship under the
already published `0.1.2` version.

Required outcome:

- choose and document the pre-1.0 compatibility policy;
- release the breaking API as `0.2.0`;
- update `.crossroads/live-code-sandbox.integration.json` in the same commit;
  and
- publish migration notes with before-and-after usage.

## Important hardening

Complete these items before the production release candidate:

1. **Complete:** managed workspace orientation requires a working
   `onWorkspaceOrientationChange`; no no-op Layout action is rendered.
2. **Complete:** clipboard and Fullscreen API failures report useful,
   accessible feedback and do not escape as unhandled promises.
3. **Complete:** registry validation fails closed for duplicate identities,
   missing scope members, unsafe or non-insertable examples, inconsistent
   categories, and invalid prop metadata used to generate source.
4. **Complete:** integration-manifest symbols are compared with generated
   declaration exports for every typed public subpath.
5. **Complete:** README visibility language matches the actual default-visible
   behavior of `sandboxVisible` and the unavailable-entry contract.
6. **Complete:** the passing CI matrix verifies the supported contract of
   Storybook 10.x, React and React DOM 18-19, Node 20.19+/22.12+, npm 10-11,
   and the current committed Playwright browser engines.
7. **Complete:** CI preserves the platform-safe install path while enforcing
   both authoritative lockfiles with pinned npm 10.9.4 installs, then uses npm
   11.6.0 for provenance publication; floating `latest` development ranges
   were replaced with bounded ranges.
8. **Complete:** versioned raw and gzip budgets cover total published
   JavaScript/CSS, the package editor/parser chunk, the basic consumer sandbox
   load, and its editor/parser chunk; CI also requires expected chunk counts.
9. **Complete:** `docs/preview-model.md` documents the evaluation boundary: the
   draft is wrapped as a single JSX expression, so statements, imports, comments,
   quoted strings, and `render()` calls render as text rather than executing,
   React hooks raise an invalid-hook-call error, and unknown names fail at
   evaluation rather than in the static check. Every claim is asserted in
   `src/previewModel.test.tsx`.
10. **Complete:** every `LiveCodeSandboxConfig` prop is documented in the README
   configuration list, including the previously omitted `forceRegistryPinned`.
   The exported event contract is documented alongside the manager-link example.

## Verification matrix

Production evidence must be reproducible in this repository.

### Unit and contract tests

- editor insertion, parsing, migration, and generated props;
- storage failure modes and malformed synchronized payloads;
- explicit Run, compile failure, runtime failure, and last-good-preview state;
- default and adapted registry behavior;
- default UI keyboard and dialog behavior;
- registry/scope validation; and
- package export and integration-manifest symbol parity.

### Browser tests

Run the real local package through the basic Storybook consumer. Verify:

- opening and closing the sandbox;
- component selection and safe insertion;
- prop insertion and value selection;
- explicit Run and accessible error display;
- preservation of one editor instance across layout changes;
- checkpoint restore, deletion, undo, and reset;
- reload persistence, migrations, and two-tab synchronization;
- managed and dedicated layouts;
- desktop, narrow mobile, fullscreen, and orientation controls;
- theme, direction, CSS-variable, and provider inheritance; and
- rejection of unavailable or unsafe registry entries.

Minimum browser matrix:

- current Chromium;
- current Firefox;
- current WebKit/Safari-equivalent automation;
- 390 px mobile viewport;
- a desktop viewport of at least 1280 px; and
- one real mobile-device pass before final approval.

### Package and consumer tests

- typecheck and package build;
- Storybook production build using the local packed tarball;
- `npm pack --dry-run` inspection from a clean environment;
- package import tests for every public subpath;
- React duplication checks in linked and packed consumers;
- README examples compiled against the packed package; and
- bundle-size comparison against the agreed budgets.

## Delivery phases

### Phase 0: Contract decisions

Decide the execution model, storage failure behavior, synchronization conflict
policy, supported-version matrix, and `0.2.0` compatibility policy.

Exit gate: the runtime and API contracts are documented and approved.

### Phase 1: Core hardening

Implement explicit execution, truthful last-good preview state, resilient
storage/synchronization, default accessibility, and browser API error handling.

Exit gate: no open P0 defect and equivalent behavior across the default and
adapted artifacts.

### Phase 2: Automated evidence

Status: **core browser and persistence-failure matrices complete; broader package and interaction matrix open**

Add the unit, browser, package, and consumer verification described above.
Wire stable checks into protected-branch CI.

Exit gate: the full matrix passes from a clean checkout, and browser evidence
is produced by committed tests rather than historical notes.

### Phase 3: Release candidate

Bump package and integration-manifest versions together, publish migration
notes, pack the artifact, install it into a real consuming Storybook, and
complete manual desktop and mobile testing.

Exit gate: `release:check`, packed-consumer tests, browser automation, package
inspection, and human acceptance all pass for the exact release commit.

### Phase 4: Production release

Publish only after explicit approval. Tag the exact verified commit, publish
with provenance, verify npm installation, and record release evidence and
known limitations.

Exit gate: the published package resolves from npm, the consumer smoke test
passes against that published version, and rollback/deprecation guidance is
available.

## Production definition of done

The sandbox may be described as production-ready only when:

- execution is explicit and the preview state is truthful;
- persistence and synchronization failures degrade safely;
- the default artifact meets the accessibility contract;
- the breaking storage API has a new version and migration guide;
- browser behavior is automatically verified across the supported matrix;
- package, consumer, export, and size checks pass from a clean environment;
- all known P0 and P1 findings are closed or explicitly accepted with a
  recorded rationale; and
- publication is performed from the exact approved release commit.
