import type { LiveCodeRegistryItem } from "storybook-live-code-sandbox";

export const liveCodeRegistry: LiveCodeRegistryItem[] = [
  {
    name: "Button",
    category: "Actions",
    description: "Button for primary, secondary, or quiet actions.",
    sandboxVisible: true,
    examples: [
      {
        name: "Primary",
        code: '<Button label="Save changes" variant="primary" />',
      },
      {
        name: "Secondary",
        code: '<Button label="Preview" variant="secondary" />',
      },
    ],
    props: [
      { name: "label", type: "string", required: true, importance: "high" },
      { name: "variant", type: '"primary" | "secondary" | "quiet"', defaultValue: "primary", importance: "high" },
      { name: "size", type: '"sm" | "md" | "lg"', defaultValue: "md", importance: "normal" },
      { name: "disabled", type: "boolean", importance: "advanced" },
    ],
  },
  {
    name: "Card",
    category: "Layout",
    description: "Content card with an optional footer area.",
    sandboxVisible: true,
    examples: [
      {
        name: "Project card",
        code: `<Card title="Launch plan" description="Use the sandbox to compose a quick product surface.">
  <Badge label="Ready" tone="success" />
  <Button label="Open" variant="secondary" />
</Card>`,
      },
    ],
    props: [
      { name: "title", type: "string", required: true, importance: "high" },
      { name: "description", type: "string", importance: "normal" },
      { name: "children", type: "ReactNode", importance: "normal" },
    ],
  },
  {
    name: "Badge",
    category: "Data Display",
    description: "Compact status label.",
    sandboxVisible: true,
    examples: [
      {
        name: "Success",
        code: '<Badge label="Ready" tone="success" />',
      },
    ],
    props: [
      { name: "label", type: "string", required: true, importance: "high" },
      { name: "tone", type: '"neutral" | "success" | "warning"', defaultValue: "neutral", importance: "high" },
    ],
  },
  {
    name: "Notice",
    category: "Feedback",
    description: "Inline message for status or confirmation.",
    sandboxVisible: true,
    examples: [
      {
        name: "Saved",
        code: '<Notice title="Saved" message="Your sandbox composition is stored locally." tone="success" />',
      },
    ],
    props: [
      { name: "title", type: "string", required: true, importance: "high" },
      { name: "message", type: "string", required: true, importance: "high" },
      { name: "tone", type: '"info" | "success"', defaultValue: "info", importance: "normal" },
    ],
  },
];
