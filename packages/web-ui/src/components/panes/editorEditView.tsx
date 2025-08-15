"use client";

import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

interface EditorEditViewProps {
  code: string;
}

export const EditorEditView = ({ code }: EditorEditViewProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);

  useEffect(() => {
    if (monacoEditorRef.current && code) {
      monacoEditorRef.current.setModel(
        monaco.editor.createModel(code + "", "text/typescript")
      );
    }
  }, [code]);

  useEffect(() => {
    if (editorRef.current && !monacoEditorRef.current) {
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value: code,
        language: "typescript",
        automaticLayout: true,
        readOnly: true,
      });
    }
  }, [editorRef]);

  return <div ref={editorRef} className={"w-full h-full"} />;
};
