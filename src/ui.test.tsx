import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SandboxDialog, SandboxField, SandboxTabs } from "./ui";

// These cover the fallback artifact with no adapter supplied. The adapted path
// is exercised elsewhere and cannot stand in for this one: an adapter replaces
// the markup entirely, so a passing adapted test says nothing about what a
// consumer gets out of the box.

describe("SandboxField without an adapter", () => {
  const options = [
    { label: "Button", value: "Button" },
    { label: "Card", value: "Card" },
  ];

  it("offers the supplied options as suggestions", () => {
    render(
      <SandboxField
        ariaLabel="Search components"
        onChange={() => {}}
        onOptionSelect={() => {}}
        options={options}
        type="search"
        value=""
      />
    );

    const input = screen.getByLabelText("Search components");
    const listId = input.getAttribute("list");
    expect(listId).toBeTruthy();

    const datalist = document.getElementById(listId as string);
    expect(datalist?.tagName).toBe("DATALIST");
    expect(Array.from(datalist?.querySelectorAll("option") ?? []).map((node) => node.getAttribute("value")))
      .toEqual(["Button", "Card"]);
  });

  it("reports a picked suggestion through onOptionSelect", () => {
    const onOptionSelect = vi.fn();
    const onChange = vi.fn();
    render(
      <SandboxField
        ariaLabel="Search components"
        onChange={onChange}
        onOptionSelect={onOptionSelect}
        options={options}
        type="search"
        value=""
      />
    );

    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "Card" } });

    expect(onChange).toHaveBeenCalledWith("Card");
    expect(onOptionSelect).toHaveBeenCalledWith("Card");
  });

  it("does not treat ordinary typing as a suggestion pick", async () => {
    const user = userEvent.setup();
    const onOptionSelect = vi.fn();

    function Harness() {
      const [value, setValue] = useState("");
      return (
        <SandboxField
          ariaLabel="Search components"
          onChange={setValue}
          onOptionSelect={onOptionSelect}
          options={options}
          type="search"
          value={value}
        />
      );
    }

    render(<Harness />);
    await user.type(screen.getByLabelText("Search components"), "Card");

    expect(screen.getByLabelText("Search components")).toHaveValue("Card");
    expect(onOptionSelect).not.toHaveBeenCalled();
  });

  it("renders a plain field when no options are supplied", () => {
    render(<SandboxField ariaLabel="History limit" onChange={() => {}} type="number" value={8} />);

    expect(screen.getByLabelText("History limit")).not.toHaveAttribute("list");
    expect(document.querySelector("datalist")).toBeNull();
  });
});

describe("SandboxTabs without an adapter", () => {
  const tabs = [
    { label: "Components", value: "components" },
    { label: "Props", value: "props" },
    { label: "Preview", value: "preview" },
  ];

  function TabsHarness({ initial = "components", items = tabs }: { initial?: string; items?: typeof tabs }) {
    const [value, setValue] = useState(initial);
    return <SandboxTabs ariaLabel="Views" onChange={setValue} tabs={items} value={value} />;
  }

  it("exposes only the selected tab to the tab sequence", () => {
    render(<TabsHarness />);

    expect(screen.getByRole("tab", { name: "Components" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Props" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves between tabs with the arrow keys and wraps at the ends", async () => {
    const user = userEvent.setup();
    render(<TabsHarness />);

    screen.getByRole("tab", { name: "Components" }).focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Props" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Props" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Components" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveFocus();
  });

  it("jumps to the first and last tab with Home and End", async () => {
    const user = userEvent.setup();
    render(<TabsHarness initial="props" />);

    screen.getByRole("tab", { name: "Props" }).focus();

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Components" })).toHaveFocus();
  });

  it("skips a disabled tab when navigating", async () => {
    const user = userEvent.setup();
    render(<TabsHarness items={[
      { label: "Components", value: "components" },
      { disabled: true, label: "Props", value: "props" },
      { label: "Preview", value: "preview" },
    ]} />);

    screen.getByRole("tab", { name: "Components" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Preview" })).toHaveFocus();
  });

  it("keeps the strip reachable when the value matches no tab", () => {
    render(<TabsHarness initial="nothing" />);

    expect(screen.getByRole("tab", { name: "Components" })).toHaveAttribute("tabindex", "0");
  });
});

describe("SandboxDialog without an adapter", () => {
  function DialogHarness({ onCancel = () => {}, onConfirm = () => {} }) {
    return (
      <SandboxDialog
        cancelLabel="Cancel"
        confirmLabel="Reset"
        description="This clears the composition."
        onCancel={onCancel}
        onConfirm={onConfirm}
        open
        title="Reset sandbox?"
      ><span /></SandboxDialog>
    );
  }

  it("labels itself with the ids it actually renders", () => {
    render(<DialogHarness />);

    const dialog = screen.getByRole("dialog");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    const describedBy = dialog.getAttribute("aria-describedby");

    expect(document.getElementById(labelledBy as string)).toHaveTextContent("Reset sandbox?");
    expect(document.getElementById(describedBy as string)).toHaveTextContent("This clears the composition.");
  });

  it("gives two open dialogs distinct ids", () => {
    render(<><DialogHarness /><DialogHarness /></>);

    const [first, second] = screen.getAllByRole("dialog");
    expect(first.getAttribute("aria-labelledby")).not.toBe(second.getAttribute("aria-labelledby"));
    expect(document.querySelectorAll(`#${CSS.escape(first.getAttribute("aria-labelledby") as string)}`)).toHaveLength(1);
  });

  it("cancels on Escape", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<DialogHarness onCancel={onCancel} />);

    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the dialog when it opens", () => {
    render(<DialogHarness />);

    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  it("keeps Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Reset" });

    cancel.focus();
    await user.tab();
    expect(confirm).toHaveFocus();

    await user.tab();
    expect(cancel).toHaveFocus();

    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
  });

  it("restores focus to the opener when it closes", async () => {
    const user = userEvent.setup();

    function OpenerHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)} type="button">Open settings</button>
          <SandboxDialog
            cancelLabel="Cancel"
            confirmLabel="Save"
            description="Settings"
            onCancel={() => setOpen(false)}
            onConfirm={() => setOpen(false)}
            open={open}
            title="History settings"
          ><span /></SandboxDialog>
        </>
      );
    }

    render(<OpenerHarness />);
    const opener = screen.getByRole("button", { name: "Open settings" });
    opener.focus();

    await user.click(opener);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("leaves keyboard handling to an adapter that supplies its own dialog", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <SandboxDialog
        cancelLabel="Cancel"
        confirmLabel="Reset"
        description="Adapted"
        onCancel={onCancel}
        onConfirm={() => {}}
        open
        title="Adapted dialog"
        ui={{ renderDialog: () => <div>adapted dialog</div> }}
      ><span /></SandboxDialog>
    );

    await user.keyboard("{Escape}");

    expect(screen.getByText("adapted dialog")).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
