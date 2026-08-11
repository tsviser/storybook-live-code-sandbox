import type { Meta, StoryObj } from "@storybook/react-vite";
import { addons } from "storybook/preview-api";
import { addStoryToSandboxStorage } from "storybook-live-code-sandbox/storage";
import { Badge, Button, Card, Notice } from "./DemoComponents";

const storageKey = "basic-storybook-live-sandbox";

function AddToSandboxButton({ code, storyName }: { code: string; storyName: string }) {
  return (
    <Button
      label="Add to sandbox"
      variant="quiet"
      size="sm"
      onClick={() => {
        addStoryToSandboxStorage({
          channel: addons.getChannel(),
          code,
          storageKey,
          storyName,
        });
      }}
    />
  );
}

const cardCode = `<Card title="Launch plan" description="Use the sandbox to compose a quick product surface.">
  <Badge label="Ready" tone="success" />
  <Button label="Open" variant="secondary" />
</Card>`;

const noticeCode = '<Notice title="Saved" message="Your sandbox composition is stored locally." tone="success" />';

const meta = {
  title: "Examples/Product UI",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

export const ProjectCard: StoryObj<typeof meta> = {
  render: () => (
    <div className="demo-story">
      <Card title="Launch plan" description="Use the sandbox to compose a quick product surface.">
        <Badge label="Ready" tone="success" />
        <Button label="Open" variant="secondary" />
      </Card>
      <AddToSandboxButton code={cardCode} storyName="Project Card" />
    </div>
  ),
};

export const SavedNotice: StoryObj<typeof meta> = {
  render: () => (
    <div className="demo-story">
      <Notice title="Saved" message="Your sandbox composition is stored locally." tone="success" />
      <AddToSandboxButton code={noticeCode} storyName="Saved Notice" />
    </div>
  ),
};

export const ActionSet: StoryObj<typeof meta> = {
  render: () => (
    <div className="demo-story">
      <div className="demo-actions">
        <Button label="Save changes" variant="primary" />
        <Button label="Preview" variant="secondary" />
        <Button label="Cancel" variant="quiet" />
      </div>
      <AddToSandboxButton
        code={`<Button label="Save changes" variant="primary" />
<Button label="Preview" variant="secondary" />
<Button label="Cancel" variant="quiet" />`}
        storyName="Action Set"
      />
    </div>
  ),
};
