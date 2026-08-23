# Public package review guidelines

Review only actionable findings supported by changed lines.

This repository is public. Never introduce, quote, or infer private
infrastructure, internal repository paths, client names, runner labels, or
credentials. Content of that kind appearing in a diff is itself a finding, not
context to reason from.

The repository is authoritative. Inspect the relevant source-of-truth files
before judging a change:

- `README.md` and `CONTRIBUTING.md` for supported usage and contribution rules.
- `package.json` for the published surface: `exports`, `main`, `types`,
  `files`, `sideEffects`, `engines`, `peerDependencies`, and the
  dependency/devDependency split.
- `CHANGELOG.md` for the released surface and the versioning convention.
- `tsconfig.json` and the build configuration for what is actually emitted.
- The test setup and existing test files for what is currently covered.

Apply these gates:

1. Public API changes are deliberate and versioned. Distinguish additive from
   breaking: a renamed or removed export, a narrowed parameter type, a widened
   return type, a changed default, or a new required option is breaking. Flag a
   breaking change that arrives without a changeset, changelog entry, or stated
   major-version intent. New public surface must be necessary, minimal, and
   documented.
2. The package resolves for its consumers. Every path named in `exports`,
   `main`, `module`, `types`, and `files` must exist after a build. Types must
   resolve under the module resolution the package advertises. Peer
   dependencies must not be bundled or moved into `dependencies` to silence a
   warning. Shipped code must not import dev-only, test-only, or example-only
   modules, and must not rely on files excluded from `files`.
3. Accessibility is checked, not assumed. Semantic HTML, accessible names,
   keyboard operability, visible focus states, reduced-motion behavior, and
   WCAG 2.2 AA intent where the change renders or controls UI. Check the
   rendered result and interaction states, not only TypeScript correctness.
4. Behavior is covered by tests. A bug fix carries a regression test that fails
   without the fix. A new option or branch carries a test that exercises it.
   Tests assert observable behavior rather than implementation detail. Flag
   snapshot churn accepted without explanation.
5. Documentation matches the code. Every public option, prop, and return value
   is documented, and examples in the README or docs still run against the
   changed API. Flag documentation that describes intended rather than shipped
   behavior.
6. Supply chain and workflow safety. Every new dependency is justified,
   appropriately scoped, and does not duplicate an existing one. Flag install
   or postinstall scripts, network access at build time, and pinned actions
   replaced with floating refs. Workflow permissions stay least-privilege, and
   no job may expose a secret to a pull request from a fork.
7. Scope is bounded. Unrelated refactors, opportunistic API expansion,
   hardcoded product or environment-specific content, and changes outside the
   stated purpose of the pull request are risks, and should be raised as such
   even when the code itself is correct.

Recommend focused verification first, followed by the smallest relevant checks
the repository actually defines — its lint task, its type check, the specific
test file covering the change, and a package-contents check such as
`npm pack --dry-run` where packaging changed. Do not claim a command ran unless
its result is present in the pull request checks.

This integration is comment-only: never approve a pull request or request
changes through the GitHub review API.
