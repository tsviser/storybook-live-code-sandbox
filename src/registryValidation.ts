import {
  addRequiredPropsToSnippet,
  getSafeTopLevelInsertionOffset,
} from "./editorState";
import type {
  LiveCodeRegistryItem,
  LiveCodeRegistryValidationIssue,
  LiveCodeScope,
} from "./types";

const identifierPattern = /^[A-Za-z_$][\w$]*$/;
const propNamePattern = /^[A-Za-z_:][\w:.-]*$/;
const unsafeExamplePattern = /(^|\n)\s*import(?:\s|\()|\b(?:eval|Function)\s*\(|\b(?:window|document)\s*\./m;

const issue = (
  issues: LiveCodeRegistryValidationIssue[],
  code: LiveCodeRegistryValidationIssue["code"],
  itemIndex: number,
  path: string,
  message: string,
) => issues.push({ code, itemIndex, message, path });

export function validateLiveCodeRegistry(
  registry: LiveCodeRegistryItem[],
  scope: LiveCodeScope,
): LiveCodeRegistryValidationIssue[] {
  const issues: LiveCodeRegistryValidationIssue[] = [];
  const itemNames = new Map<string, number>();
  const categories = new Map<string, string>();

  registry.forEach((item, itemIndex) => {
    const itemPath = `registry[${itemIndex}]`;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name || !identifierPattern.test(name) || name !== item.name) {
      issue(issues, "invalid-item-name", itemIndex, `${itemPath}.name`, "Registry item names must be trimmed JavaScript identifiers.");
    } else if (itemNames.has(name)) {
      issue(issues, "duplicate-item-name", itemIndex, `${itemPath}.name`, `Registry item name ${name} is duplicated.`);
    } else {
      itemNames.set(name, itemIndex);
    }

    const selectable = item.sandboxVisible !== false && !item.disabledReason;
    if (!selectable) return;

    if (name && !Object.prototype.hasOwnProperty.call(scope, name)) {
      issue(issues, "missing-scope-member", itemIndex, `${itemPath}.name`, `${name} is not present in the runtime scope.`);
    }

    if (item.category !== undefined) {
      const category = item.category.trim();
      const identity = category.toLocaleLowerCase();
      if (!category || category !== item.category || category === "__other__") {
        issue(issues, "invalid-category", itemIndex, `${itemPath}.category`, "Categories must be non-empty, trimmed, and cannot use the reserved __other__ identity.");
      } else {
        const existing = categories.get(identity);
        if (existing && existing !== category) {
          issue(issues, "inconsistent-category", itemIndex, `${itemPath}.category`, `Category ${category} conflicts with the existing ${existing} identity.`);
        } else {
          categories.set(identity, category);
        }
      }
    }

    if (!Array.isArray(item.examples) || item.examples.length === 0) {
      issue(issues, "missing-example", itemIndex, `${itemPath}.examples`, `${name || "Registry item"} needs an insertable example.`);
    } else {
      const exampleNames = new Set<string>();
      item.examples.forEach((example, exampleIndex) => {
        const examplePath = `${itemPath}.examples[${exampleIndex}]`;
        const exampleName = typeof example.name === "string" ? example.name.trim() : "";
        const code = typeof example.code === "string" ? example.code.trim() : "";
        if (!exampleName || exampleName !== example.name || exampleNames.has(exampleName)) {
          issue(issues, "invalid-example-name", itemIndex, `${examplePath}.name`, "Example names must be unique, non-empty, and trimmed within an item.");
        } else {
          exampleNames.add(exampleName);
        }
        if (!code || unsafeExamplePattern.test(code) || getSafeTopLevelInsertionOffset(code, 0) === null) {
          issue(issues, "unsafe-example", itemIndex, `${examplePath}.code`, "Examples must contain insertable JSX without imports, dynamic execution, or ambient browser access.");
          return;
        }
        const referencedComponents = Array.from(code.matchAll(/<([A-Z][\w$]*(?:\.[A-Z][\w$]*)?)(?=[\s/>])/g), (match) => match[1].split(".")[0]);
        const missingComponents = [...new Set(referencedComponents)].filter((component) =>
          !Object.prototype.hasOwnProperty.call(scope, component),
        );
        if (missingComponents.length) {
          issue(issues, "example-missing-scope", itemIndex, `${examplePath}.code`, `Example references missing scope values: ${missingComponents.join(", ")}.`);
        }
      });
    }

    const propNames = new Set<string>();
    for (const [propIndex, prop] of (item.props ?? []).entries()) {
      const propPath = `${itemPath}.props[${propIndex}]`;
      const propName = typeof prop.name === "string" ? prop.name.trim() : "";
      if (!propName || propName !== prop.name || !propNamePattern.test(propName)) {
        issue(issues, "invalid-prop", itemIndex, `${propPath}.name`, "Prop names must be non-empty, trimmed JSX attribute names.");
      } else if (propNames.has(propName)) {
        issue(issues, "duplicate-prop", itemIndex, `${propPath}.name`, `Prop ${propName} is duplicated.`);
      } else {
        propNames.add(propName);
      }
      if (prop.type !== undefined && !prop.type.trim()) {
        issue(issues, "invalid-prop", itemIndex, `${propPath}.type`, "Prop types must be non-empty when provided.");
      }
      if (prop.required && propName !== "children" && !prop.type?.trim()) {
        issue(issues, "invalid-prop", itemIndex, `${propPath}.type`, "Required props need a type so insertion can generate a value.");
      }
    }

    const firstExample = item.examples?.[0]?.code;
    if (firstExample) {
      const generated = addRequiredPropsToSnippet(firstExample, item.props);
      if (getSafeTopLevelInsertionOffset(generated, 0) === null) {
        issue(issues, "invalid-generated-example", itemIndex, `${itemPath}.examples[0].code`, "Adding required prop metadata makes the primary example invalid.");
      }
    }
  });

  return issues;
}
