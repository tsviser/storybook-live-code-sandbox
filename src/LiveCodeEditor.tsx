import { indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useLayoutEffect, useRef } from "react";

type LiveCodeEditorProps = {
  value: string;
  cursor: number;
  onChange: (value: string, cursor: number) => void;
  onReady?: (view: EditorView) => void;
};

const editorTheme = EditorView.theme({
  "&": {
    minHeight: "100%",
    fontSize: "13px",
  },
  ".cm-content": {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    padding: "12px",
  },
  ".cm-scroller": {
    minHeight: "220px",
  },
});

export function LiveCodeEditor({ value, cursor, onChange, onReady }: LiveCodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  useLayoutEffect(() => {
    if (!hostRef.current || viewRef.current) {
      return;
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        selection: EditorSelection.cursor(Math.max(0, Math.min(cursor, value.length))),
        extensions: [
          javascript({ jsx: true, typescript: true }),
          keymap.of([indentWithTab]),
          editorTheme,
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (!update.docChanged && !update.selectionSet) {
              return;
            }

            const nextValue = update.state.doc.toString();
            const nextCursor = update.state.selection.main.head;
            onChangeRef.current(nextValue, nextCursor);
          }),
        ],
      }),
      parent: hostRef.current,
    });

    viewRef.current = view;
    onReady?.(view);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const currentValue = view.state.doc.toString();
    if (currentValue === value) {
      return;
    }

    view.dispatch({
      changes: { from: 0, to: currentValue.length, insert: value },
      selection: EditorSelection.cursor(Math.max(0, Math.min(cursor, value.length))),
    });
  }, [cursor, value]);

  return <div className="sb-live-code-sandbox__editorHost" ref={hostRef} />;
}
