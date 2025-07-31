import * as prettier from "npm:prettier";

export const formatCode = async (code: string): Promise<string> => {
  return await prettier.format(code, {
    semi: true,
    parser: "babel",
  });
};
