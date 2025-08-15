"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import { useTheme } from "next-themes";
import { getTransformFile } from "@/app/actions";
import { useFileContextProvider } from "../fileProvider";
import { Columns2, PencilRuler, Square } from "lucide-react";
import { PaneHeader } from "./paneHeader";
import { Button } from "../ui/button";
import { Combobox, ComboboxOption } from "../ui/combobox";
import { EditorDiffView } from "./editorDiffView";
import { EditorEditView } from "./editorEditView";

monaco.editor.defineTheme("dark", {
  base: "vs-dark", // can also be vs-dark or hc-black
  inherit: true, // can also be false to completely replace the builtin rules
  rules: [],
  colors: {
    "editor.background": "#000000",
  },
});

const viewModes: ComboboxOption[] = [
  { value: "before", label: "Before Transform" },
  { value: "after", label: "After Transform" },
  { value: "diff", label: "Diff View" },
] as const;

export const Editor = () => {
  const { resolvedTheme } = useTheme();
  const [currentViewMode, setCurrentViewMode] = useState<string>("diff");
  const [beforeCode, setBeforeCode] = useState<string>("");
  const [afterCode, setAfterCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [renderSideBySide, setRenderSideBySide] = useState(true);
  const fileContext = useFileContextProvider();

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (
        fileContext.chunkName &&
        fileContext.moduleName &&
        fileContext.transformName
      ) {
        setBeforeCode(
          await getTransformFile(
            fileContext.chunkName,
            fileContext.moduleName,
            fileContext.transformName,
            "beforeCode"
          )
        );
        setAfterCode(
          await getTransformFile(
            fileContext.chunkName,
            fileContext.moduleName,
            fileContext.transformName,
            "afterCode"
          )
        );
      } else {
        setBeforeCode("");
        setAfterCode("");
      }
      setLoading(false);
    })();
  }, [
    fileContext.chunkName,
    fileContext.moduleName,
    fileContext.transformName,
  ]);

  useEffect(() => {
    monaco.editor.setTheme(resolvedTheme === "dark" ? "dark" : "vs-light");
  }, [resolvedTheme]);

  const paneOptions = (
    <>
      <div className="ml-auto flex gap-2 items-center">
        <Combobox
          variant={"ghost"}
          triggerClassName="max-h-6"
          options={viewModes}
          defaultOption={currentViewMode}
          onChange={(mode) => setCurrentViewMode(mode)}
        />
        <Button
          className="p-0 max-h-6 max-w-6"
          variant={"ghost"}
          onClick={() => {
            setRenderSideBySide(!renderSideBySide);
          }}
          disabled={currentViewMode !== "diff"}
        >
          {renderSideBySide ? <Square /> : <Columns2 />}
        </Button>
      </div>
    </>
  );

  const editorPane = useCallback(() => {
    if (currentViewMode === "diff") {
      return (
        <EditorDiffView
          beforeCode={beforeCode}
          afterCode={afterCode}
          renderSideBySide={renderSideBySide}
        />
      );
    } else {
      const code = currentViewMode === "before" ? beforeCode : afterCode;
      return <EditorEditView code={code} />;
    }
  }, [beforeCode, afterCode, renderSideBySide, currentViewMode]);

  return (
    <>
      <div className="flex flex-col overflow-y-scroll max-h-full h-full">
        <PaneHeader
          name={"Editor"}
          beforeDecorator={<PencilRuler size={18} />}
          className={"sticky top-0 z-10"}
          afterDecorator={paneOptions}
        />
        {editorPane()}
      </div>
    </>
  );
};
