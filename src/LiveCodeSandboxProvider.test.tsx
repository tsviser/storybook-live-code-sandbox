import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { LiveCodeSandboxProvider } from "./LiveCodeSandboxProvider";
import { createDefaultStorage, safeParseStorage } from "./editorState";
import { getLiveCodeSandboxSyncEvent } from "./events";

const registry = [
  {
    name: "Button",
    category: "Actions",
    description: "Action control",
    examples: [{ name: "Primary", code: "<Button>Save</Button>" }],
    props: [
      { name: "children", type: "ReactNode", required: true },
      { name: "advancedProp", type: "string", importance: "advanced" as const },
      { name: "color", type: '"primary" | "secondary" | "danger"', importance: "high" as const },
      { name: "variant", type: '"primary" | "secondary"', defaultValue: "primary", importance: "high" as const },
      { name: "disabled", type: "boolean", required: true },
    ],
  },
  { name: "IconButton", category: "Actions", examples: [{ name: "Basic", code: "<IconButton />" }] },
  { name: "Link", category: "Actions", examples: [{ name: "Basic", code: "<Link />" }] },
  { name: "Card", category: "Layout", examples: [{ name: "Basic", code: "<Card />" }] },
  {
    name: "Unavailable",
    category: "Feedback",
    disabledReason: "The component is missing from the runtime scope.",
    examples: [],
  },
  { name: "Internal", category: "Internal", sandboxVisible: false, examples: [{ name: "Basic", code: "<Internal />" }] },
];

const Button = ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>;
const Card = () => <article>Card</article>;
const IconButton = () => <button type="button">Icon</button>;
const Link = () => <a href="#test">Link</a>;

beforeEach(() => window.localStorage.clear());

const renderSandbox = (storageKey: string, checkpointInterval = 5) => render(
  <LiveCodeSandboxProvider
    checkpointInterval={checkpointInterval}
    scope={{ Button, Card, IconButton, Link }}
    registry={registry}
    storageKey={storageKey}
  />,
);

const editorText = () => document.querySelector(".cm-content")?.textContent ?? "";

