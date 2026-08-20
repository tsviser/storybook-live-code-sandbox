# Basic Storybook Example

This example shows `storybook-live-code-sandbox` with plain local React components. It does not depend on Crossroads UI or any design-system package.

## Run

```sh
# From the repository root
npm install
npm --prefix examples/basic-storybook install
npm --prefix examples/basic-storybook run storybook
```

Then open `Tools/Live Sandbox`.

The example depends on `file:../..` and deduplicates React in Vite. This keeps
local browser checks on the current package build without mounting a second
React instance.

![Basic Storybook sandbox workspace](../images/Sandbox_sampleApp-Screenshot.jpeg)

## What It Demonstrates

- A dedicated sandbox story.
- A small component registry.
- A runtime scope for `react-live`.
- Prop suggestions from registry metadata.
- Story examples that can send source into the shared sandbox storage.

## Screenshots

![Component inserted with prop suggestions](../images/Sandbox_sampleApp-Screenshot-component.jpeg)

![Composed sandbox preview with history](../images/Sandbox_sampleApp-Screenshot--Components.jpeg)

![History settings dialog](../images/Sandbox_sampleApp-Screenshot--Settings.jpeg)

## Build

```sh
npm --prefix examples/basic-storybook run build-storybook
```
