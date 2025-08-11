import { SyntaxKind } from "npm:ts-morph";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";
import { Logger } from "../../Logger.ts";

interface WellKnownFunctions {
  moduleImportName: string;
  namedImport: string;
  functionNames: string[];
}

const wellKnownFunctions: WellKnownFunctions[] = [
  {
    moduleImportName: "react-dom",
    namedImport: "ReactDom",
    functionNames: ["createPortal"],
  },
  {
    moduleImportName: "react",
    namedImport: "React",
    functionNames: [
      "createElement",
      "useRef",
      "useState",
      "cloneElement",
      "forwardRef",
    ],
  },
];

const getWellKnownFunction = (functionName: string) => {
  return wellKnownFunctions.find((wkf) =>
    wkf.functionNames.includes(functionName)
  );
};

export const IdentifyKnownImports: Transformation = {
  name: "IdentifyKnownImports",
  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return mod.moduleType === "TSX";
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const sourceFile = mod.getSourceFileAST();
    for (const expressionCall of sourceFile
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .toReversed()) {
      try {
        const expressionName = expressionCall
          .getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)?.[0]
          .getDescendantsOfKind(SyntaxKind.Identifier)
          .toReversed()[0]
          ?.getFullText();
        const wkf = getWellKnownFunction(expressionName);
        if (wkf) {
          const ident = expressionCall
            .getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)?.[0]
            .getChildrenOfKind(SyntaxKind.Identifier)[0];

          ident.rename(wkf.namedImport);
          try {
            for (const def of ident
              .getDefinitions()
              .map((def) => def.getDeclarationNode()!)) {
              if (def.getKind() === SyntaxKind.NamespaceImport) {
                def
                  .getParent()!
                  .getParent()!
                  .getDescendantsOfKind(SyntaxKind.StringLiteral)[0]
                  .replaceWithText(`"${wkf.moduleImportName}"`);
              }
            }
          } catch (e) {
            Logger.log(e);
          }
        }
      } catch (e) {
        Logger.error(e);
      }
    }
    mod.setCode(sourceFile.getFullText());
    return true;
  },
};
