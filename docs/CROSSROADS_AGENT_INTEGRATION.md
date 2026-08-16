# Crossroads Agent System integration

This package exposes a repository-owned, versioned discovery contract at [`.crossroads/live-code-sandbox.integration.json`](../.crossroads/live-code-sandbox.integration.json). It is a read-only description of the package for the existing `live_code_sandbox` registration and `live-code-sandbox-specialist` role in the [Crossroads Agent System](https://github.com/tsviser/crossroads-agent-system).

The Agent System remains authoritative for approvals, permissions, work-item state, governance, publishing, releases, and external writes. This package does not connect to a model provider, execute autonomous work, or claim live synchronization with the Agent System.

## What the agent may inspect or propose

The agent may inspect public package exports, source paths, tests, examples, registry metadata, runtime scope declarations, artifact adapters, persistence behavior, and validation output. It may propose a source change, compatibility fix, test, documentation update, or release-readiness finding. A proposal is not an implementation or release authorization.

The agent should use the package checks in the manifest and report environment failures separately from source failures. Source edits, dependency changes, publishing, releases, and external mutations remain behind the Agent System's human approval boundary.

## Runtime boundaries

`LiveCodeSandboxProvider` composes the editor, registry, persistence, and `react-live` preview in the Storybook preview boundary. The editor's source is composition content; it is not an agent work item or decision record.

`scope` (the `LiveCodeScope` value) is the runtime namespace available to JSX evaluation. It maps names to runtime values and is intentionally broader than the picker.

`registry` (the `LiveCodeRegistryItem[]` value) is curated metadata: visible components, insertable examples, availability, categories, and prop suggestions. It is not a runtime import mechanism. Entries that are unavailable or not sandbox-visible must not be exposed as selectable components.

The preview renders the last successful code through `react-live`. Persisted `LiveCodeSandboxStorage` is keyed by the caller-provided `storageKey`; browser and Storybook channel synchronization stay scoped to that key. Generated or exported artifacts describe UI adapters and do not change the runtime scope.

## Evidence and provenance

The local contract uses the Agent System evidence vocabulary: `observed`, `reported`, `inferred`, `proposed`, and `unknown`. `observed` and `reported` claims in the manifest must carry a resolvable local `path:line` pointer or a source URL. The validator rejects missing or unresolvable observed/reporting pointers.

The manifest is intentionally not a copy of the canonical specialist skill. The skill and role remain authoritative in the Agent System; this repository only describes the package surface and its boundaries.

## Out of scope

- model or provider connectivity;
- autonomous execution or unattended source mutation;
- credentials, API keys, analytics, or provider configuration;
- external repository writes, publishing, or release authority;
- live synchronization with the Agent System;
- component discovery outside the declared runtime scope and registry;
- copying specialist skill instructions into this package.

## Validation

Run the local integration contract check with:

```sh
npm run integration:check
```

The check validates the manifest against this package's declared exports, resolves local observed/reporting pointers, and rejects the invalid contract fixtures. It does not contact external services or mutate another repository.
