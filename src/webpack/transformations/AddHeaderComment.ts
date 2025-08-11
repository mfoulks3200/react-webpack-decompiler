import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";

export const AddHeaderComment: Transformation = {
  name: "AddHeaderComment",

  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return mod.moduleType === "TSX";
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const sourceFile = mod.getSourceFileAST();
    const headerCommentRegex =
      /^\/\*\*\n\s?\* START DECOMPILER DATA((?:(?:.|\n)(?!\* END DECOMPILER DATA))*)\n\s?\* END DECOMPILER DATA\n\s?\*\//gm;
    const currentContent = sourceFile.getFullText();
    if (currentContent.match(headerCommentRegex)) {
      sourceFile.replaceWithText(
        currentContent.replaceAll(headerCommentRegex, ""),
      );
      await sourceFile.save();
    }
    sourceFile.insertText(0, (writer) =>
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
              2,
            )
              .split("\n")
              .join("\n * ")}
            * Decompiler Module Data (Do Not Edit): ${btoa(
              JSON.stringify(mod.serialize()),
            )}
            * END DECOMPILER DATA
            */`.replaceAll(/^\s*/gm, ""),
      ),
    );
    mod.setCode(sourceFile.getFullText());
    return true;
  },
};
