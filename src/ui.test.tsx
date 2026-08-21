import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SandboxDialog, SandboxField, SandboxTabs } from "./ui";

describe("default sandbox UI", () => {
  it("traps dialog focus, closes with Escape, and restores the trigger", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      const triggerRef = useRef<HTMLButtonElement | null>(null);
      return (
        <>
          <button onClick={() => setOpen(true)} ref={triggerRef} type="button">Open settings</button>
          <SandboxDialog
            cancelLabel="Cancel"
            confirmLabel="Save"
            description="Configure history."
            onCancel={() => setOpen(false)}
            onConfirm={() => setOpen(false)}
            open={open}
            returnFocusRef={triggerRef}
            title="History settings"
          >
            <input aria-label="Checkpoint interval" />
          </SandboxDialog>
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open settings" });
    await user.click(trigger);

    const firstField = screen.getByRole("textbox", { name: "Checkpoint interval" });
    expect(firstField).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
    await user.tab();
    expect(firstField).toHaveFocus();
    document.body.tabIndex = -1;
    document.body.focus();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("uses instance-unique dialog title and description IDs", () => {
    render(
      <>
        <SandboxDialog cancelLabel="Cancel" confirmLabel="Delete" description="First description" onCancel={() => {}} onConfirm={() => {}} open title="First dialog"><span /></SandboxDialog>
        <SandboxDialog cancelLabel="Cancel" confirmLabel="Delete" description="Second description" onCancel={() => {}} onConfirm={() => {}} open title="Second dialog"><span /></SandboxDialog>
      </>,
    );

    const [first, second] = screen.getAllByRole("dialog");
    expect(first?.getAttribute("aria-labelledby")).toBeTruthy();
    expect(first?.getAttribute("aria-labelledby")).not.toBe(second?.getAttribute("aria-labelledby"));
    expect(first?.getAttribute("aria-describedby")).not.toBe(second?.getAttribute("aria-describedby"));
  });

  it("associates tabs with panels and supports roving keyboard focus", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState("components");
      return (
        <>
          <SandboxTabs
            ariaLabel="Workspace views"
            onChange={setValue}
            tabs={[
              { label: "Components", panelId: "components-panel", value: "components" },
              { disabled: true, label: "Code", panelId: "code-panel", value: "code" },
              { label: "Preview", panelId: "preview-panel", value: "preview" },
            ]}
            value={value}
          />
          <div id="components-panel" role="tabpanel" />
          <div id="code-panel" role="tabpanel" />
          <div id="preview-panel" role="tabpanel" />
        </>
      );
    }

    render(<Harness />);
    const components = screen.getByRole("tab", { name: "Components" });
    const preview = screen.getByRole("tab", { name: "Preview" });
    expect(components).toHaveAttribute("aria-controls", "components-panel");
    expect(components).toHaveAttribute("tabindex", "0");
    components.focus();
    await user.keyboard("{ArrowRight}");
    expect(preview).toHaveFocus();
    expect(preview).toHaveAttribute("aria-selected", "true");
    expect(components).toHaveAttribute("tabindex", "-1");
    await user.keyboard("{Home}");
    expect(components).toHaveFocus();
    await user.keyboard("{End}");
    expect(preview).toHaveFocus();
  });

  it("reverses horizontal arrow navigation in RTL", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState("components");
      return (
        <div dir="rtl">
          <SandboxTabs
            ariaLabel="RTL views"
            onChange={setValue}
            tabs={[
              { label: "Components", value: "components" },
              { label: "Code", value: "code" },
              { label: "Preview", value: "preview" },
            ]}
            value={value}
          />
        </div>
      );
    }

    render(<Harness />);
    const components = screen.getByRole("tab", { name: "Components" });
    components.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");
  });

  it("offers search options and selects an exact option value", async () => {
    const user = userEvent.setup();
    const onOptionSelect = vi.fn();
    function Harness() {
      const [value, setValue] = useState("");
      return (
        <SandboxField
          ariaLabel="Search components"
          onChange={setValue}
          onOptionSelect={onOptionSelect}
          options={[{ label: "Button", value: "Button" }]}
          type="search"
          value={value}
        />
      );
    }

    render(<Harness />);
    const field = screen.getByRole("combobox", { name: "Search components" });
    expect(field).toHaveAttribute("list");
    await user.type(field, "Button");
    expect(onOptionSelect).toHaveBeenCalledWith("Button");
  });
});
