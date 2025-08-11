import { Logger } from "../../Logger.ts";
import { CSSChunk } from "../CSSChunk.ts";
import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";
import { ast, query, print } from "npm:@phenomnomnominal/tsquery";

export const CSSModuleTransformer: Transformation = {
  name: "CSSModuleTransformer",
  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return mod.moduleType === "TSX";
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    const tree = ast(mod.getCode());
    const nodes = query(tree, "VariableDeclaration ObjectLiteralExpression")
      .map((node) => print(node))
      .map((node) => node.replaceAll(/([^ "]+)(?=:)/gm, `"$1"`))
      .map((node) => node.replaceAll(/",\n}/gm, `"\n}`));

    for (const node of nodes) {
      if (node.match(/{\n(?:\s*"[^"]*": ?"[^"]*",?)*\n}/gm)) {
        for (const [original, hashed] of Object.entries(JSON.parse(node))) {
          CSSChunk.addAssociation(original, hashed as string);
        }
      }
    }
    return true;
  },
};
