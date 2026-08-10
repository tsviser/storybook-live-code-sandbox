import {
  history,
  historyKeymap,
  indentWithTab,
  isolateHistory,
  redoDepth,
  undoDepth,
} from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useLayoutEffect, useRef } from "react";

export type EditorChangeKind = "typing" | "paste" | "programmatic" | "selection";

type LiveCodeEditorProps = {
  value: string;
  cursor: number;
  resetVersion: number;
  onBlur?: () => void;
  onChange: (value: string, cursor: number, changeKind: EditorChangeKind) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onReady?: (view: EditorView) => void;
};

const editorTheme = EditorView.theme({
  "&": { minHeight: "100%", fontSize: "13px" },
  ".cm-content": {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    padding: "12px",
  },
  ".cm-scroller": { minHeight: "220px" },
});

export function LiveCodeEditor({
  value,
  cursor,
  resetVersion,
  onBlur,
  onChange,
  onHistoryChange,
  onReady,
}: LiveCodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onBlurRef = useRef(onBlur);
  const onChangeRef = useRef(onChange);
  const onHistoryChangeRef = useRef(onHistoryChange);
  const resetVersionRef = useRef(resetVersion);

  onBlurRef.current = onBlur;
  onChangeRef.current = onChange;
  onHistoryChangeRef.current = onHistoryChange;

  const createState = (doc: string, selection: number) => EditorState.create({
    doc,
    selection: EditorSelection.cursor(Math.max(0, Math.min(selection, doc.length))),
    extensions: [
      javascript({ jsx: true, typescript: true }),
      history(),
      keymap.of([...historyKeymap, indentWithTab]),
      editorTheme,
      EditorView.lineWrapping,
      EditorView.domEventHandlers({ blur: () => onBlurRef.current?.() }),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged && !update.selectionSet) return;
        const isPaste = update.transactions.some((transaction) => transaction.isUserEvent("input.paste"));
        const isUserInput = update.transactions.some((transaction) =>
          transaction.isUserEvent("input") || transaction.isUserEvent("delete"),
        );
        onChangeRef.current(
          update.state.doc.toString(),
          update.state.selection.main.head,
          !update.docChanged ? "selection" : isPaste ? "paste" : isUserInput ? "typing" : "programmatic",
        );
        onHistoryChangeRef.current?.(undoDepth(update.state) > 0, redoDepth(update.state) > 0);
      }),
    ],
  });

  useLayoutEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const view = new EditorView({ state: createState(value, cursor), parent: hostRef.current });
    viewRef.current = view;
    onReady?.(view);
    onHistoryChangeRef.current?.(false, false);
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (resetVersionRef.current !== resetVersion) {
      resetVersionRef.current = resetVersion;
      view.setState(createState(value, cursor));
      onHistoryChangeRef.current?.(false, false);
      return;
    }
    const currentValue = view.state.doc.toString();
    if (currentValue === value) return;
    view.dispatch({
      changes: { from: 0, to: currentValue.length, insert: value },
      selection: EditorSelection.cursor(Math.max(0, Math.min(cursor, value.length))),
      annotations: isolateHistory.of("full"),
    });
  }, [cursor, resetVersion, value]);

  return <div className="sb-live-code-sandbox__editorHost" ref={hostRef} />;
}
