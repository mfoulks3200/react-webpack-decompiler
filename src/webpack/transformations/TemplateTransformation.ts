import { WebpackModule } from "../WebpackModule.ts";
import { Transformation } from "./Transformation.ts";

export const RefactorModuleInit: Transformation = {
  name: "RefactorModuleInit",
  canBeApplied: async (mod: WebpackModule): Promise<boolean> => {
    return true;
  },

  apply: async (mod: WebpackModule): Promise<boolean> => {
    return true;
  },
};
