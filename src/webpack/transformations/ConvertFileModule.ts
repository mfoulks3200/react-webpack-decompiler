import path from "node:path";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";
import { fetchCode, tryMkDirSync } from "../../Utilities.ts";
import { SyntaxKind } from "npm:ts-morph";
import { getBaseUrl } from "../WebpackUtilities.ts";

export const ConvertFileModule: Transformation = {
  name: "ConvertFileModule",

  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return mod.moduleType === "TSX";
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const sourceFile = mod.getSourceFileAST();
    for (const binExp of sourceFile.getDescendantsOfKind(
      SyntaxKind.BinaryExpression
    )) {
      if (
        binExp
          .getText()
          .replaceAll(/\n/gm, "")
          .replaceAll(/\s{2,}/gm, " ")
          .startsWith(
            `${WebpackModule.specialFunctions.module}.exports = ${WebpackModule.specialFunctions.require}.p +`
          )
      ) {
        mod.moduleType = "FILE";
        const fileUrl = path.join(
          getBaseUrl(),
          binExp
            .getDescendantsOfKind(SyntaxKind.BinaryExpression)[0]!
            .getDescendantsOfKind(SyntaxKind.StringLiteral)[0]
            .getText()
            .slice(1, -1)
        );
        mod.currentLocation = path.join(
          mod.chunk.name,
          "assets",
          mod.name + path.extname(fileUrl)
        );
        mod.setCode(await fetchCode(fileUrl, true));
      }
    }
    mod.setCode(sourceFile.getFullText());
    return true;
  },
};