describe("LiveCodeSandboxProvider", () => {
  it("opens Components when a managed workspace starts empty", () => {
    render(
      <LiveCodeSandboxProvider
        initialCode=""
        managed
        registry={registry}
        scope={{ Button, Card, IconButton, Link }}
        storageKey="managed-empty"
      />
    );

    expect(screen.getByRole("button", { name: "Close components" })).toBeInTheDocument();
    expect(document.querySelector(".sb-live-code-sandbox__body")).toHaveAttribute("data-registry-open", "true");
  });

  it("keeps Components closed when a managed workspace starts with code", () => {
    render(
      <LiveCodeSandboxProvider
        initialCode="<Button>Save</Button>"
        managed
        registry={registry}
        scope={{ Button, Card, IconButton, Link }}
        storageKey="managed-filled"
      />
    );

    expect(screen.getByRole("button", { name: "Open components" })).toBeInTheDocument();
    expect(document.querySelector(".sb-live-code-sandbox__body")).not.toHaveAttribute("data-registry-open");
  });

  it("closes an unpinned managed component panel when pointing outside it", () => {
    render(
      <LiveCodeSandboxProvider
        initialCode="<Card />"
        managed
        registry={registry}
        scope={{ Button, Card, IconButton, Link }}
        storageKey="managed-outside-click"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Open components" }));
    expect(document.querySelector(".sb-live-code-sandbox__body")).toHaveAttribute("data-registry-open", "true");

    const separator = document.createElement("button");
    separator.setAttribute("role", "separator");
    document.body.append(separator);
    fireEvent.pointerDown(separator);
    fireEvent.pointerUp(separator);
    fireEvent.click(screen.getByLabelText("Composition preview"));
    expect(document.querySelector(".sb-live-code-sandbox__body")).toHaveAttribute("data-registry-open", "true");
    separator.remove();

    fireEvent.click(screen.getByLabelText("Composition preview"));
    expect(document.querySelector(".sb-live-code-sandbox__body")).not.toHaveAttribute("data-registry-open");
  });

  it("reopens Components when an empty managed stage is clicked", async () => {
    const user = userEvent.setup();
    render(
      <LiveCodeSandboxProvider
        initialCode=""
        managed
        registry={registry}
        scope={{ Button, Card, IconButton, Link }}
        storageKey="managed-empty-stage"
      />
    );

    await user.click(screen.getByRole("button", { name: "Close components" }));
    expect(screen.getByRole("button", { name: "Open components" })).toBeInTheDocument();

    await user.click(screen.getByLabelText("Composition preview"));
    expect(screen.getByRole("button", { name: "Close components" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Start composingChoose a component/ }));
    expect(screen.getByRole("button", { name: "Close components" })).toBeInTheDocument();
  });

  it("does not dismiss the component panel when using its toolbar toggle", async () => {
    const user = userEvent.setup();
    render(
      <LiveCodeSandboxProvider
        initialCode=""
        managed
        registry={registry}
        scope={{ Button, Card, IconButton, Link }}
        storageKey="managed-toggle"
      />
    );

    await user.click(screen.getByRole("button", { name: "Close components" }));
    expect(screen.getByRole("button", { name: "Open components" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open components" }));
    expect(screen.getByRole("button", { name: "Close components" })).toBeInTheDocument();
  });

  it("opens as an empty dedicated workspace with only visual components", () => {
    renderSandbox("empty");

    expect(screen.getByLabelText("Live code sandbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start composingChoose a component/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Internal" })).not.toBeInTheDocument();
    expect(screen.queryByText(/unbalanced/i)).not.toBeInTheDocument();
  });

  it("lets a UI artifact compose the workspace panels", () => {
    render(
      <LiveCodeSandboxProvider
        registry={registry}
        scope={{ Button, Card, IconButton, Link }}
        storageKey="custom-workspace"
        ui={{
          renderWorkspace: ({ editor, preview, registry: registryPanel }) => (
            <div data-testid="custom-workspace">{registryPanel}{editor}{preview}</div>
          )
        }}
      />
    );

    const workspace = screen.getByTestId("custom-workspace");
    expect(within(workspace).getByLabelText("Sandbox sidebar views")).toBeInTheDocument();
    expect(within(workspace).getByRole("textbox")).toBeInTheDocument();
    expect(within(workspace).getByLabelText("Composition preview")).toBeInTheDocument();
  });

  it("combines groups smaller than three under Other", async () => {
    const user = userEvent.setup();
    renderSandbox("groups");

    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.queryByText("Layout")).not.toBeInTheDocument();
    await user.click(screen.getByText("Other"));

    expect(screen.getByRole("button", { name: "Card" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unavailable: unavailable" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Button" })).not.toBeInTheDocument();
  });

  it("inserts a component selected from an adapted search field", async () => {
    const user = userEvent.setup();
    render(
      <LiveCodeSandboxProvider
        registry={registry}
        scope={{ Button, Card, IconButton, Link }}
        storageKey="search-select"
        ui={{
          renderField: ({ ariaLabel, onOptionSelect, options }) => (
            <button onClick={() => onOptionSelect?.(options?.[0]?.value ?? "")} type="button">
              {ariaLabel}
            </button>
          )
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Search components" }));
    expect(editorText()).toContain("<Button disabled>Save</Button>");
  });

  it("inserts a component, switches to Props, and sorts suggestions", async () => {
    const user = userEvent.setup();
    renderSandbox("props");

    await user.click(screen.getByRole("button", { name: "Button" }));
    expect(editorText()).toContain("Save</Button>");
    expect(editorText()).toContain("disabled");
    expect(screen.getByRole("tab", { name: "Props" })).toHaveAttribute("aria-selected", "true");

    const suggestions = within(screen.getByLabelText("Button prop suggestions")).getAllByRole("button");
    expect(suggestions.map((item) => item.getAttribute("aria-label"))).toEqual([
      "Choose color value",
      "Choose variant value",
      "Add advancedProp prop",
    ]);

    await user.click(screen.getByRole("button", { name: "Choose color value" }));
    expect(screen.getByLabelText("color values")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Set color to secondary" }));
    expect(editorText()).toContain('color="secondary"');
    expect(screen.getByRole("tab", { name: "Props" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("button", { name: "Choose variant value" }));
    expect(screen.getByLabelText("variant values")).toBeInTheDocument();
    await user.click(within(screen.getByLabelText("Sandbox sidebar views")).getByRole("tab", { name: "Components" }));
    await user.click(screen.getByRole("button", { name: "Button" }));
    await user.click(screen.getByRole("button", { name: "Choose variant value" }));
    expect(screen.getByLabelText("variant values")).toBeInTheDocument();
  });

  it("hides components that are not ready for sandbox insertion", () => {
    renderSandbox("warning");

    expect(screen.queryByRole("button", { name: "Unavailable: unavailable" })).not.toBeInTheDocument();
    expect(screen.queryByText("The component is missing from the runtime scope.")).not.toBeInTheDocument();
  });

  it("creates an interval checkpoint and lets the user delete then undo it", async () => {
    const user = userEvent.setup();
    renderSandbox("history", 2);
    await user.click(screen.getByRole("button", { name: "Button" }));
    await user.click(screen.getByRole("button", { name: "Choose variant value" }));
    await user.click(screen.getByRole("button", { name: "Set variant to primary" }));

    expect(screen.getByRole("button", { name: "Restore 2 insertions" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete 2 insertions checkpoint" }));
    expect(screen.queryByRole("button", { name: "Restore 2 insertions" })).not.toBeInTheDocument();
    expect(editorText()).toContain("Button");

    await user.click(within(screen.getByRole("status")).getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: "Restore 2 insertions" })).toBeInTheDocument();
  });

  it("creates one typing checkpoint on blur", async () => {
    const user = userEvent.setup();
    renderSandbox("typing");
    const content = screen.getByRole("textbox");
    await user.click(content);
    await user.keyboard("<Card />");
    fireEvent.blur(content);

    expect(await screen.findByRole("button", { name: "Restore Edited" })).toBeInTheDocument();
    const state = safeParseStorage(window.localStorage.getItem("typing"));
    expect(state.checkpoints.filter((checkpoint) => checkpoint.label === "Edited")).toHaveLength(1);
  });

  it("resets code and all history after confirmation without leaving the view", async () => {
    const user = userEvent.setup();
    renderSandbox("reset", 1);
    await user.click(screen.getByRole("button", { name: "Button" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("dialog", { name: "Reset sandbox?" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reset" }));

    expect(screen.getByLabelText("Live code sandbox")).toBeInTheDocument();
    expect(editorText()).toBe("");
    expect(screen.queryByRole("button", { name: "Restore 1 insertions" })).not.toBeInTheDocument();
    expect(safeParseStorage(window.localStorage.getItem("reset"))).toMatchObject({
      code: "",
      checkpoints: [],
      insertionActionCount: 0,
    });
  });

  it("applies a synchronized Storybook channel state to the mounted provider", async () => {
    const listeners = new Map<string, (payload: unknown) => void>();
    const channel = {
      emit: vi.fn(),
      on: vi.fn((eventName: string, listener: (payload: unknown) => void) => listeners.set(eventName, listener)),
      off: vi.fn(),
    };

    render(
      <LiveCodeSandboxProvider
        channel={channel}
        registry={registry}
        scope={{ Button, Card, IconButton, Link }}
        storageKey="channel-sync"
      />
    );

    const synchronized = createDefaultStorage("<Card />");
    listeners.get(getLiveCodeSandboxSyncEvent("channel-sync"))?.(synchronized);

    await waitFor(() => expect(editorText()).toContain("<Card />"));
    expect(screen.getByLabelText("Composition preview")).toHaveTextContent("Card");
  });
});
