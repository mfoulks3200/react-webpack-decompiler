"use client";

import { SearchCode } from "lucide-react";
import { ThemeModeToggle } from "../components/themeModeToggle";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../components/ui/resizable";
import { Explorer } from "../components/panes/explorer";
import { Editor } from "../components/panes/editor";
import { Transforms } from "@/components/panes/transforms";
import { Metadata } from "@/components/panes/metadata";
import { Console } from "@/components/panes/console";
import { FileContextProvider } from "@/components/fileProvider";

export default function Home() {
  return (
    <FileContextProvider>
      <div className="font-sans items-center justify-items-center min-h-screen min-w-screen max-h-screen max-w-screen flex flex-col">
        <div className="h-12 min-h-12 w-full border-b border-border flex items-center justify-end px-2">
          <div className="flex gap-2">
            <SearchCode />
            Webpack Decompiler
          </div>
          <div className="ml-auto"></div>
          <ThemeModeToggle />
        </div>
        <ResizablePanelGroup
          direction="horizontal"
          className="grow shrink basis-full"
        >
          <ResizablePanel defaultSize={15}>
            <Explorer />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel>
            <ResizablePanelGroup direction="vertical" className="">
              <ResizablePanel>
                <Editor />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={25}>
                <Console />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={25}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel>
                <Transforms />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel>
                <Metadata />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </FileContextProvider>
  );
}
