import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
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

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

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
  const listId = useId();
  if (ui?.renderField) return ui.renderField(props);

  const options = props.options ?? [];
  const canSuggest = options.length > 0 && Boolean(props.onOptionSelect);

  // `options` is the full candidate list rather than a pre-filtered one, so a
  // datalist is the control that matches: the browser narrows it while the user
  // types. Picking a suggestion reports `insertReplacementText`; typing reports
  // `insertText`. Where a browser omits `inputType` altogether, an exact match
  // on a suggestion is treated as a pick.
  const handleChange = (value: string, inputType: string | undefined) => {
    props.onChange(value);
    if (!canSuggest || !props.onOptionSelect) return;
    if (inputType && inputType !== "insertReplacementText") return;
    const picked = options.find((option) => option.value === value);
    if (picked) props.onOptionSelect(picked.value);
  };

  return (
    <>
      <input
        aria-label={props.ariaLabel}
        className={props.className}
        list={canSuggest ? listId : undefined}
        max={props.max}
        min={props.min}
        onChange={(event) => handleChange(event.currentTarget.value, (event.nativeEvent as InputEvent).inputType)}
        placeholder={props.placeholder}
        type={props.type}
        value={props.value}
      />
      {canSuggest ? (
        <datalist id={listId}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </datalist>
      ) : null}
    </>
  );
}

export function SandboxTabs({ ui, ...props }: SandboxTabsProps & { ui?: LiveCodeSandboxUIAdapter }) {
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  if (ui?.renderTabs) return ui.renderTabs(props);

  const selectable = props.tabs.filter((tab) => !tab.disabled);
  // Keep the strip reachable by Tab even when `value` names a disabled or
  // unknown tab, otherwise no button would carry tabIndex 0.
  const tabbableValue = props.tabs.some((tab) => tab.value === props.value)
    ? props.value
    : selectable[0]?.value;

  const activate = (value: string) => {
    props.onChange(value);
    buttonRefs.current.get(value)?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const { key } = event;
    if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") return;
    event.preventDefault();
    if (!selectable.length) return;
    const current = selectable.findIndex((tab) => tab.value === props.value);
    let next: number;
    if (key === "Home") next = 0;
    else if (key === "End") next = selectable.length - 1;
    else {
      const delta = key === "ArrowRight" ? 1 : -1;
      next = current < 0 ? 0 : (current + delta + selectable.length) % selectable.length;
    }
    activate(selectable[next].value);
  };

  return (
    <div aria-label={props.ariaLabel} className={props.className} role="tablist">
      {props.tabs.map((tab) => (
        <button
          aria-selected={props.value === tab.value}
          disabled={tab.disabled}
          key={tab.value}
          onClick={() => props.onChange(tab.value)}
          onKeyDown={onKeyDown}
          ref={(node) => {
            if (node) buttonRefs.current.set(tab.value, node);
            else buttonRefs.current.delete(tab.value);
          }}
          role="tab"
          tabIndex={tab.value === tabbableValue ? 0 : -1}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function SandboxDialog({ ui, ...props }: SandboxDialogProps & { ui?: LiveCodeSandboxUIAdapter }) {
  const baseId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const adapted = Boolean(ui?.renderDialog);
  const { onCancel, open } = props;

  // Move focus into the dialog on open and hand it back to whatever opened it
  // on close. An adapter supplying its own dialog owns this instead.
  useEffect(() => {
    if (adapted || !open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? node)?.focus();
    return () => restoreRef.current?.focus?.();
  }, [adapted, open]);

  useEffect(() => {
    if (adapted || !open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const node = dialogRef.current;
      if (!node) return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = node.contains(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [adapted, onCancel, open]);

  if (ui?.renderDialog) return ui.renderDialog(props);
  if (!open) return null;

  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;
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
