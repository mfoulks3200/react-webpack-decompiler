"use server";

import fs from "fs";
import path from "path";

const rootProjectPath =
  "/Users/mfoulks/Documents/git/react-webpack-decompiler/v2/app/.stats";

export type ModuleManifest = Record<string, any>;
export type ChunkManifest = Record<string, ModuleManifest>;

export const getAllModules = async (): Promise<ChunkManifest> => {
  const chunks: ChunkManifest = {};
  for (const chunkName of fs.readdirSync(rootProjectPath)) {
    chunks[chunkName] = {};
    for (const moduleName of fs.readdirSync(
      path.join(rootProjectPath, chunkName)
    )) {
      chunks[chunkName][moduleName] = JSON.parse(
        fs.readFileSync(
          path.join(rootProjectPath, chunkName, moduleName, "manifest.json"),
          "utf-8"
        )
      );
    }
  }
  return chunks;
};

export const getModuleManifest = async (
  chunkName: string,
  moduleName: string
): Promise<ModuleManifest> => {
  return JSON.parse(
    fs.readFileSync(
      path.join(rootProjectPath, chunkName, moduleName, "manifest.json"),
      "utf-8"
    )
  );
};

export const getTransformFile = async (
  chunkName: string,
  moduleName: string,
  transformName: string,
  fileName: string
): Promise<string> => {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(rootProjectPath, chunkName, moduleName, "manifest.json"),
      "utf-8"
    )
  );
  const transform = manifest.transforms.find(
    (transform: any) => transform.name === transformName
  );
  const filePath = path.join(
    path.dirname(rootProjectPath),
    transform.files[fileName]
  );
  const content: string = fs.readFileSync(filePath, "utf-8");
  return content;
};
