import { describe, expect, it } from "vitest";
import { sortRegistryCategories } from "./SandboxRegistry";

describe("sortRegistryCategories", () => {
  it("puts common composition categories before lower-priority groups", () => {
    expect(sortRegistryCategories([
      "Feedback",
      "Overlays",
      "Navigation",
      "Forms",
      "Data Display",
      "Actions",
      "Layout",
      "Custom",
    ])).toEqual([
      "Layout",
      "Actions",
      "Data Display",
      "Forms",
      "Navigation",
      "Overlays",
      "Feedback",
      "Custom",
    ]);
  });

  it("keeps unknown categories stable after the relevant groups", () => {
    expect(sortRegistryCategories(["Brand", "Layout", "Utilities", "Branding"])).toEqual([
      "Layout",
      "Brand",
      "Utilities",
      "Branding",
    ]);
  });
});
