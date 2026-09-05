import { useId, useMemo, useState } from "react";
import type { LiveCodeRegistryItem, LiveCodeRegistryProp, LiveCodeSandboxUIAdapter } from "./types";
import { getStringLiteralOptions } from "./editorState";
import { SandboxButton, SandboxChip, SandboxField, SandboxTabs } from "./ui";

export type RegistryTab = "components" | "props";
const OTHER_CATEGORY = "__other__";

type SandboxRegistryProps = {
  activeCategory: string;
  activeTab: RegistryTab;
  filter: string;
  registry: LiveCodeRegistryItem[];
  selectedItem: LiveCodeRegistryItem | null;
  ui?: LiveCodeSandboxUIAdapter;
  usedPropNames: string[];
  workspacePanelId?: string;
  onCategoryChange: (category: string) => void;
  onFilterChange: (filter: string) => void;
  onInsert: (item: LiveCodeRegistryItem) => void;
  onInsertProp: (prop: LiveCodeRegistryProp) => void;
  onClose?: () => void;
  onPinnedChange?: (pinned: boolean) => void;
  pinned?: boolean;
  onTabChange: (tab: RegistryTab) => void;
};

const importanceOrder = { high: 1, normal: 2, advanced: 3 } as const;

const categoryRelevance = [
  ["layout"],
  ["actions", "action", "buttons", "button", "controls", "control"],
  ["data display", "data", "content"],
  ["forms", "form"],
  ["navigation", "nav"],
  ["overlays", "overlay", "menu", "menus", "modal", "modals", "dialog", "dialogs"],
  ["feedback", "feedback and status", "status"],
] as const;

function normalizeCategory(category: string) {
  return category.trim().toLowerCase().replace(/\s+/g, " ");
}

function categoryPriority(category: string) {
  const normalized = normalizeCategory(category);
  const priority = categoryRelevance.findIndex((aliases) => (aliases as readonly string[]).includes(normalized));
  return priority === -1 ? categoryRelevance.length : priority;
}

export function sortRegistryCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const priorityDifference = categoryPriority(a) - categoryPriority(b);
    return priorityDifference || categories.indexOf(a) - categories.indexOf(b);
  });
}

export function sortSuggestedProps(props: LiveCodeRegistryProp[]): LiveCodeRegistryProp[] {
  return [...props].sort((a, b) => {
    const aRank = a.required ? 0 : importanceOrder[a.importance ?? "normal"];
    const bRank = b.required ? 0 : importanceOrder[b.importance ?? "normal"];
    return aRank - bRank || a.name.localeCompare(b.name);
  });
}

