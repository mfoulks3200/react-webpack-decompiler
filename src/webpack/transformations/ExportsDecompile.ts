import { ExpressionStatement, SyntaxKind } from "npm:ts-morph";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";
import { Logger } from "../../Logger.ts";

export const ExportsDecompile: Transformation = {
  name: "ExportsDecompile",

  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return true;
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const sourceFile = mod.getSourceFileAST();
    const newExportDecls: string[] = [];
    const expressionsToRemove: ExpressionStatement[] = [];
    for (const expressionCall of sourceFile.getDescendantsOfKind(
      SyntaxKind.CallExpression,
    )) {
      if (expressionCall.wasForgotten()) {
        continue;
      }
      const expressionName = expressionCall
        .getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)?.[0]
        ?.getFullText();
      const expressionArg1 = expressionCall.getArguments()?.[0]?.getFullText();
      if (
        (expressionName ?? "").trim() ===
          `${WebpackModule.specialFunctions.require}.d`.trim() &&
        expressionArg1 === WebpackModule.specialFunctions.exports
      ) {
        newExportDecls.push(
          ...expressionCall
            .getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)?.[0]
            .getChildrenOfKind(SyntaxKind.PropertyAssignment)
            .map((child) => {
              if (
                child.wasForgotten() ||
                child.getChildrenOfKind(SyntaxKind.Identifier).length === 0
              ) {
                return undefined;
              }
              const name = child
                .getChildrenOfKind(SyntaxKind.Identifier)[0]
                .getText();
              let value = "";
              if (
                child.getChildrenOfKind(SyntaxKind.ArrowFunction).length > 0
              ) {
                child
                  .getChildrenOfKind(SyntaxKind.ArrowFunction)[0]
                  .getChildrenOfKind(SyntaxKind.Identifier)[0]
                  .rename(name);
                return `${name}`;
              } else if (
                child.getChildrenOfKind(SyntaxKind.FunctionExpression).length >
                0
              ) {
                value = child
                  .getChildrenOfKind(SyntaxKind.FunctionExpression)[0]
                  .getDescendantsOfKind(SyntaxKind.ReturnStatement)[0]
                  .getChildren()[1]
                  .getText();
              }
              return `${value} as ${name}`;
            })
            .filter((item) => item !== undefined)
            .filter((item) => item !== "default"),
        );
        try {
          if (expressionCall) {
            expressionsToRemove.push(
              expressionCall.getParent() as ExpressionStatement,
            );
          }
        } catch (e) {
          Logger.error(e);
        }
      }
    }
    try {
      if (newExportDecls.length > 0) {
        sourceFile.insertExportDeclaration(0, {
          namedExports: newExportDecls,
        });
        for (const expressionToRemove of expressionsToRemove) {
          let parent = expressionToRemove;
          while (
            !parent?.wasForgotten() &&
            parent?.getKind() !== SyntaxKind.ExpressionStatement
          ) {
            parent = parent.getParent()! as ExpressionStatement;
          }
          if (
            !parent.wasForgotten() &&
            parent?.getKind() === SyntaxKind.ExpressionStatement
          ) {
            (parent as ExpressionStatement).remove();
          }
        }
      }
    } catch (e) {
      Logger.error(mod.id, e);
    }
    mod.setCode(sourceFile.getFullText());
    return true;
  },
};
