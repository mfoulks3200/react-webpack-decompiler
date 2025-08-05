import { NodeFlags, SyntaxKind } from "npm:ts-morph";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";
import { Logger } from "../../Logger.ts";

const refreshSource = (mod: WebpackModule) => {
  if (mod.moduleSourceFile) {
    mod.moduleSourceFile.replaceWithText(mod.moduleSourceFile.getFullText());
    mod.setCode(mod.moduleSourceFile.getFullText());
  }
};

export const ReplaceDefaultSymbol: Transformation = {
  name: "ReplaceDefaultSymbol",
  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return mod.moduleType === "TSX";
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    // const symbols = mod.moduleSourceFile?.getDescendantsOfKind(
    //   SyntaxKind.Identifier
    // );
    // if (symbols && symbols.length > 0) {
    //   for (const symbol of symbols) {
    //     if (
    //       !symbol.wasForgotten() &&
    //       symbol.getText().trim().toLowerCase() === "default"
    //     ) {
    //       symbol.rename("_default");
    //     }
    //   }
    // }
    // const defaults = mod.moduleSourceFile?.getDescendantsOfKind(
    //   SyntaxKind.DefaultKeyword
    // );
    // if (defaults && defaults.length > 0) {
    //   for (const defaultSymbol of defaults) {
    //     if (
    //       defaultSymbol.getNextSibling() &&
    //       defaultSymbol.getNextSibling()!.getKind() === SyntaxKind.EqualsToken
    //     ) {
    //       defaultSymbol.replaceWithText("_default");
    //     }
    //   }
    // }
    // refreshSource(mod);
    if (mod.moduleSourceFile) {
      const defaultAssignRegex = /(?:(?<!export\s*|_))default(?=\s*(?:=))/gm;
      defaultAssignRegex.lastIndex = 0;
      const defaultExportRegex = /(?<!{) ?default: ?\(\) ?=> ?default,?/gm;
      defaultExportRegex.lastIndex = 0;
      const currentCode = mod.moduleSourceFile.getFullText();
      const newCode = currentCode
        .replaceAll(defaultAssignRegex, "_default")
        .replaceAll(defaultExportRegex, "");
      // Logger.log(newCode);
      mod.moduleSourceFile.replaceWithText(newCode);
      mod.setCode(newCode);
    }
    return true;
  },
};
