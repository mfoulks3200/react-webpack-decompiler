import { SyntaxKind } from "npm:ts-morph";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";

export const RefactorModuleInit: Transformation = {
  name: "RefactorModuleInit",

  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    const sourceFile = mod.getSourceFileAST();
    if (!sourceFile) {
      return false;
    }
    const exportAssigns = sourceFile.getDescendantsOfKind(
      SyntaxKind.ExportAssignment,
    );
    return (
      exportAssigns.length > 0 &&
      exportAssigns[0].getDescendantsOfKind(SyntaxKind.ArrowFunction).length >
        0 &&
      exportAssigns[0]
        .getDescendantsOfKind(SyntaxKind.ArrowFunction)[0]
        .getParameters().length > 0
    );
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const sourceFile = mod.getSourceFileAST();
    if (!sourceFile) {
      return false;
    }
    // Refactor module init code to unique names
    const moduleInitParameters = sourceFile
      .getDescendantsOfKind(SyntaxKind.ExportAssignment)[0]
      .getDescendantsOfKind(SyntaxKind.ArrowFunction)[0]
      .getParameters();

    moduleInitParameters[0]?.rename(WebpackModule.specialFunctions.module);
    moduleInitParameters[1]?.rename(WebpackModule.specialFunctions.exports);
    moduleInitParameters[2]?.rename(WebpackModule.specialFunctions.require);

    // Break module init out of init function
    if (
      sourceFile.getDescendantsOfKind(SyntaxKind.ExportAssignment).length > 0
    ) {
      sourceFile.replaceWithText(
        sourceFile
          .getDescendantsOfKind(SyntaxKind.ExportAssignment)[0]
          .getDescendantsOfKind(SyntaxKind.ArrowFunction)[0]
          .getBody()
          .getChildren()[1]
          .getChildren()
          .map((child) => child.getText())
          .join("\n"),
      );
    }
    mod.setCode(sourceFile.getFullText());
    return true;
  },
};
