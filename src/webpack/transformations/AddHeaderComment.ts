import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";

export const AddHeaderComment: Transformation = {
  name: "AddHeaderComment",

  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return true;
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const headerCommentRegex =
      /^\/\*\*\n\s?\* START DECOMPILER DATA((?:(?:.|\n)(?!\* END DECOMPILER DATA))*)\n\s?\* END DECOMPILER DATA\n\s?\*\//gm;
    const currentContent = mod.moduleSourceFile!.getFullText();
    if (currentContent.match(headerCommentRegex)) {
      mod.moduleSourceFile!.replaceWithText(
        currentContent.replaceAll(headerCommentRegex, "")
      );
      await mod.moduleSourceFile!.save();
    }
    mod.moduleSourceFile!.insertText(0, (writer) =>
      writer.writeLine(
        `/**
            * START DECOMPILER DATA
            * Decompiled at ${new Date().toISOString()}
            * ${JSON.stringify(
              {
                chunkId: mod.chunk.id,
                chunkPath: mod.chunk.remotePath,
                moduleId: mod.id,
              },
              null,
              2
            )
              .split("\n")
              .join("\n * ")}
            * Decompiler Module Data (Do Not Edit): ${btoa(
              JSON.stringify(mod.serialize())
            )}
            * END DECOMPILER DATA
            */`.replaceAll(/^\s*/gm, "")
      )
    );
    return true;
  },
};
