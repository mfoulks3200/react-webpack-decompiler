"use client";
import { ChevronRight, FolderCode, LoaderCircle, OctagonX } from "lucide-react";
import { PropsWithChildren, ReactNode, useEffect, useState } from "react";
import clsx from "clsx";
import { PaneHeader } from "./paneHeader";
import { getAllModules, ChunkManifest } from "@/app/actions";
import { useFileContextProvider } from "../fileProvider";

export const Explorer = () => {
  const [chunks, setChunks] = useState<ChunkManifest>();
  const [loading, setLoading] = useState(true);
  const fileContext = useFileContextProvider();

  useEffect(() => {
    (async () => {
      const modList = await getAllModules();
      console.log(modList);
      setChunks(modList);
      setLoading(false);
    })();
  }, []);

  const transformerBadge = (succeeded: number, total: number) => (
    <div
      className={clsx(" text-xs px-1 font-mono rounded-sm text-white", {
        " bg-green-600": succeeded === total,
        "bg-amber-700": succeeded !== total && succeeded > 0,
        "bg-red-700": succeeded === 0,
      })}
    >
      {succeeded}/{total}
    </div>
  );

  const errorBadge = (errorCount: any) => (
    <>
      {errorCount > 0 && (
        <div className="bg-red-700 text-xs px-1 font-mono rounded-sm flex gap-1 items-center text-white">
          <OctagonX size={12} />
          {errorCount}
        </div>
      )}
    </>
  );

  const renderChunkDecorator = (total: number) => (
    <div className={clsx(" text-xs px-1 font-mono opacity-50")}>
      {total} Modules
    </div>
  );

  return (
    <>
      <div className="flex flex-col overflow-y-scroll max-h-full">
        <PaneHeader
          name={"Explorer"}
          beforeDecorator={<FolderCode size={18} />}
          className={"sticky top-0 z-10"}
        />
        {loading && (
          <div className="flex flex-col gap-2 w-full h-full items-center justify-center p-4">
            <LoaderCircle className="animate-spin" />
            <div>Loading...</div>
          </div>
        )}
        {!loading && chunks && (
          <ul className="h-fit">
            {Object.entries(chunks).map(([chunkName, modules]) => (
              <ExplorerItem
                name={chunkName}
                key={chunkName}
                decorators={renderChunkDecorator(Object.keys(modules).length)}
              >
                {Object.entries(modules).map(([moduleName, moduleObj]) => (
                  <ExplorerItem
                    name={moduleName}
                    indent={1}
                    key={chunkName + "/" + moduleName}
                    decorators={
                      <>
                        {errorBadge(
                          moduleObj.transforms
                            .map((transformer: any) => transformer.errorCount)
                            .reduce(
                              (accumulator: number, currentValue: number) =>
                                accumulator + currentValue,
                              0
                            )
                        )}
                        {transformerBadge(
                          moduleObj.transforms.filter(
                            (transform: { state: string }) =>
                              transform.state === "success"
                          ).length,
                          moduleObj.transforms.length
                        )}
                      </>
                    }
                    selected={
                      fileContext.chunkName === chunkName &&
                      fileContext.moduleName === moduleName
                    }
                    onClick={() => fileContext.setModule(chunkName, moduleName)}
                  />
                ))}
              </ExplorerItem>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

const ExplorerItem = ({
  name,
  decorators,
  indent,
  expanded,
  selected,
  onClick,
  children,
}: PropsWithChildren<{
  name: string;
  indent?: number;
  expanded?: boolean;
  selected?: boolean;
  decorators?: ReactNode | ReactNode[];
  onClick?: () => void;
}>) => {
  const [isExpanded, setExpanded] = useState(expanded ?? false);

  const hasChildren = !!children;

  useEffect(() => {
    setExpanded(expanded ?? false);
  }, [expanded]);

  return (
    <>
      <li
        className={clsx(
          `px-${
            2 + (indent ?? 0) * 2
          } py-0.5 flex items-center text-sm select-none cursor-pointer hover:bg-neutral-200 hover:dark:bg-neutral-900`,
          { "bg-neutral-200 dark:bg-neutral-900": selected }
        )}
        onClick={() => {
          if (hasChildren) {
            setExpanded((wasExpanded) => !wasExpanded);
          }
          onClick?.();
        }}
      >
        <div
          className={clsx("transition-transform", {
            "rotate-90": isExpanded,
            "opacity-0": !hasChildren,
          })}
        >
          <ChevronRight size={16} />
        </div>
        <span>{name}</span>
        <div className="ml-auto flex gap-2">{decorators}</div>
      </li>
      {isExpanded && children}
    </>
  );
};
