import { isolateHistory, undo } from "@codemirror/commands";
import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { LiveContext, LiveError, LivePreview, LiveProvider } from "react-live";
import * as React from "react";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { LiveCodeEditor, type EditorChangeKind } from "./LiveCodeEditor";
import { SandboxRegistry, type RegistryTab } from "./SandboxRegistry";
import {
  DEFAULT_CHECKPOINT_INTERVAL,
  DEFAULT_CODE,
  DEFAULT_HISTORY_LIMIT,
  addRequiredPropsToSnippet,
  addCheckpoint,
  createDefaultStorage,
  createPropAssignment,
  getOpeningTagPropNames,
  getPreviewCode,
  getPropInsertionOffset,
  insertSnippet,
  insertSnippetSafely,
  normalizeCheckpointInterval,
  normalizeHistoryLimit,
  readSandboxStorage,
  safeParseStorage,
  validateJsx,
  writeSandboxStorage,
} from "./editorState";
import type {
  LiveCodeCheckpoint,
  LiveCodeRegistryItem,
  LiveCodeRegistryProp,
  LiveCodeSandboxProviderProps,
  LiveCodeSandboxStorage,
} from "./types";
import { getLiveCodeSandboxSyncEvent } from "./events";
import { SandboxButton, SandboxChip, SandboxDialog, SandboxField, SandboxNotification, SandboxSurface, SandboxTabs } from "./ui";
import "./styles.css";

type Notice = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  tone: "status" | "warning";
};

type PendingInsertion = { cursorOffset: number } | null;

function RuntimeErrorReporter({ onError }: { onError: (message: string) => void }) {
  const { error } = useContext(LiveContext);
  const lastErrorRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!error || error === lastErrorRef.current) return;
    lastErrorRef.current = error;
    onError(error);
  }, [error, onError]);
  return null;
}

