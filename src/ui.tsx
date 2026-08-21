import { useEffect, useId, useRef } from "react";
import type {
  LiveCodeSandboxUIAdapter,
  SandboxButtonProps,
  SandboxChipProps,
  SandboxDialogProps,
  SandboxFieldProps,
  SandboxNotificationProps,
  SandboxSurfaceProps,
  SandboxTabsProps,
} from "./types";

export function SandboxButton({ ui, ...props }: SandboxButtonProps & { ui?: LiveCodeSandboxUIAdapter }) {
  if (ui?.renderButton) return ui.renderButton(props);
  return <button type="button" aria-label={props.ariaLabel} className={props.className} disabled={props.disabled} data-tone={props.tone} onClick={props.onClick}>{props.children}</button>;
}

export function SandboxSurface({ ui, ...props }: SandboxSurfaceProps & { ui?: LiveCodeSandboxUIAdapter }) {
  if (ui?.renderSurface) return ui.renderSurface(props);
  return <section aria-label={props.ariaLabel} className={props.className} ref={props.surfaceRef}>{props.children}</section>;
}

export function SandboxChip({ ui, ...props }: SandboxChipProps & { ui?: LiveCodeSandboxUIAdapter }) {
  if (ui?.renderChip) return ui.renderChip(props);
  return (
    <span className={props.className} data-color={props.color} data-density={props.density} data-pressed={props.pressed || undefined} title={props.title}>
      <button type="button" aria-label={props.ariaLabel} aria-pressed={props.pressed} disabled={props.disabled} onClick={props.onClick}>{props.label}</button>
      {props.onDelete ? <button type="button" aria-label={props.deleteLabel} onClick={props.onDelete}>×</button> : null}
    </span>
  );
}

export function SandboxField({ ui, ...props }: SandboxFieldProps & { ui?: LiveCodeSandboxUIAdapter }) {
  const optionListId = useId();
  if (ui?.renderField) return ui.renderField(props);
  const options = props.type === "search" ? props.options : undefined;
  return (
    <>
      <input
        aria-label={props.ariaLabel}
        className={props.className}
        list={options?.length ? optionListId : undefined}
        max={props.max}
        min={props.min}
        onChange={(event) => {
          const value = event.currentTarget.value;
          props.onChange(value);
          if (options?.some((option) => option.value === value)) props.onOptionSelect?.(value);
        }}
        placeholder={props.placeholder}
        type={props.type}
        value={props.value}
      />
      {options?.length ? (
        <datalist id={optionListId}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </datalist>
      ) : null}
    </>
  );
}

export function SandboxTabs({ ui, ...props }: SandboxTabsProps & { ui?: LiveCodeSandboxUIAdapter }) {
  const generatedId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activateRelativeTab = (currentIndex: number, direction: 1 | -1) => {
    for (let distance = 1; distance <= props.tabs.length; distance += 1) {
      const index = (currentIndex + direction * distance + props.tabs.length) % props.tabs.length;
      const tab = props.tabs[index];
      if (tab && !tab.disabled) {
        props.onChange(tab.value);
        tabRefs.current[index]?.focus();
        return;
      }
    }
  };
  const activateBoundaryTab = (fromEnd: boolean) => {
    const indexes = props.tabs.map((_, index) => index);
    if (fromEnd) indexes.reverse();
    const index = indexes.find((candidate) => !props.tabs[candidate]?.disabled);
    if (index === undefined) return;
    const tab = props.tabs[index];
    if (!tab) return;
    props.onChange(tab.value);
    tabRefs.current[index]?.focus();
  };
  if (ui?.renderTabs) return ui.renderTabs(props);
  return (
    <div aria-label={props.ariaLabel} aria-orientation="horizontal" className={props.className} role="tablist">
      {props.tabs.map((tab, index) => {
        const selected = props.value === tab.value;
        const tabId = tab.id ?? `${generatedId}-tab-${index}`;
        return (
          <button
            aria-controls={tab.panelId}
            aria-selected={selected}
            disabled={tab.disabled}
            id={tabId}
            key={tab.value}
            onClick={() => props.onChange(tab.value)}
            onKeyDown={(event) => {
              const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                const visualDirection = event.key === "ArrowRight" ? 1 : -1;
                activateRelativeTab(index, (rtl ? -visualDirection : visualDirection) as 1 | -1);
              } else if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                activateBoundaryTab(event.key === "End");
              }
            }}
            ref={(element) => { tabRefs.current[index] = element; }}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function SandboxDialog({ ui, ...props }: SandboxDialogProps & { ui?: LiveCodeSandboxUIAdapter }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(props.onCancel);
  onCancelRef.current = props.onCancel;

  useEffect(() => {
    if (ui?.renderDialog || !props.open) return undefined;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ) ?? []);
    (focusable()[0] ?? dialog)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [props.open, ui?.renderDialog]);

  if (ui?.renderDialog) return ui.renderDialog(props);
  if (!props.open) return null;
  return (
    <div className="sb-live-code-sandbox__dialogBackdrop" role="presentation">
      <section aria-describedby={descriptionId} aria-labelledby={titleId} aria-modal="true" className="sb-live-code-sandbox__dialog" ref={dialogRef} role="dialog" tabIndex={-1}>
        <h2 id={titleId}>{props.title}</h2>
        <p id={descriptionId}>{props.description}</p>
        {props.children}
        <div><SandboxButton onClick={props.onCancel}>{props.cancelLabel}</SandboxButton><SandboxButton onClick={props.onConfirm} tone="danger">{props.confirmLabel}</SandboxButton></div>
      </section>
    </div>
  );
}

export function SandboxNotification({ ui, ...props }: SandboxNotificationProps & { ui?: LiveCodeSandboxUIAdapter }) {
  if (ui?.renderNotification) return ui.renderNotification(props);
  return (
    <div className={`sb-live-code-sandbox__toast sb-live-code-sandbox__toast--${props.tone}`} role={props.tone === "warning" ? "alert" : "status"}>
      <span>{props.message}</span>
      {props.actionLabel && props.onAction ? <button type="button" onClick={props.onAction}>{props.actionLabel}</button> : null}
      <button type="button" aria-label="Dismiss notification" onClick={props.onDismiss}>Close</button>
    </div>
  );
}
