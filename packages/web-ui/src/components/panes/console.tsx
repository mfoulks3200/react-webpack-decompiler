import { LoaderCircle, Terminal } from "lucide-react";
import { PaneHeader } from "./paneHeader";
import { getTransformFile, ModuleManifest } from "@/app/actions";
import { useEffect, useState } from "react";
import { useFileContextProvider } from "../fileProvider";
import Convert from "ansi-to-html";

export const Console = () => {
  const [consoleContent, setConsoleContext] = useState<string>();
  const [loading, setLoading] = useState(true);
  const fileContext = useFileContextProvider();

  useEffect(() => {
    (async () => {
      if (
        fileContext.chunkName &&
        fileContext.moduleName &&
        fileContext.transformName
      ) {
        const consoleContent = await getTransformFile(
          fileContext.chunkName,
          fileContext.moduleName,
          fileContext.transformName,
          "consoleLog"
        );
        console.log(consoleContent);
        setConsoleContext(consoleContent);
      } else {
        setConsoleContext(undefined);
      }
      setLoading(false);
    })();
  }, [
    fileContext.chunkName,
    fileContext.moduleName,
    fileContext.transformName,
  ]);

  let content = "";
  if (consoleContent) {
    const convert = new Convert();
    content = convert.toHtml(consoleContent);
  }

  return (
    <>
      <div className="flex flex-col overflow-y-scroll max-h-full">
        <PaneHeader
          name={"Console"}
          beforeDecorator={<Terminal size={18} />}
          className={"sticky top-0 z-10"}
        />
        {loading && (
          <div className="flex flex-col gap-2 w-full h-full items-center justify-center p-4">
            <LoaderCircle className="animate-spin" />
            <div>Loading...</div>
          </div>
        )}
        {!loading && !consoleContent && (
          <div className="flex flex-col gap-2 w-full h-full items-center justify-center p-4">
            No console content found.
          </div>
        )}
        {!loading && consoleContent !== undefined && (
          <div
            className="flex flex-col gap-2 w-full h-full items-center justify-center p-4 pt-2 font-mono text-xs whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>
    </>
  );
};
