"use client";

import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

interface EditorDiffViewProps {
  beforeCode: string;
  afterCode: string;
  renderSideBySide?: boolean;
}

export const EditorDiffView = ({
  beforeCode,
  afterCode,
  renderSideBySide,
}: EditorDiffViewProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneDiffEditor>(null);

  useEffect(() => {
    if (monacoEditorRef.current && beforeCode && afterCode) {
      monacoEditorRef.current.setModel({
        original: monaco.editor.createModel(beforeCode, "text/typescript"),
        modified: monaco.editor.createModel(afterCode, "text/typescript"),
      });
    }
  }, [beforeCode, afterCode]);

  useEffect(() => {
    if (
      editorRef.current &&
      !monacoEditorRef.current &&
      typeof window !== "undefined"
    ) {
      monacoEditorRef.current = monaco.editor.createDiffEditor(
        editorRef.current,
        {
          automaticLayout: true,
          renderSideBySide: renderSideBySide,
          renderGutterMenu: false,
          readOnly: true,
        }
      );
      monacoEditorRef.current.setModel({
        original: monaco.editor.createModel("", "text/typescript"),
        modified: monaco.editor.createModel("", "text/typescript"),
      });
    }
  }, [editorRef]);

  useEffect(() => {
    monacoEditorRef.current?.updateOptions({
      renderSideBySide: renderSideBySide,
    });
  }, [renderSideBySide]);

  return <div ref={editorRef} className={"w-full h-full"} />;
};
