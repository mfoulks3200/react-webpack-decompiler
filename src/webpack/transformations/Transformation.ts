import { WebpackModule } from "../WebpackModule.ts";

export interface Transformation {
  name: string;
  canBeApplied: (mod: WebpackModule) => Promise<boolean>;
  apply: (mod: WebpackModule) => Promise<boolean>;
}
