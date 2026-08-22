# Compatibility policy

This package is pre-1.0. Semantic versioning gives `0.x` releases no special
protection, so the policy below states what this package guarantees instead of
leaving it to convention.

## Before 1.0

The **minor** position carries breaking changes. A release that changes or
removes a public export, changes the shape of a documented type, or changes the
runtime behaviour a caller depends on moves `0.1.x` to `0.2.0`.

The **patch** position carries everything else: additive exports, bug fixes,
documentation, and internal work with no observable effect on a caller.

There is no long-term support for an older minor. Fixes land on the current
minor.

Pin accordingly. A caret range such as `^0.2.0` does **not** allow `0.3.0`, which
is the behaviour this policy relies on. A tilde range or an exact version pins
harder if you prefer.

## The public surface

Compatibility applies to the documented entry points and the types they export:

- the package root;
- `./preview`, `./events`, and `./storage`;
- `./artifacts/default` and `./artifacts/crossroads-ui`; and
- `./styles.css`.

`.crossroads/live-code-sandbox.integration.json` declares the same surface for
agent discovery and is validated against the generated declarations, so the
manifest and the exports cannot drift apart.

Anything reachable only by a deep import into `dist/` is internal and may change
in a patch release.

The peer range is a separate contract, recorded in the README's supported
versions section and enforced by the CI matrix. Widening it is additive.
Narrowing it is breaking.

## Storage payloads

Persisted state is versioned independently of the package. Storage is at
version 3 and migrates versions 1 and 2 on read, so upgrading the package does
not discard a saved workspace. A future storage version will continue to migrate
forward rather than reset. Migration is one-way: an older package cannot read a
newer payload, and downgrading may reset the workspace to its default.

## After 1.0

At 1.0 the major position takes over breaking changes and the minor position
becomes additive-only. That transition will be announced in its own release
rather than applied silently.
