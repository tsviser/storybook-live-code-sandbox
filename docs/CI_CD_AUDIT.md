# CI/CD audit

Measured on 2026-08-20 against the live GitHub repository and the default branch.

## Current workload

- GitHub registers two active workflows, `Validate` and `Publish package`, and the default branch
  contains exactly those two workflow files. There are no dormant workflows to delete.
- `Validate` is a required status check in the active `Solo main protection` ruleset. It remains a
  single always-reporting job rather than using path filters that could leave the required check
  pending.
- The 13 recorded validation runs consumed 320 seconds in total: 7 pull-request runs and 6 main
  pushes. The average was 24.6 seconds, with a 14-second minimum and 36-second maximum. Four PR
  branches averaged 1.75 runs each; the busiest had 3 runs.
- The 3 recorded publication runs were all manual and consumed 89 seconds in total, averaging
  29.7 seconds. No historical tag-triggered publication was found.
- No model-backed reviewer, visual snapshot service, container build, or artifact-upload job is
  configured. Current model-token spend from Actions is therefore zero, and there is no measured
  third-party metered CI workload to remove.

## Changes and expected savings

Both workflows now use immutable commit SHAs for their external actions. Validation remains the
required deterministic check and publication remains manual-or-tag-triggered.

The previous publication path ran package tests twice and built the package five times: during
install, explicit release validation, dry-run packing, `prepublishOnly`, and final packing. CI now
uses the repository's platform-safe `npm install` behavior with lifecycle scripts disabled. A
clean `npm ci` is intentionally avoided because it has repeatedly failed to resolve this package's
platform-specific native optional dependencies on Linux runners. Both lockfiles remain
authoritative: validation and publication now fail if the platform-safe install changes either
one. Lockfile-producing CI installs use pinned npm 10.9.4 because clean npm 11 installs on Ubuntu
normalize optional native dependency metadata differently from macOS; the final publication step
switches to pinned npm 11.6.0 for provenance publication. Floating `latest` development ranges
were replaced with major-bounded ranges, and a focused Node 20/React 18 plus Node 22/React 19
compatibility matrix verifies supported lower lines without duplicating the cross-browser suite.
Validation, compatibility, and publication builds enforce the versioned raw and gzip limits in
`bundle-size-budgets.json` after producing both package and basic-consumer artifacts. The package
release check also enforces package-only limits before packing. The release dry run skips
lifecycle scripts after its explicit build, and the already-verified publish step also skips
lifecycle scripts. The resulting publication job runs tests once and builds once, removing one
test execution and four builds. The same install and dry-run changes remove two redundant builds
from validation. Because historical jobs average under 30 seconds, the absolute hosted-runner
saving is expected to be seconds per run, not minutes.

## Consistency gate

`scripts/check-consistency.mjs` is dependency-free and supports staged (`--staged`), branch
(`--base <ref>`), and full-snapshot (`--all`) checks. It reports errors when artifact source files
drift from package exports or integration metadata, and when a new or modified workflow uses
mutable external action references. Full-snapshot mode checks every workflow. A new example image
without a README or documentation reference is a warning.

Run `npm run hooks:install` once in each checkout. The tracked pre-push hook runs the consistency
gate before the more expensive `release:check`. Validation runs the branch gate and publication
runs the full-snapshot gate before dependency installation. No manual GitHub cleanup is required
because there are no dormant registered workflows.

The check was replayed against all six merged PR heads. Four passed without findings. PRs #1 and
#2 correctly reported mutable action tags because each changed `validate.yml`; those references
are pinned by this change. No artifact or documentation false positives were found. A synthetic
unregistered artifact produced three actionable errors, while a synthetic unreferenced image
produced one warning and retained a successful exit status.
