import { createContext, PropsWithChildren, useContext, useState } from "react";

interface FileContextState {
  chunkName?: string;
  moduleName?: string;
  transformName?: string;
}

interface FileContextUpdater {
  setModule: (chunkName: string, moduleName: string) => void;
  setTransform: (transformName?: string) => void;
}

export const FileContext = createContext<FileContextState & FileContextUpdater>(
  {
    setModule: () => {},
    setTransform: () => {},
  }
);

export const FileContextProvider = ({ children }: PropsWithChildren) => {
  const [fileContextState, setFileContextState] = useState<FileContextState>(
    {}
  );

  const setModule = (chunkName: string, moduleName?: string) => {
    setFileContextState((existing) => ({
      ...existing,
      chunkName,
      moduleName,
    }));
  };

  const setTransform = (transformName?: string) => {
    setFileContextState((existing) => ({
      ...existing,
      transformName,
    }));
  };

  return (
    <FileContext.Provider
      value={{ ...fileContextState, setModule, setTransform }}
    >
      {children}
    </FileContext.Provider>
  );
};

export const useFileContextProvider = () => {
  return useContext(FileContext);
};
