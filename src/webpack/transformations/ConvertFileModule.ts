import path from "node:path";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";
import { fetchCode, tryMkDirSync } from "../../Utilities.ts";
import { SyntaxKind } from "npm:ts-morph";
import { baseUrl } from "../../main.ts";

export const ConvertFileModule: Transformation = {
  name: "ConvertFileModule",

  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return true;
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    for (const binExp of mod.moduleSourceFile!.getDescendantsOfKind(
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
          baseUrl,
          binExp
            .getDescendantsOfKind(SyntaxKind.BinaryExpression)[0]!
            .getDescendantsOfKind(SyntaxKind.StringLiteral)[0]
            .getText()
            .slice(1, -1)
        );
        mod.currentLocation = path.join(
          path.dirname(mod.currentLocation),
          path
            .basename(mod.currentLocation)
            .slice(0, -1 * path.extname(mod.currentLocation).length) +
            path.extname(fileUrl)
        );
        tryMkDirSync(path.dirname(mod.currentLocation));
        Deno.writeTextFileSync(
          mod.currentLocation,
          (await fetchCode(fileUrl, true)) ?? ""
        );
      }
    }
    return true;
  },
};
