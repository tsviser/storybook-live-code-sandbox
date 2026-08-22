import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { LiveError, LivePreview, LiveProvider } from "react-live";
import { describe, expect, it } from "vitest";
import { getPreviewCode, validateJsx } from "./editorState";

// These assertions are the evidence behind docs/preview-model.md. They describe
// the boundary of what the preview can evaluate, including the cases that fail
// quietly, so the document cannot drift away from the behavior it claims.

const Button = ({ children }: { children?: ReactNode }) => <button>{children}</button>;
const scope = { Button, useState };

async function preview(source: string) {
  const { container, unmount } = render(
    <LiveProvider code={getPreviewCode(source)} scope={scope} noInline={false}>
      <LivePreview />
      <LiveError />
    </LiveProvider>
  );
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  const text = (container.textContent ?? "").trim();
  unmount();
  return text;
}

describe("preview model: the draft is JSX children", () => {
  it("wraps the draft in a fragment and renders an empty draft as null", () => {
    expect(getPreviewCode("<Button/>")).toBe("<><Button/></>");
    expect(getPreviewCode("   ")).toBe("null");
  });

  it.each([
    ["a single element", "<Button>Save</Button>", "Save"],
    ["sibling elements", "<Button>A</Button>\n<Button>B</Button>", "AB"],
    ["an expression container", "{1 + 1}", "2"],
    ["a conditional", "{true ? <Button>yes</Button> : null}", "yes"],
    ["a mapped array", '{["a","b"].map((value) => <Button key={value}>{value}</Button>)}', "ab"],
    ["spread props", '<Button {...{ children: "spread" }} />', "spread"],
    ["an immediately invoked function", '{(() => "computed")()}', "computed"],
  ])("evaluates %s", async (_label, source, expected) => {
    expect(await preview(source)).toBe(expected);
  });
});

describe("preview model: text that looks like code", () => {
  it.each([
    ["an import statement", 'import x from "y";', 'import x from "y";'],
    ["a line comment", "// nothing", "// nothing"],
    ["a quoted string", "'plain text'", "'plain text'"],
    ["a render call", "render(<Button/>)", "render()"],
    ["a trailing semicolon", "<Button>A</Button>;", "A;"],
  ])("renders %s literally instead of failing", async (_label, source, expected) => {
    expect(await preview(source)).toBe(expected);
  });
});

describe("preview model: what fails", () => {
  it("does not execute a declaration, so a later reference fails", async () => {
    expect(await preview("const x = 1;\n<Button>{x}</Button>"))
      .toContain("ReferenceError: x is not defined");
  });

  it("rejects a function declaration outright", async () => {
    expect(await preview("function F(){return <Button/>}\n<F/>")).toContain("SyntaxError");
  });

  it("reports an unknown name at evaluation rather than statically", async () => {
    expect(validateJsx("<Missing/>")).toBeNull();
    expect(await preview("<Missing/>")).toContain("ReferenceError: Missing is not defined");
  });

  it("surfaces an error thrown by an expression", async () => {
    expect(await preview("{(() => { throw new Error('boom') })()}")).toContain("boom");
  });

  it.each([
    ["at the top level", '{useState("v")[0]}'],
    ["inside an immediately invoked function", '{(() => { const [v] = useState("x"); return <Button>{v}</Button>; })()}'],
  ])("rejects a hook call %s", async (_label, source) => {
    expect(await preview(source)).toContain("Invalid hook call");
  });
});

describe("preview model: static diagnostics", () => {
  it("flags a draft that does not parse", () => {
    expect(validateJsx("<Button>")).toBe("JSX appears incomplete: angle brackets are unbalanced.");
    expect(validateJsx("function F(){return <Button/>}\n<F/>"))
      .toBe("JSX appears incomplete: angle brackets are unbalanced.");
  });

  it("passes drafts that parse but cannot evaluate", () => {
    expect(validateJsx("const x = 1;\n<Button>{x}</Button>")).toBeNull();
    expect(validateJsx('import x from "y";')).toBeNull();
  });

  it("treats an empty draft as having nothing to report", () => {
    expect(validateJsx("   ")).toBeNull();
  });
});
