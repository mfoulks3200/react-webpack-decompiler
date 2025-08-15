import { LoggerMessage } from "../../Logger.ts";
import { WebpackModule } from "../WebpackModule.ts";

export interface TransformationResult {
  name: string;
  state: "success" | "error" | "skipped" | "in-progress";
  wasCached: boolean;
  durationMs: number;
  beforeCode: string;
  afterCode: string;
  logMessages: LoggerMessage[];
}

export interface Transformation {
  name: string;
  canBeApplied: (mod: WebpackModule) => Promise<boolean>;
  apply: (mod: WebpackModule) => Promise<boolean>;
}
