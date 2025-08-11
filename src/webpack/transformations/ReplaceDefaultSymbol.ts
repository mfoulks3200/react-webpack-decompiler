import { NodeFlags, SourceFile, SyntaxKind } from "npm:ts-morph";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";
import { Logger } from "../../Logger.ts";

const refreshSource = (sourceFile: SourceFile) => {
  if (sourceFile) {
    sourceFile.replaceWithText(sourceFile.getFullText());
  }
};

export const ReplaceDefaultSymbol: Transformation = {
  name: "ReplaceDefaultSymbol",
  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return mod.moduleType === "TSX";
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const sourceFile = mod.getSourceFileAST();
    const symbols = sourceFile?.getDescendantsOfKind(SyntaxKind.Identifier);
    if (symbols && symbols.length > 0) {
      for (const symbol of symbols) {
        if (
          !symbol.wasForgotten() &&
          symbol.getText().trim().toLowerCase() === "default"
        ) {
          symbol.rename("_default");
        }
      }
    }
    const defaults = sourceFile?.getDescendantsOfKind(
      SyntaxKind.DefaultKeyword,
    );
    if (defaults && defaults.length > 0) {
      for (const defaultSymbol of defaults) {
        if (
          defaultSymbol.getNextSibling() &&
          defaultSymbol.getNextSibling()!.getKind() === SyntaxKind.EqualsToken
        ) {
          defaultSymbol.replaceWithText("_default");
        }
      }
    }
    refreshSource(sourceFile);
    if (sourceFile) {
      const currentCode = sourceFile.getFullText();
      const newCode = currentCode
        .replaceAll(/(?:(?<!export\s*|_))default(?=\s*(?:=))/gm, "_default")
        .replaceAll(/default\./gm, "_default.")
        .replaceAll(/(?<!{) ?default: ?\(\) ?=> ?default,?/gm, "")
        .replaceAll(/=> ?default/gm, "=> _default");
      sourceFile.replaceWithText(newCode);
      mod.setCode(newCode);
    }
    mod.setCode(sourceFile.getFullText());
    return true;
  },
};
