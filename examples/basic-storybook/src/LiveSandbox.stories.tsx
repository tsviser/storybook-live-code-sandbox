import type { Meta, StoryObj } from "@storybook/react-vite";
import { addons } from "storybook/preview-api";
import { LiveCodeSandboxProvider } from "storybook-live-code-sandbox";
import { liveCodeRegistry } from "./liveCodeRegistry";
import { liveCodeScope } from "./liveCodeScope";

const meta = {
  title: "Tools/Live Sandbox",
  parameters: {
    layout: "fullscreen",
  },
  render: () => (
    <LiveCodeSandboxProvider
      channel={addons.getChannel()}
      checkpointInterval={5}
      historyLimit={8}
      registry={liveCodeRegistry}
      scope={liveCodeScope}
      storageKey="basic-storybook-live-sandbox"
    />
  ),
} satisfies Meta;

export default meta;
export const Workspace: StoryObj<typeof meta> = {};
export const InvalidRegistry: StoryObj<typeof meta> = {
  render: () => (
    <LiveCodeSandboxProvider
      registry={[
        liveCodeRegistry[0],
        { name: "Missing", examples: [{ name: "Missing", code: "<Missing />" }] },
        { name: "Unsafe", examples: [{ name: "Unsafe", code: "<Button />; window.alert('no')" }] },
      ]}
      scope={liveCodeScope}
      storageKey="basic-storybook-invalid-registry"
    />
  ),
};
