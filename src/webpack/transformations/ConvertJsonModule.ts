import {
  ExpressionStatement,
  SyntaxKind,
  VariableDeclarationKind,
} from "npm:ts-morph";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";
import path from "node:path";
import { Logger } from "../../Logger.ts";

export const ConvertJsonModule: Transformation = {
  name: "ConvertJsonModule",

  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return mod.moduleType === "TSX";
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    if (!mod.moduleSourceFile) {
      return false;
    }
    const binExps = mod.moduleSourceFile.getDescendantsOfKind(
      SyntaxKind.BinaryExpression
    );
    if (binExps && binExps.length > 0) {
      for (const binExp of binExps) {
        if (
          !binExp.wasForgotten() &&
          binExp.getChildCount() === 3 &&
          binExp.getChildAtIndex(0).getText() ===
            WebpackModule.specialFunctions.module + ".exports" &&
          binExp.getChildAtIndex(1).getKind() === SyntaxKind.EqualsToken &&
          binExp.getChildAtIndex(2).getText().startsWith("JSON.parse(")
        ) {
          const rawJson = binExp
            .getChildAtIndex(2)
            .getDescendantsOfKind(SyntaxKind.StringLiteral)[0]
            .getText()
            .slice(1, -1)
            .replaceAll("\\", "");
          mod.moduleType = "FILE";
          mod.currentLocation = path.join(
            path.dirname(mod.currentLocation),
            "assets",
            `module-${mod.id}.json`
          );
          try {
            mod.setCode(JSON.stringify(JSON.parse(rawJson), null, 2));
          } catch (e) {
            mod.setCode(rawJson);
          }
        }
      }
    }
    return true;
  },
};
