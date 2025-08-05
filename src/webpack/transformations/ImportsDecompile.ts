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
    for (const varDecl of mod.moduleSourceFile!.getVariableDeclarations()) {
      try {
        if (
          varDecl.getChildren().length >= 2 &&
          varDecl.getChildren()[1].getKindName() === "EqualsToken" &&
          varDecl.getChildren()[2].getKindName() === "CallExpression"
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
              mod.moduleSourceFile!.addImportDeclaration({
                namespaceImport: varDecl.getName(),
                moduleSpecifier:
                  (modPathStr.startsWith(".") ? "" : "./") + modPathStr,
              });
            } else {
              const moduleSpecifier = `../modules/module-${modId}.tsx`;
              mod.moduleSourceFile!.addImportDeclaration({
                namespaceImport: varDecl.getName(),
                moduleSpecifier,
              });
            }
            varDecl.remove();
          }
        }
      } catch (e) {
        Logger.error(mod.id, e);
      }
    }
    return true;
  },
};
