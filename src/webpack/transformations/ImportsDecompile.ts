import { SyntaxKind } from "npm:ts-morph";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";
import path from "node:path";
import { Logger } from "../../Logger.ts";

export const ImportsDecompile: Transformation = {
  name: "ImportsDecompile",

  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return mod.moduleType === "TSX";
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const sourceFile = mod.getSourceFileAST();
    for (const varDecl of sourceFile.getVariableDeclarations()) {
      try {
        if (
          varDecl.getChildren().length >= 2 &&
          varDecl.getChildren()[1].getKindName() === "EqualsToken" &&
          varDecl.getChildren()[2].getKindName() === "CallExpression" &&
          !varDecl.wasForgotten()
        ) {
          const expression = varDecl.getDescendantsOfKind(
            SyntaxKind.CallExpression
          )[0];
          if (
            expression
              .getDescendantsOfKind(SyntaxKind.Identifier)[0]
              .getText() === WebpackModule.specialFunctions.require &&
            expression.getArguments().length > 0
          ) {
            const modId = expression.getArguments()[0].getText();
            const modLookup = WebpackModule.getModule(modId);
            if (modLookup) {
              const modPath = [];
              if (modLookup.chunk.id !== mod.chunk.id) {
                modPath.push("..");
                modPath.push(`chunk-${modLookup.chunk.id}`);
              } else {
                modPath.push("./");
              }
              modPath.push(path.basename(modLookup.currentLocation));
              const modPathStr = path.join(...modPath);
              sourceFile.addImportDeclaration({
                namespaceImport: varDecl.getName(),
                moduleSpecifier:
                  (modPathStr.startsWith(".") ? "" : "./") + modPathStr,
              });
            } else {
              const moduleSpecifier = "../" + mod.currentLocation;
              sourceFile.addImportDeclaration({
                namespaceImport: varDecl.getName(),
                moduleSpecifier,
              });
            }
            varDecl.remove();
          }
        }

        // Statically imported files
        if (
          varDecl.getChildCount() > 3 &&
          varDecl.getChildAtIndexIfKind(2, SyntaxKind.BinaryExpression) &&
          !varDecl.wasForgotten()
        ) {
          const binExp = varDecl.getChildAtIndexIfKind(
            2,
            SyntaxKind.BinaryExpression
          );
          if (
            binExp!
              .getText()
              .startsWith(`${WebpackModule.specialFunctions.require}.p +`) &&
            binExp!.getChildCount() === 3 &&
            binExp!.getChildAtIndexIfKind(2, SyntaxKind.StringLiteral)
          ) {
            const importString = binExp!
              .getChildAtIndexIfKind(2, SyntaxKind.StringLiteral)!
              .getFullText()
              .slice(1, -1);
            Logger.log("Found import", importString);
          }
        }
      } catch (e) {
        Logger.error(mod.id, e);
      }
    }
    mod.setCode(sourceFile.getFullText());
    return true;
  },
};
