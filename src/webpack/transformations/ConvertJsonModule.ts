import {
  ExpressionStatement,
  SyntaxKind,
  VariableDeclarationKind,
} from "npm:ts-morph";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";
import path from "node:path";

export const ConvertJsonModule: Transformation = {
  name: "ConvertJsonModule",

  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return true;
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const expression = mod.moduleSourceFile!.getChildrenOfKind(
      SyntaxKind.BinaryExpression
    )?.[0];
    if (expression) {
      const varName = expression.getChildrenOfKind(
        SyntaxKind.PropertyAccessExpression
      )?.[0];
      if (
        varName &&
        varName.getText().trim() ===
          `${WebpackModule.specialFunctions.module}.exports` &&
        expression.getChildrenOfKind(SyntaxKind.EqualsToken).length == 1
      ) {
        const jsonExpression = expression.getChildrenOfKind(
          SyntaxKind.CallExpression
        )?.[0];
        if (
          jsonExpression &&
          jsonExpression.getChildrenOfKind(SyntaxKind.PropertyAccessExpression)
            .length == 1 &&
          jsonExpression
            .getChildrenOfKind(SyntaxKind.PropertyAccessExpression)[0]
            .getText()
            .trim() === "JSON.parse"
        ) {
          const jsonContent = jsonExpression
            .getChildrenOfKind(SyntaxKind.StringLiteral)[0]
            .getText()
            .slice(1, -2);
          mod.moduleType = "FILE";
          mod.setCode(JSON.stringify(JSON.parse(jsonContent), null, 2));
          mod.currentLocation = path.join(
            "chunk-" + mod.chunk.id,
            `module-${mod.id}.json`
          );
        }
      }
    }
    return true;
  },
};
