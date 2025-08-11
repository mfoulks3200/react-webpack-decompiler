import { SyntaxKind } from "npm:ts-morph";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";
import { Logger } from "../../Logger.ts";

const reactFunctions = [".createElement"];

export const ConvertToJSX: Transformation = {
  name: "ConvertToJSX",

  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return true;
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const sourceFile = mod.getSourceFileAST();
    for (const expressionCall of sourceFile
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .toReversed()) {
      const expressionName = expressionCall
        .getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)?.[0]
        ?.getFullText();
      if (
        reactFunctions.some((funcName) =>
          (expressionName ?? "").trim().endsWith(funcName.trim()),
        ) &&
        expressionCall.getArguments().length > 0
      ) {
        const elementName =
          expressionCall.getArguments()?.[0].getKind() ===
          SyntaxKind.StringLiteral
            ? expressionCall
                .getArguments()?.[0]
                ?.getFullText()
                .trim()
                .replaceAll(/^"|"$/gm, "")
            : expressionCall.getArguments()?.[0]?.getFullText().trim();
        const elementAttrs = [];
        if (
          expressionCall.getArguments().length >= 2 &&
          expressionCall.getArguments()?.[1].getKind() ===
            SyntaxKind.ObjectLiteralExpression
        ) {
          for (const property of expressionCall
            .getArguments()?.[1]
            .getChildrenOfKind(SyntaxKind.PropertyAssignment)) {
            if (
              property.getChildren().length > 0 &&
              property.getChildrenOfKind(SyntaxKind.Identifier).length > 2
            ) {
              elementAttrs.push({
                key: property
                  .getChildrenOfKind(SyntaxKind.Identifier)[0]
                  .getText(),
                value: property.getChildren()[2].getText(),
              });
            }
          }
        }
        const elementChildren = [];
        if (expressionCall.getArguments().length > 2) {
          for (const child of expressionCall.getArguments()?.slice(2)) {
            if (
              [
                SyntaxKind.JsxElement,
                SyntaxKind.JsxFragment,
                SyntaxKind.JsxSelfClosingElement,
              ].includes(child.getKind())
            ) {
              elementChildren.push(child.getText().replaceAll(/;$/g, ""));
            } else {
              elementChildren.push("{" + child.getText() + "}");
            }
          }
        }
        let elementStartTag = [
          elementName,
          ...elementAttrs.map((attr) => `${attr.key}={${attr.value}}`),
        ].join(" ");
        const elementCode =
          elementChildren.length > 0
            ? `<${elementStartTag}>${elementChildren.join(
                "\n",
              )}</${elementName}>`
            : `<${elementStartTag} />`;
        expressionCall.replaceWithText(elementCode);
      }
    }
    mod.setCode(sourceFile.getFullText());
    return true;
  },
};
