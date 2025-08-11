import * as prettier from "npm:prettier";
import { Logger } from "./Logger.ts";

export const formatCode = async (
  code: string,
  parser: string = "babel"
): Promise<string> => {
  try {
    return await prettier.format(code, {
      semi: true,
      parser,
    });
  } catch (e) {
    return code;
  }
};
