import { ExpressionStatement, SyntaxKind } from "npm:ts-morph";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";

export const ExportsDecompile: Transformation = {
  name: "ExportsDecompile",

  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return true;
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const newExportDecls: string[] = [];
    const expressionsToRemove: ExpressionStatement[] = [];
    for (const expressionCall of mod.moduleSourceFile!.getDescendantsOfKind(
      SyntaxKind.CallExpression
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
        );
        try {
          expressionsToRemove.push(
            expressionCall.getParent() as ExpressionStatement
          );
        } catch (e) {}
      }
    }
    try {
      if (newExportDecls.length > 0) {
        mod.moduleSourceFile!.addExportDeclaration({
          namedExports: newExportDecls,
        });
        for (const expressionToRemove of expressionsToRemove) {
          let parent = expressionToRemove;
          while (parent?.getKind() !== SyntaxKind.ExpressionStatement) {
            parent = parent.getParent()! as ExpressionStatement;
          }
          if (parent?.getKind() === SyntaxKind.ExpressionStatement) {
            (parent as ExpressionStatement).remove();
          }
        }
      }
    } catch (e) {
      console.error(mod.id, e);
    }
    return true;
  },
};
