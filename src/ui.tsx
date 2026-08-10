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
  if (ui?.renderField) return ui.renderField(props);
  return <input aria-label={props.ariaLabel} className={props.className} max={props.max} min={props.min} onChange={(event) => props.onChange(event.currentTarget.value)} placeholder={props.placeholder} type={props.type} value={props.value} />;
}

export function SandboxTabs({ ui, ...props }: SandboxTabsProps & { ui?: LiveCodeSandboxUIAdapter }) {
  if (ui?.renderTabs) return ui.renderTabs(props);
  return (
    <div aria-label={props.ariaLabel} className={props.className} role="tablist">
      {props.tabs.map((tab) => <button aria-selected={props.value === tab.value} disabled={tab.disabled} key={tab.value} onClick={() => props.onChange(tab.value)} role="tab" type="button">{tab.label}</button>)}
    </div>
  );
}

export function SandboxDialog({ ui, ...props }: SandboxDialogProps & { ui?: LiveCodeSandboxUIAdapter }) {
  if (ui?.renderDialog) return ui.renderDialog(props);
  if (!props.open) return null;
  return (
    <div className="sb-live-code-sandbox__dialogBackdrop" role="presentation">
      <section aria-describedby="sandbox-dialog-description" aria-labelledby="sandbox-dialog-title" aria-modal="true" className="sb-live-code-sandbox__dialog" role="dialog">
        <h2 id="sandbox-dialog-title">{props.title}</h2>
        <p id="sandbox-dialog-description">{props.description}</p>
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
