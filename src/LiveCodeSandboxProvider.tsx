import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { LiveProvider, LiveError, LivePreview } from "react-live";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveCodeEditor } from "./LiveCodeEditor";
import {
  DEFAULT_CODE,
  createDefaultStorage,
  insertSnippet,
  safeParseStorage,
  validateJsx,
} from "./editorState";
import type { LiveCodeRegistryItem, LiveCodeSandboxProviderProps, LiveCodeSandboxStorage } from "./types";
import "./styles.css";

export function LiveCodeSandboxProvider({
  children,
  scope,
  registry,
  storageKey,
  initialCode = DEFAULT_CODE,
}: LiveCodeSandboxProviderProps) {
  const [state, setState] = useState<LiveCodeSandboxStorage>(() => {
    if (typeof window === "undefined") {
      return createDefaultStorage(initialCode);
    }

    return safeParseStorage(window.localStorage.getItem(storageKey), initialCode);
  });
  const [filter, setFilter] = useState("");
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    editorViewRef.current = editorView;
  }, [editorView]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  const diagnostics = validateJsx(state.code);
  const liveScope = useMemo(() => ({ React, ...scope }), [scope]);
  const visibleRegistry = useMemo(
    () =>
      registry.filter((item) => {
        const query = filter.trim().toLowerCase();
        if (!query) {
          return true;
        }

        return [item.name, item.category, item.description].some((value) =>
          value?.toLowerCase().includes(query),
        );
      }),
    [filter, registry],
  );

  const updateCode = useCallback((code: string, cursor: number) => {
    setState((current) => ({
      ...current,
      code,
      cursor,
      lastSuccessfulCode: validateJsx(code) ? current.lastSuccessfulCode : code,
    }));
  }, []);

  const insertRegistryExample = useCallback((item: LiveCodeRegistryItem) => {
    const snippet = item.examples[0]?.code;
    if (!snippet) {
      return;
    }

    setState((current) => {
      const view = editorViewRef.current;
      const selection = view?.state.selection.main;
      const inserted = insertSnippet(current.code, snippet, {
        from: selection?.from ?? current.cursor,
        to: selection?.to ?? current.cursor,
      });

      if (view) {
        view.dispatch({
          changes: {
            from: selection?.from ?? current.cursor,
            to: selection?.to ?? current.cursor,
            insert: snippet,
          },
          selection: EditorSelection.cursor(inserted.cursor),
        });
        view.focus();
      }

      return {
        ...current,
        code: inserted.code,
        cursor: inserted.cursor,
        lastSuccessfulCode: validateJsx(inserted.code) ? current.lastSuccessfulCode : inserted.code,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(createDefaultStorage(initialCode));
  }, [initialCode]);

  const copy = useCallback(async () => {
    await navigator.clipboard?.writeText(state.code);
  }, [state.code]);

  const toggleOpen = useCallback(() => {
    setState((current) => ({ ...current, open: !current.open }));
  }, []);

  const toggleLayout = useCallback(() => {
    setState((current) => ({
      ...current,
      open: true,
      layout: current.layout === "drawer" ? "fullscreen" : "drawer",
    }));
    requestAnimationFrame(() => editorViewRef.current?.focus());
  }, []);

  return (
    <>
      {children}
      <button
        className="sb-live-code-sandbox__launcher"
        type="button"
        aria-expanded={state.open}
        onClick={toggleOpen}
      >
        Sandbox
      </button>
      {state.open ? (
        <section
          className={`sb-live-code-sandbox sb-live-code-sandbox--${state.layout}`}
          aria-label="Live code sandbox"
        >
          <div className="sb-live-code-sandbox__toolbar">
            <strong>Live Sandbox</strong>
            <div className="sb-live-code-sandbox__actions">
              <button type="button" onClick={copy}>Copy</button>
              <button type="button" onClick={reset}>Reset</button>
              <button type="button" onClick={toggleLayout}>
                {state.layout === "drawer" ? "Fullscreen" : "Drawer"}
              </button>
              <button type="button" aria-label="Close sandbox" onClick={toggleOpen}>Close</button>
            </div>
          </div>
          <div className="sb-live-code-sandbox__body">
            <aside className="sb-live-code-sandbox__registry" aria-label="Component registry">
              <input
                aria-label="Search components"
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.currentTarget.value)}
                placeholder="Search components"
              />
              <div className="sb-live-code-sandbox__registryList">
                {visibleRegistry.map((item) => (
                  <button type="button" key={item.name} onClick={() => insertRegistryExample(item)}>
                    <span>{item.name}</span>
                    {item.description ? <small>{item.description}</small> : null}
                  </button>
                ))}
              </div>
            </aside>
            <div className="sb-live-code-sandbox__workspace">
              <LiveCodeEditor
                value={state.code}
                cursor={state.cursor}
                onChange={updateCode}
                onReady={setEditorView}
              />
              <div className="sb-live-code-sandbox__preview" aria-label="Composition preview">
                <LiveProvider code={state.lastSuccessfulCode} scope={liveScope} noInline={false}>
                  <LivePreview />
                  <LiveError />
                </LiveProvider>
                {diagnostics ? <p className="sb-live-code-sandbox__diagnostic">{diagnostics}</p> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
