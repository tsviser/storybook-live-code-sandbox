import { describe, expect, it } from "vitest";
import { validateLiveCodeRegistry } from "./registryValidation";

const Button = () => null;

describe("validateLiveCodeRegistry", () => {
  it("accepts a selectable registry item backed by the runtime scope", () => {
    expect(validateLiveCodeRegistry([{
      name: "Button",
      category: "Actions",
      examples: [{ name: "Primary", code: '<Button label="Save" />' }],
      props: [{ name: "label", type: "string", required: true }],
    }], { Button })).toEqual([]);
  });

  it("rejects duplicate names and missing runtime scope members", () => {
    const issues = validateLiveCodeRegistry([
      { name: "Button", examples: [{ name: "One", code: "<Button />" }] },
      { name: "Button", examples: [{ name: "Two", code: "<Button />" }] },
      { name: "Missing", examples: [{ name: "Missing", code: "<Missing />" }] },
    ], { Button });

    expect(issues.map((item) => item.code)).toEqual(expect.arrayContaining([
      "duplicate-item-name",
      "missing-scope-member",
      "example-missing-scope",
    ]));
  });

  it("rejects unsafe, invalid, and scope-incomplete examples", () => {
    const issues = validateLiveCodeRegistry([{
      name: "Button",
      examples: [
        { name: "Unsafe", code: "<Button />; window.alert('no')" },
        { name: "Broken", code: "<Button" },
        { name: "Unknown", code: "<Unknown />" },
      ],
    }], { Button });

    expect(issues.map((item) => item.code)).toEqual(expect.arrayContaining([
      "unsafe-example",
      "example-missing-scope",
    ]));
  });

  it("rejects inconsistent category identities and invalid prop metadata", () => {
    const issues = validateLiveCodeRegistry([
      {
        name: "Button",
        category: "Actions",
        examples: [{ name: "One", code: "<Button />" }],
        props: [{ name: "label", required: true }, { name: "label", type: "string" }],
      },
      {
        name: "OtherButton",
        category: "actions",
        examples: [{ name: "Two", code: "<Button />" }],
      },
    ], { Button, OtherButton: Button });

    expect(issues.map((item) => item.code)).toEqual(expect.arrayContaining([
      "duplicate-prop",
      "inconsistent-category",
      "invalid-prop",
    ]));
  });

  it("allows unavailable and explicitly hidden metadata to remain descriptive", () => {
    expect(validateLiveCodeRegistry([
      { name: "Unavailable", disabledReason: "Not in scope", examples: [] },
      { name: "Internal", sandboxVisible: false, examples: [] },
    ], {})).toEqual([]);
  });
});
