import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";
import { LiveCodeSandboxProvider } from "./LiveCodeSandboxProvider";

const registry = [
  {
    name: "Button",
    description: "Action control",
    examples: [{ name: "Primary", code: "<Button>Save</Button>" }],
  },
];

const Button = ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>;

beforeEach(() => {
  window.localStorage.clear();
});

describe("LiveCodeSandboxProvider", () => {
  it("persists and restores state", async () => {
    const user = userEvent.setup();
    const storageKey = "sandbox-test";

    const { unmount } = render(
      <LiveCodeSandboxProvider scope={{ Button }} registry={registry} storageKey={storageKey}>
        <div>Story one</div>
      </LiveCodeSandboxProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Sandbox" }));
    await user.click(screen.getByRole("button", { name: /Button/ }));
    expect(window.localStorage.getItem(storageKey)).toContain("Button");

    unmount();

    render(
      <LiveCodeSandboxProvider scope={{ Button }} registry={registry} storageKey={storageKey}>
        <div>Story two</div>
      </LiveCodeSandboxProvider>,
    );

    expect(screen.getByLabelText("Live code sandbox")).toBeInTheDocument();
    expect(await screen.findByText("Save")).toBeInTheDocument();
  });

  it("keeps one editor instance across drawer and fullscreen toggle", async () => {
    const user = userEvent.setup();

    render(
      <LiveCodeSandboxProvider scope={{ Button }} registry={registry} storageKey="single-editor">
        <div>Story</div>
      </LiveCodeSandboxProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Sandbox" }));
    const editor = document.querySelector(".cm-editor");
    expect(editor).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Fullscreen" }));
    expect(document.querySelectorAll(".cm-editor")).toHaveLength(1);
    expect(document.querySelector(".cm-editor")).toBe(editor);

    await user.click(screen.getByRole("button", { name: "Drawer" }));
    expect(document.querySelectorAll(".cm-editor")).toHaveLength(1);
    expect(document.querySelector(".cm-editor")).toBe(editor);
  });
});
