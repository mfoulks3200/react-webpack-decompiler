import clsx from "clsx";
import { ReactNode, useEffect, useState } from "react";
import { PaneHeader } from "./paneHeader";
import { Check, LoaderCircle, Move3d, OctagonX, X } from "lucide-react";
import { getModuleManifest, ModuleManifest } from "@/app/actions";
import { useFileContextProvider } from "../fileProvider";

export const Transforms = () => {
  const [moduleObj, setModule] = useState<ModuleManifest>();
  const [loading, setLoading] = useState(true);
  const fileContext = useFileContextProvider();

  useEffect(() => {
    (async () => {
      if (fileContext.chunkName && fileContext.moduleName) {
        const modList = await getModuleManifest(
          fileContext.chunkName,
          fileContext.moduleName
        );
        console.log(modList);
        setModule(modList);
      } else {
        setModule(undefined);
      }
      setLoading(false);
    })();
  }, [fileContext.chunkName, fileContext.moduleName]);

  const transformIcon = (status: string) => {
    console.log(status);
    if (status === "success") {
      return (
        <Check size={14} className={"text-green-800 dark:text-green-500"} />
      );
    } else {
      return <X size={14} className={"text-red-800 dark:text-red-500"} />;
    }
  };

  const afterDeco = (transform: any) => (
    <>
      {transform.errorCount > 0 && (
        <div className="dark:bg-red-500 bg-red-700 text-white text-xs px-1 font-mono rounded-sm flex gap-2 items-center">
          <OctagonX size={14} />
          {transform.errorCount}
        </div>
      )}
      <>{transform.duration} ms</>
    </>
  );

  return (
    <>
      <div className="flex flex-col overflow-y-scroll max-h-full">
        <PaneHeader
          name={"Transforms"}
          beforeDecorator={<Move3d size={18} />}
          className={"sticky top-0 z-10"}
        />
        {loading && (
          <div className="flex flex-col gap-2 w-full h-full items-center justify-center p-4">
            <LoaderCircle className="animate-spin" />
            <div>Loading...</div>
          </div>
        )}
        {!loading && moduleObj === undefined && (
          <div className="flex flex-col gap-2 w-full h-full items-center justify-center p-4">
            <div>No Transforms Found</div>
          </div>
        )}
        {!loading && moduleObj && (
          <ul>
            {moduleObj.transforms.map((transform: any) => (
              <TransformListItem
                beforeDecorators={transformIcon(transform.state)}
                name={transform.name}
                afterDecorators={afterDeco(transform)}
                isSelected={fileContext.transformName === transform.name}
                onClick={() => fileContext.setTransform(transform.name)}
                key={transform.name}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export const TransformListItem = ({
  name,
  beforeDecorators,
  afterDecorators,
  isSelected,
  onClick,
}: {
  name: string;
  beforeDecorators?: ReactNode | ReactNode[];
  afterDecorators?: ReactNode | ReactNode[];
  isSelected?: boolean;
  onClick?: () => void;
}) => {
  return (
    <li
      className={clsx(
        `px-4 py-0.5 flex gap-2 items-center text-sm select-none cursor-pointe hover:bg-neutral-200 hover:dark:bg-neutral-900`,
        {
          "bg-neutral-200 dark:bg-neutral-900": isSelected,
        }
      )}
      onClick={onClick}
    >
      {beforeDecorators && <div className="flex gap-2">{beforeDecorators}</div>}
      <span>{name}</span>
      {afterDecorators && (
        <div className="ml-auto flex gap-2">{afterDecorators}</div>
      )}
    </li>
  );
};
