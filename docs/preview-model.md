# Preview model

This document describes what the sandbox preview can evaluate, what it cannot,
and how failures are reported. Every behavior below was measured against the
package's own evaluation path rather than inferred from `react-live`'s
documentation, and each one is asserted in `src/previewModel.test.tsx`.

## The draft is JSX children, not a program

The editor's content is wrapped before evaluation. `getPreviewCode` turns the
draft into `<>{draft}</>` and hands that to `react-live` with `noInline` set to
false, so the whole composition is evaluated as **one JSX expression**. An empty
draft becomes `null`.

Everything that follows is a consequence of that single fact. The draft occupies
the position of children inside a fragment, so anything that is not an element
or a `{...}` expression container is treated as JSX text.

## Supported

These patterns work as written:

```jsx
<Button>Save</Button>

<Button>A</Button>
<Button>B</Button>

{1 + 1}
{true ? <Button>yes</Button> : null}
{["a", "b"].map((value) => <Button key={value}>{value}</Button>)}
<Button {...{ children: "spread" }} />
{(() => "computed")()}
```

Multiple top-level elements are fine because of the fragment wrapper. Any
JavaScript expression is available inside `{}`, including immediately invoked
functions.

## Silently rendered as text

These produce no error. They are valid JSX text, so they appear in the preview
literally, which is usually not what the author intended.

| Draft | Preview shows |
| --- | --- |
| `import x from "y";` | `import x from "y";` |
| `// nothing` | `// nothing` |
| `'plain text'` | `'plain text'` (with quotes) |
| `render(<Button/>)` | `render()` |
| `<Button>A</Button>;` | `A;` |

`render()` deserves particular attention. It is the `react-live` API for
`noInline` mode, which this package does not use. Writing it does not fail; it
prints.

## Statements do not execute

A declaration followed by a use is the most common way to be misled, because the
declaration becomes text and the reference then fails at runtime:

```jsx
const x = 1;
<Button>{x}</Button>
```

The preview reports `ReferenceError: x is not defined`. The `const` line was
never executed. Assign inside an expression container instead, or pass the value
through `scope`.

A `function` declaration fails earlier, with `SyntaxError: Unexpected token`.

## Hooks are unavailable

The draft is an expression, not a component body, so React hooks cannot run:

```jsx
{useState("v")[0]}
```

reports `Error: Invalid hook call`. Wrapping the call in an immediately invoked
function does not help, because that function is still not a component. A
composition that needs state should receive an already-stateful component
through `scope`.

## How failures are reported

Two mechanisms operate at different times.

`validateJsx` is a static check that runs against the draft before evaluation.
It parses the source and reports whether the parse tree contains errors. It is a
structural check only: it catches unbalanced angle brackets and a `function`
declaration, and it returns a single fixed message, `JSX appears incomplete:
angle brackets are unbalanced.` That message is accurate for the common case and
misleading for the others, so treat it as "this draft does not parse" rather
than as a description of the fault.

Everything else surfaces at evaluation. Unknown names raise
`ReferenceError: <name> is not defined`, and an expression that throws reports
its own error. These reach the user through `react-live`'s error channel, which
the package renders as an assertive alert.

A failed run does not blank the canvas. The preview keeps the last successful
composition, so an invalid intermediate draft never destroys the working state.

## Trust boundary

The preview evaluates code in the Storybook preview page and inherits that
page's providers and runtime context. It is not a security boundary. Expose only
trusted values through `scope`, and do not use the sandbox to run untrusted
code.