const formatCheckpointLabel = (checkpoint: LiveCodeCheckpoint) =>
  `${checkpoint.label} · ${new Date(checkpoint.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

export function LiveCodeSandboxProvider({
  children,
  channel,
  scope,
  registry,
  storageKey,
  initialCode = DEFAULT_CODE,
  checkpointInterval = DEFAULT_CHECKPOINT_INTERVAL,
  historyLimit = DEFAULT_HISTORY_LIMIT,
  managed = false,
  forceRegistryPinned = false,
  hideFullscreenAction = false,
  hideWorkspaceOrientationAction = false,
  onWorkspaceOrientationChange,
  toolbarActions,
  ui,
  workspaceOrientation = "horizontal",
}: LiveCodeSandboxProviderProps) {
  const [state, setState] = useState<LiveCodeSandboxStorage>(() => {
    if (typeof window === "undefined") return createDefaultStorage(initialCode, checkpointInterval, historyLimit);
    return safeParseStorage(readSandboxStorage(storageKey), initialCode, checkpointInterval, historyLimit);
  });
  const [filter, setFilter] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [activeRegistryTab, setActiveRegistryTab] = useState<RegistryTab>("components");
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState(managed ? "code" : "components");
  const [registryOpen, setRegistryOpen] = useState(!managed || !state.code.trim());
  const [registryPinned, setRegistryPinned] = useState(false);
  const effectiveRegistryPinned = forceRegistryPinned || registryPinned;
  const [selectedItem, setSelectedItem] = useState<LiveCodeRegistryItem | null>(null);
  const [activeCheckpointId, setActiveCheckpointId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftInterval, setDraftInterval] = useState(state.checkpointInterval);
  const [draftLimit, setDraftLimit] = useState(state.historyLimit);
  const [resetVersion, setResetVersion] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const stateRef = useRef(state);
  const typingDirtyRef = useRef(false);
  const pendingInsertionRef = useRef<PendingInsertion>(null);
  const checkpointListRef = useRef<HTMLDivElement | null>(null);
  const storageWarnedRef = useRef(false);
  stateRef.current = state;

  useEffect(() => {
    if (writeSandboxStorage(storageKey, JSON.stringify(state))) {
      storageWarnedRef.current = false;
      return;
    }
    // This effect runs on every edit, so an unwritable store would otherwise
    // throw on each keystroke. Warn once and let the session continue in memory.
    if (storageWarnedRef.current) return;
    storageWarnedRef.current = true;
    setNotice({
      message: "This composition cannot be saved in the current browser and will be lost when the page closes.",
      tone: "warning",
    });
  }, [state, storageKey]);

  useEffect(() => {
    const sync = (next: LiveCodeSandboxStorage) => {
      setState(next);
      setResetVersion((value) => value + 1);
      setActiveCheckpointId(null);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) sync(safeParseStorage(event.newValue, initialCode, checkpointInterval, historyLimit));
    };
    const onCustom = (event: Event) => sync((event as CustomEvent<LiveCodeSandboxStorage>).detail);
    window.addEventListener("storage", onStorage);
    window.addEventListener(`live-code-sandbox:${storageKey}`, onCustom);
    const channelEvent = getLiveCodeSandboxSyncEvent(storageKey);
    const onChannel = (payload: unknown) => sync(payload as LiveCodeSandboxStorage);
    channel?.on?.(channelEvent, onChannel);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(`live-code-sandbox:${storageKey}`, onCustom);
      channel?.off?.(channelEvent, onChannel);
    };
  }, [channel, checkpointInterval, historyLimit, initialCode, storageKey]);

  useEffect(() => {
    if (!notice || notice.tone === "warning") return;
    const timeout = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const newest = checkpointListRef.current?.lastElementChild;
    if (newest && "scrollIntoView" in newest) {
      newest.scrollIntoView({ block: "nearest", inline: "end" });
    }
  }, [state.checkpoints.length]);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === surfaceRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    if (!managed || !registryOpen || effectiveRegistryPinned) return undefined;

    let suppressOutsideClick = false;
    let releaseSuppression: number | undefined;

    const trackResizeStart = (event: PointerEvent) => {
      const target = event.target;
      suppressOutsideClick = target instanceof Element && Boolean(target.closest('[role="separator"]'));
    };
    const trackResizeEnd = () => {
      releaseSuppression = window.setTimeout(() => {
        suppressOutsideClick = false;
      }, 500);
    };

    const closeRegistryOnOutsideClick = (event: MouseEvent) => {
      if (suppressOutsideClick) {
        suppressOutsideClick = false;
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(".sb-live-code-sandbox__registry") ||
        target.closest(".sb-live-code-sandbox__registryToggle") ||
        target.closest('[role="separator"]')
      ) return;
      setRegistryOpen(false);
    };

    document.addEventListener("pointerdown", trackResizeStart, true);
    document.addEventListener("pointerup", trackResizeEnd, true);
    document.addEventListener("click", closeRegistryOnOutsideClick, true);
    return () => {
      window.clearTimeout(releaseSuppression);
      document.removeEventListener("pointerdown", trackResizeStart, true);
      document.removeEventListener("pointerup", trackResizeEnd, true);
      document.removeEventListener("click", closeRegistryOnOutsideClick, true);
    };
  }, [effectiveRegistryPinned, managed, registryOpen]);

  const diagnostics = validateJsx(state.code);
  const liveScope = useMemo(() => ({ React, ...scope }), [scope]);
  const usedPropNames = useMemo(() => getOpeningTagPropNames(state.code, state.cursor), [state.code, state.cursor]);

  const setCodeState = useCallback((current: LiveCodeSandboxStorage, code: string, cursor: number) => ({
    ...current,
    code,
    cursor,
    lastSuccessfulCode: validateJsx(code) ? current.lastSuccessfulCode : code,
  }), []);

  const updateCode = useCallback((code: string, cursor: number, changeKind: EditorChangeKind) => {
    if (changeKind === "selection") {
      setState((current) => ({ ...current, cursor }));
      return;
    }
    setActiveCheckpointId(null);
    if (changeKind === "typing") typingDirtyRef.current = true;
    setState((current) => {
      const next = setCodeState(current, code, cursor);
      if (changeKind === "paste") {
        typingDirtyRef.current = false;
        return {
          ...next,
          insertionActionCount: 0,
          checkpoints: addCheckpoint(current.checkpoints, { label: "Pasted", code, cursor }, current.historyLimit),
        };
      }
      if (changeKind === "programmatic" && pendingInsertionRef.current) {
        pendingInsertionRef.current = null;
        const count = current.insertionActionCount + 1;
        const reached = current.checkpointInterval > 0 && count >= current.checkpointInterval;
        return {
          ...next,
          insertionActionCount: reached ? 0 : count,
          checkpoints: reached
            ? addCheckpoint(current.checkpoints, { label: `${current.checkpointInterval} insertions`, code, cursor }, current.historyLimit)
            : current.checkpoints,
        };
      }
      return next;
    });
  }, [setCodeState]);

  const finishTyping = useCallback(() => {
    if (!typingDirtyRef.current) return;
    typingDirtyRef.current = false;
    setState((current) => ({
      ...current,
      checkpoints: addCheckpoint(current.checkpoints, { label: "Edited", code: current.code, cursor: current.cursor }, current.historyLimit),
    }));
  }, []);

  const insertText = useCallback((text: string, cursorOffset = text.length) => {
    const current = stateRef.current;
    const view = editorViewRef.current;
    const selection = view?.state.selection.main;
    const from = selection?.from ?? current.cursor;
    const to = selection?.to ?? current.cursor;
    const inserted = insertSnippet(current.code, text, { from, to });
    const cursor = Math.min(from, to) + cursorOffset;
    pendingInsertionRef.current = { cursorOffset };
    if (view) {
      view.dispatch({ changes: { from, to, insert: text }, selection: EditorSelection.cursor(cursor), annotations: isolateHistory.of("full") });
      view.focus();
    } else {
      updateCode(inserted.code, cursor, "programmatic");
    }
  }, [updateCode]);

  const insertRegistryExample = useCallback((item: LiveCodeRegistryItem) => {
    if (item.disabledReason) {
      setNotice({ message: `${item.name}: ${item.disabledReason}`, tone: "warning" });
      return;
    }
    const example = item.examples[0]?.code;
    if (!example) {
      setNotice({ message: `${item.name}: no insertable example is registered.`, tone: "warning" });
      return;
    }
    const snippet = addRequiredPropsToSnippet(example, item.props);
    const current = stateRef.current;
    const view = editorViewRef.current;
    const insertion = insertSnippetSafely(
      current.code,
      snippet,
      view?.state.selection.main.head ?? current.cursor,
      item.props?.some((prop) => prop.name !== "children") ? getPropInsertionOffset(snippet) : snippet.length,
    );
    if (!insertion) {
      setNotice({ message: `${item.name} was not inserted because no safe render position is available.`, tone: "warning" });
      return;
    }
    setSelectedItem(item);
    setActiveRegistryTab("props");
    pendingInsertionRef.current = { cursorOffset: insertion.cursor };
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: insertion.code },
        selection: EditorSelection.cursor(insertion.cursor),
        annotations: isolateHistory.of("full"),
      });
      view.focus();
    } else {
      updateCode(insertion.code, insertion.cursor, "programmatic");
    }
  }, [updateCode]);

  const insertProp = useCallback((prop: LiveCodeRegistryProp) => {
    const assignment = createPropAssignment(prop);
    if (assignment) insertText(assignment);
  }, [insertText]);

  const confirmReset = useCallback(() => {
    setState((current) => createDefaultStorage(initialCode, current.checkpointInterval, current.historyLimit));
    typingDirtyRef.current = false;
    pendingInsertionRef.current = null;
    setSelectedItem(null);
    setActiveRegistryTab("components");
    setActiveWorkspaceTab("components");
    setRegistryOpen(managed);
    setActiveCategory("");
    setFilter("");
    setActiveCheckpointId(null);
    setCanUndo(false);
    setNotice(null);
    setResetOpen(false);
    setResetVersion((value) => value + 1);
  }, [initialCode, managed]);

  const requestReset = useCallback(() => {
    const current = stateRef.current;
    if (current.code || current.checkpoints.length || canUndo) setResetOpen(true);
    else confirmReset();
  }, [canUndo, confirmReset]);

  const restoreCheckpoint = useCallback((checkpoint: LiveCodeCheckpoint) => {
    setState((current) => ({ ...setCodeState(current, checkpoint.code, checkpoint.cursor), insertionActionCount: 0 }));
    setActiveCheckpointId(checkpoint.id);
    setNotice({ message: `Restored ${checkpoint.label}.`, tone: "status" });
    requestAnimationFrame(() => editorViewRef.current?.focus());
  }, [setCodeState]);

  const deleteCheckpoint = useCallback((checkpoint: LiveCodeCheckpoint) => {
    const index = stateRef.current.checkpoints.findIndex((item) => item.id === checkpoint.id);
    setState((current) => ({ ...current, checkpoints: current.checkpoints.filter((item) => item.id !== checkpoint.id) }));
    if (activeCheckpointId === checkpoint.id) setActiveCheckpointId(null);
    setNotice({
      actionLabel: "Undo",
      message: "Checkpoint deleted.",
      tone: "status",
      onAction: () => {
        setState((current) => {
          const checkpoints = [...current.checkpoints];
          checkpoints.splice(Math.min(index, checkpoints.length), 0, checkpoint);
          return { ...current, checkpoints: checkpoints.slice(-current.historyLimit) };
        });
        setNotice(null);
      },
    });
  }, [activeCheckpointId]);

  const saveSettings = useCallback(() => {
    const interval = normalizeCheckpointInterval(draftInterval);
    const limit = normalizeHistoryLimit(draftLimit);
    setState((current) => ({
      ...current,
      checkpointInterval: interval,
      historyLimit: limit,
      insertionActionCount: 0,
      checkpoints: current.checkpoints.slice(-limit),
    }));
    setDraftInterval(interval);
    setDraftLimit(limit);
    setSettingsOpen(false);
  }, [draftInterval, draftLimit]);

  const undoEditor = useCallback(() => {
    const view = editorViewRef.current;
    if (view && undo(view)) {
      setState((current) => ({ ...current, insertionActionCount: 0 }));
      setActiveCheckpointId(null);
      view.focus();
    }
  }, []);

  const copy = useCallback(async () => {
    await navigator.clipboard?.writeText(stateRef.current.code);
    setNotice({ message: "Composition copied.", tone: "status" });
  }, []);

  const openSettings = useCallback(() => {
    setDraftInterval(stateRef.current.checkpointInterval);
    setDraftLimit(stateRef.current.historyLimit);
    setSettingsOpen(true);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement === surfaceRef.current) await document.exitFullscreen();
    else await surfaceRef.current?.requestFullscreen?.();
  }, []);

  const rootClassName = [
    "sb-live-code-sandbox",
    isFullscreen ? "sb-live-code-sandbox--fullscreen" : "",
    managed ? "sb-live-code-sandbox--managed" : "",
    ui?.rootClassName,
  ].filter(Boolean).join(" ");
  return (
    <>
      {children}
      <div className={`sb-live-code-sandbox__backdrop${managed ? " sb-live-code-sandbox__backdrop--managed" : ""}`}>
      <SandboxSurface ariaLabel="Live code sandbox" className={rootClassName} fullscreen={isFullscreen} surfaceRef={surfaceRef} ui={ui}>
        <div className="sb-live-code-sandbox__toolbar">
          <strong>Live Sandbox</strong>
          <div className="sb-live-code-sandbox__actions">
            {managed ? <SandboxButton ariaLabel={registryOpen ? "Close components" : "Open components"} className="sb-live-code-sandbox__registryToggle" icon="components" onClick={() => setRegistryOpen((open) => !open)} ui={ui}>Components</SandboxButton> : null}
            <SandboxButton ariaLabel="Undo" disabled={!canUndo} icon="undo" onClick={undoEditor} ui={ui}>Undo</SandboxButton>
            <SandboxButton ariaLabel="Copy code" icon="copy" onClick={copy} ui={ui}>Copy</SandboxButton>
            {managed && !hideWorkspaceOrientationAction ? <SandboxButton ariaLabel={`Use ${workspaceOrientation === "horizontal" ? "vertical" : "horizontal"} Code and Canvas layout`} icon={workspaceOrientation === "horizontal" ? "layout-vertical" : "layout-horizontal"} onClick={() => onWorkspaceOrientationChange?.(workspaceOrientation === "horizontal" ? "vertical" : "horizontal")} ui={ui}>Layout</SandboxButton> : null}
            {!hideFullscreenAction ? <SandboxButton ariaLabel={isFullscreen ? "Exit fullscreen" : "Fullscreen"} icon={isFullscreen ? "exit-fullscreen" : "fullscreen"} onClick={toggleFullscreen} ui={ui}>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</SandboxButton> : null}
            <span aria-orientation="vertical" className="sb-live-code-sandbox__actionDivider" role="separator" />
            <SandboxButton ariaLabel="Reset" icon="reset" onClick={requestReset} tone="danger" ui={ui}>Reset</SandboxButton>
            <SandboxButton ariaLabel="History settings" icon="settings" onClick={openSettings} ui={ui}>Settings</SandboxButton>
            {toolbarActions}
          </div>
        </div>
        <div className="sb-live-code-sandbox__checkpoints" aria-label="Rollback checkpoints">
          <strong>History</strong>
          <span className="sb-live-code-sandbox__checkpointProgress">
            {state.checkpointInterval === 0 ? "Insert checkpoints off" : `${state.insertionActionCount}/${state.checkpointInterval}`}
          </span>
          <div ref={checkpointListRef}>
            {state.checkpoints.map((checkpoint) => (
              <SandboxChip
                ariaLabel={`Restore ${checkpoint.label}`}
                className="sb-live-code-sandbox__historyChip"
                deleteLabel={`Delete ${checkpoint.label} checkpoint`}
                key={checkpoint.id}
                label={formatCheckpointLabel(checkpoint)}
                onClick={() => restoreCheckpoint(checkpoint)}
                onDelete={() => deleteCheckpoint(checkpoint)}
                pressed={activeCheckpointId === checkpoint.id}
                title={new Date(checkpoint.createdAt).toLocaleString()}
                ui={ui}
              />
            ))}
          </div>
        </div>
        <SandboxTabs
          ariaLabel="Mobile sandbox views"
          className="sb-live-code-sandbox__workspaceTabs"
          onChange={(value) => {
            setActiveWorkspaceTab(value);
            if (managed && value === "components") setRegistryOpen(true);
          }}
          tabs={[{ label: "Components", value: "components" }, { label: "Code", value: "code" }, { label: "Preview", value: "preview" }]}
          ui={ui}
          value={activeWorkspaceTab}
        />
        <div className="sb-live-code-sandbox__body" data-mobile-view={activeWorkspaceTab} data-registry-open={registryOpen || undefined} data-registry-pinned={effectiveRegistryPinned || undefined}>
          {(ui?.renderWorkspace ?? (({ editor, preview, registry: registryPanel }) => <>{registryPanel}{editor}{preview}</>))({
            managed,
            orientation: workspaceOrientation,
            registry: <SandboxRegistry
            activeCategory={activeCategory}
            activeTab={activeRegistryTab}
            filter={filter}
            onCategoryChange={setActiveCategory}
            onFilterChange={setFilter}
            onInsert={insertRegistryExample}
            onInsertProp={insertProp}
            onClose={managed ? () => { setRegistryOpen(false); setRegistryPinned(false); } : undefined}
            onPinnedChange={managed ? (pinned) => { setRegistryPinned(pinned); setRegistryOpen(true); } : undefined}
            pinned={registryPinned}
            onTabChange={setActiveRegistryTab}
            registry={registry}
            selectedItem={selectedItem}
            ui={ui}
            usedPropNames={usedPropNames}
          />,
            editor: <div className="sb-live-code-sandbox__editorPane">
            <LiveCodeEditor
              cursor={state.cursor}
              onBlur={finishTyping}
              onChange={updateCode}
              onHistoryChange={(undoAvailable) => setCanUndo(undoAvailable)}
              onReady={(view) => { editorViewRef.current = view; }}
              resetVersion={resetVersion}
              value={state.code}
            />
            {!state.code ? (
              <button className="sb-live-code-sandbox__editorEmpty" onClick={() => editorViewRef.current?.focus()} type="button">
                <strong>Start composing</strong>
                <span>Choose a component from the sidebar, paste JS/JSX code, or add an example from Storybook.</span>
                <small>Place the cursor where you want the next component to appear.</small>
              </button>
            ) : null}
          </div>,
            preview: <div className="sb-live-code-sandbox__preview" aria-label="Composition preview">
            <LiveProvider code={getPreviewCode(state.lastSuccessfulCode)} scope={liveScope} noInline={false}>
              <RuntimeErrorReporter onError={(message) => setNotice({ message: `Preview could not render: ${message}`, tone: "warning" })} />
              <LivePreview />
              <LiveError />
            </LiveProvider>
            {diagnostics ? <p className="sb-live-code-sandbox__diagnostic">{diagnostics}</p> : null}
          </div>
          })}
        </div>
        {notice ? <SandboxNotification {...notice} onDismiss={() => setNotice(null)} ui={ui} /> : null}
        <SandboxDialog
          cancelLabel="Cancel"
          confirmLabel="Reset"
          description="This clears the composition, History checkpoints, and Undo history."
          onCancel={() => setResetOpen(false)}
          onConfirm={confirmReset}
          open={resetOpen}
          title="Reset sandbox?"
          ui={ui}
        ><span /></SandboxDialog>
        <SandboxDialog
          cancelLabel="Cancel"
          confirmLabel="Save"
          description="Choose how often insertion checkpoints are created and how many checkpoints are retained."
          onCancel={() => setSettingsOpen(false)}
          onConfirm={saveSettings}
          open={settingsOpen}
          title="History settings"
          ui={ui}
        >
          <div className="sb-live-code-sandbox__settingsFields">
            <div>Checkpoint every <SandboxField ariaLabel="Checkpoint interval" min={0} onChange={(value) => setDraftInterval(Number(value))} type="number" ui={ui} value={draftInterval} /> insertions</div>
            <div>Keep <SandboxField ariaLabel="History limit" max={50} min={1} onChange={(value) => setDraftLimit(Number(value))} type="number" ui={ui} value={draftLimit} /> checkpoints</div>
          </div>
        </SandboxDialog>
      </SandboxSurface>
      </div>
    </>
  );
}