export function SandboxRegistry({
  activeCategory,
  activeTab,
  filter,
  registry,
  selectedItem,
  ui,
  usedPropNames,
  workspacePanelId,
  onCategoryChange,
  onFilterChange,
  onInsert,
  onInsertProp,
  onClose,
  onPinnedChange,
  pinned = false,
  onTabChange,
}: SandboxRegistryProps) {
  const [activeValueProp, setActiveValueProp] = useState<string | null>(null);
  const tabsId = useId();
  const visualRegistry = useMemo(
    () => registry.filter((item) => item.sandboxVisible !== false && !item.disabledReason),
    [registry],
  );
  const categoryModel = useMemo(() => {
    const counts = new Map<string, number>();
    const ordered: string[] = [];
    for (const item of visualRegistry) {
      if (!item.category) continue;
      if (!counts.has(item.category)) ordered.push(item.category);
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    const small = new Set(ordered.filter((category) => (counts.get(category) ?? 0) < 3));
    return {
      counts,
      categories: sortRegistryCategories(ordered.filter((category) => !small.has(category))),
      small,
      otherCount: Array.from(small).reduce((total, category) => total + (counts.get(category) ?? 0), 0),
    };
  }, [visualRegistry]);
  const visibleItems = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return visualRegistry.filter((item) => {
      const categoryMatches = !activeCategory ||
        (activeCategory === OTHER_CATEGORY
          ? Boolean(item.category && categoryModel.small.has(item.category))
          : item.category === activeCategory);
      if (!categoryMatches) return false;
      return !query || [item.name, item.category, item.description].some((value) =>
        value?.toLowerCase().includes(query),
      );
    });
  }, [activeCategory, categoryModel.small, filter, visualRegistry]);
  const suggestedProps = selectedItem?.props
    ? sortSuggestedProps(selectedItem.props.filter(
        (prop) => prop.name !== "children" && !usedPropNames.includes(prop.name),
      ))
    : [];

  return (
    <aside aria-label="Sandbox sidebar" className="sb-live-code-sandbox__registry" id={workspacePanelId} role={workspacePanelId ? "tabpanel" : undefined}>
      <div className="sb-live-code-sandbox__registryHeader">
        <SandboxTabs
          ariaLabel="Sandbox sidebar views"
          className="sb-live-code-sandbox__sideTabs"
          onChange={(value) => onTabChange(value as RegistryTab)}
          tabs={[
            { id: `${tabsId}-components-tab`, label: "Components", panelId: `${tabsId}-components-panel`, value: "components" },
            { disabled: !selectedItem, id: `${tabsId}-props-tab`, label: "Props", panelId: `${tabsId}-props-panel`, value: "props" },
          ]}
          ui={ui}
          value={activeTab}
        />
        {onPinnedChange ? (
          <SandboxButton
            ariaLabel={pinned ? "Unpin component panel" : "Pin component panel"}
            className="sb-live-code-sandbox__registryPin"
            icon={pinned ? "pin-off" : "pin"}
            onClick={() => onPinnedChange(!pinned)}
            ui={ui}
          >
            {pinned ? "Unpin component panel" : "Pin component panel"}
          </SandboxButton>
        ) : null}
        {onClose ? (
          <SandboxButton
            ariaLabel="Hide component panel"
            className="sb-live-code-sandbox__registryClose"
            icon="close"
            onClick={onClose}
            ui={ui}
          >
            Hide component panel
          </SandboxButton>
        ) : null}
      </div>
      {activeTab === "components" ? (
        <div aria-labelledby={`${tabsId}-components-tab`} className="sb-live-code-sandbox__registryTabPanel" id={`${tabsId}-components-panel`} role="tabpanel">
          <SandboxField
            ariaLabel="Search components"
            onChange={onFilterChange}
            onOptionSelect={(value) => {
              const item = visualRegistry.find((candidate) => candidate.name === value);
              if (item) {
                setActiveValueProp(null);
                onInsert(item);
              }
            }}
            options={visualRegistry.map((item) => ({ label: item.name, value: item.name }))}
            placeholder="Search components"
            type="search"
            ui={ui}
            value={filter}
          />
          <div className="sb-live-code-sandbox__categoryFilters" aria-label="Component groups">
            <SandboxChip label={<>All <span>{visualRegistry.length}</span></>} onClick={() => onCategoryChange("")} pressed={!activeCategory} ui={ui} />
            {categoryModel.categories.map((category) => (
              <SandboxChip
                key={category}
                label={<>{category} <span>{categoryModel.counts.get(category)}</span></>}
                onClick={() => onCategoryChange(activeCategory === category ? "" : category)}
                pressed={activeCategory === category}
                ui={ui}
              />
            ))}
            {categoryModel.otherCount > 0 ? (
              <SandboxChip
                label={<>Other <span>{categoryModel.otherCount}</span></>}
                onClick={() => onCategoryChange(activeCategory === OTHER_CATEGORY ? "" : OTHER_CATEGORY)}
                pressed={activeCategory === OTHER_CATEGORY}
                ui={ui}
              />
            ) : null}
          </div>
          <div className="sb-live-code-sandbox__registryList">
            {visibleItems.map((item) => (
              <SandboxButton
                ariaLabel={item.disabledReason ? `${item.name}: unavailable` : item.name}
                className={item.disabledReason ? "is-unavailable" : undefined}
                key={item.name}
                onClick={() => {
                  setActiveValueProp(null);
                  onInsert(item);
                }}
                ui={ui}
              >
                <span>{item.name}</span>
                {item.description ? <small>{item.description}</small> : null}
              </SandboxButton>
            ))}
            {visibleItems.length === 0 ? <p className="sb-live-code-sandbox__empty">No visual components found.</p> : null}
          </div>
        </div>
      ) : (
        <div aria-label={`${selectedItem?.name ?? "Component"} prop suggestions`} className="sb-live-code-sandbox__propSuggestions sb-live-code-sandbox__registryTabPanel" id={`${tabsId}-props-panel`} role="tabpanel">
          <strong>{selectedItem?.name} props</strong>
          {suggestedProps.length ? (
            <div className="sb-live-code-sandbox__propList">
              {suggestedProps.map((prop) => {
                const values = getStringLiteralOptions(prop.type);
                const hasValueSuggestions = values.length > 1;
                const isExpanded = activeValueProp === prop.name;
                return (
                  <div className="sb-live-code-sandbox__propOption" key={prop.name}>
                    <SandboxChip
                      ariaLabel={hasValueSuggestions ? `Choose ${prop.name} value` : `Add ${prop.name} prop`}
                      label={<>{prop.name}{prop.required ? " *" : ""}</>}
                      onClick={() => hasValueSuggestions
                        ? setActiveValueProp(isExpanded ? null : prop.name)
                        : onInsertProp(prop)}
                      pressed={isExpanded}
                      title={[prop.type, prop.description].filter(Boolean).join(" - ")}
                      ui={ui}
                    />
                    {isExpanded ? (
                      <div className="sb-live-code-sandbox__propValues" aria-label={`${prop.name} values`}>
                        {values.map((value) => (
                          <SandboxChip
                            ariaLabel={`Set ${prop.name} to ${value}`}
                            className="sb-live-code-sandbox__propValueChip"
                            color="secondary"
                            density="compact"
                            key={value}
                            label={value}
                            onClick={() => {
                              onInsertProp({ ...prop, defaultValue: value });
                              setActiveValueProp(null);
                            }}
                            ui={ui}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : <p className="sb-live-code-sandbox__empty">No remaining prop suggestions.</p>}
        </div>
      )}
    </aside>
  );
}
