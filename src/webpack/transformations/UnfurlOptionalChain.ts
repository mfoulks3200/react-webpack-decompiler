import { SyntaxKind } from "npm:ts-morph";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";

export const UnfurlOptionalChain: Transformation = {
  name: "UnfurlOptionalChain",
  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return mod.moduleType === "TSX";
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const sourceFile = mod.getSourceFileAST();
    if (!sourceFile) {
      return false;
    }
    const expressions = sourceFile.getDescendantsOfKind(
      SyntaxKind.ParenthesizedExpression,
    );
    if (expressions.length > 0) {
      for (const expression of expressions) {
        const binExp = expression.getChildrenOfKind(
          SyntaxKind.BinaryExpression,
        );
        if (
          binExp.length > 0 &&
          binExp[0].getChildCount() === 3 &&
          binExp[0].getChildAtIndex(0).getText().trim().toLowerCase() === "0" &&
          binExp[0].getChildAtIndex(1).getKind() === SyntaxKind.CommaToken
        ) {
          expression.replaceWithText(binExp[0].getChildAtIndex(2).getText());
        }
      }
    }

    //Convert !1 to false
    const unaryExps = sourceFile.getDescendantsOfKind(
      SyntaxKind.PrefixUnaryExpression,
    );
    if (unaryExps.length > 0) {
      for (const unaryExp of unaryExps) {
        if (unaryExp.getText() === "!1") {
          unaryExp.replaceWithText("false");
        }
      }
    }

    mod.setCode(sourceFile.getFullText());
    return true;
  },
};
