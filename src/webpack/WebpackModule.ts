import path from "node:path";
import { WebpackChunk } from "./WebpackChunk.ts";
import { encodeHex } from "jsr:@std/encoding/hex";
import { Project, SourceFile } from "npm:ts-morph";
import { formatCode } from "../Prettier.ts";
import { Cache } from "../Cache.ts";
import { Transformation } from "./transformations/Transformation.ts";
import { ExportsDecompile } from "./transformations/ExportsDecompile.ts";
import { ConvertToJSX } from "./transformations/ConvertToJSX.ts";
import { AddHeaderComment } from "./transformations/AddHeaderComment.ts";
import { ConvertJsonModule } from "./transformations/ConvertJsonModule.ts";
import { ConvertFileModule } from "./transformations/ConvertFileModule.ts";

import { ImportsDecompile } from "./transformations/ImportsDecompile.ts";
import { RefactorModuleInit } from "./transformations/RefactorModuleInit.ts";
import { ReplaceDefaultSymbol } from "./transformations/ReplaceDefaultSymbol.ts";
import { Logger } from "../Logger.ts";
import { tryMkDirSync } from "../Utilities.ts";
import chalk from "npm:chalk";
import { UnfurlOptionalChain } from "./transformations/UnfurlOptionalChain.ts";

export type ModuleType = "TSX" | "FILE";

export const ModuleTransformationChain: {
  suid: number;
  transformer: Transformation;
}[] = [
  { suid: 1, transformer: RefactorModuleInit },
  { suid: 1, transformer: ExportsDecompile },
  { suid: 1, transformer: ReplaceDefaultSymbol },
  { suid: 1, transformer: UnfurlOptionalChain },
  { suid: 1, transformer: ConvertToJSX },
  // { suid: 1, transformer: AddHeaderComment },
  { suid: 1, transformer: ConvertJsonModule },
  { suid: 1, transformer: ConvertFileModule },
  { suid: 1, transformer: ImportsDecompile },
];

export class WebpackModule {
  public static modules: WebpackModule[] = [];
  public static project: Project = new Project({
    //
    compilerOptions: {
      jsx: 4,
      allowJs: true,
      resolveJsonModule: true,
    },
  });

  public static specialFunctions = {
    require: "$$_webpackRequire",
    exports: "$$_webpackExports",
    module: "$$_webpackModule",
  };

  public isLoaded: boolean = false;
  public chunk: WebpackChunk;
  public currentLocation: string = "";
  public id: string;
  private code: string = "";
  public codeHash: string = "";
  public moduleSourceFile: SourceFile | undefined;
  public transformations: string[] = [];
  public moduleType: ModuleType = "TSX";

  private constructor(id: string, parent: WebpackChunk, code: string) {
    this.id = id;
    this.code = code;
    this.chunk = parent;

    WebpackModule.modules.push(this);
  }

  public setCode(code: string) {
    this.code = code;
  }

  private async proccessInitialModule() {
    this.currentLocation = path.join(
      `chunk-${this.chunk.id}`,
      `module-${this.id}.tsx`
    );

    let formattedCode = this.code;
    try {
      formattedCode = await formatCode(this.code);
    } catch (e) {}
    this.codeHash = encodeHex(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(formattedCode)
      )
    ).toUpperCase();
    this.moduleSourceFile = WebpackModule.project.createSourceFile(
      this.currentLocation,
      formattedCode,
      { overwrite: true }
    );
  }

  public async runTransform(transform: Transformation) {
    try {
      // deno-lint-ignore no-this-alias
      const thisMod: WebpackModule = this;
      let wasCached = true;
      const transformedCode = await Cache.get(
        {
          namespace: `Transformer-${transform.name}`,
          id: await Cache.hash({
            id: this.id,
            chunk: this.chunk.id,
            name: transform.name,
            beforeCode: this.code,
          }),
        },
        async () => {
          wasCached = false;
          if (
            (await transform.canBeApplied(thisMod)) &&
            !thisMod.transformations.includes(transform.name)
          ) {
            await transform.apply(thisMod);
            if (this.moduleType === "TSX") {
              this.code = this.moduleSourceFile?.getFullText() ?? this.code;
            }
          }
          return {
            code: thisMod.code,
            currentLocation: thisMod.currentLocation,
            moduleType: thisMod.moduleType,
          };
        }
      );
      this.transformations.push(transform.name);
      this.code = transformedCode.code;
      if (this.moduleType === "TSX") {
        this.moduleSourceFile?.replaceWithText(this.code);
      }
      this.currentLocation = transformedCode.currentLocation;
      this.moduleType = transformedCode.moduleType;
    } catch (e) {
      Logger.error(
        chalk.red(`[${transform.name}]`),
        `Failed transformation ${transform.name} on module ${this.id} chunk ${this.chunk.id}`,
        e
      );
    }
  }

  public static async registerModule(
    id: string,
    parent: WebpackChunk,
    code: string
  ): Promise<WebpackModule> {
    let isNewModule = false;
    const newModule = await Cache.get(
      {
        namespace: "WebpackModule",
        id: await Cache.hash({ id, parent: parent.id, code }),
      },
      async () => {
        isNewModule = true;
        const newModule = new WebpackModule(id, parent, code);
        await newModule.proccessInitialModule();
        return newModule;
      },
      WebpackModule.serialize
    );
    if (!isNewModule) {
      return await WebpackModule.deserialize(newModule);
    } else {
      return newModule;
    }
  }

  public bakeFile() {
    tryMkDirSync(path.dirname(path.join("app", this.currentLocation)));
    Deno.writeTextFileSync(path.join("app", this.currentLocation), this.code);
  }

  public static getModule(moduleId: string) {
    return WebpackModule.modules.find((mod) => mod.id === moduleId);
  }

  public serialize(): object {
    const {
      chunk: _chunk,
      moduleSourceFile: _moduleSourceFile,
      ...rest
    } = this;
    return {
      ...rest,
      parent: this.chunk.id,
    };
  }

  public static serialize(mod: WebpackModule): object {
    return mod.serialize();
  }

  public static async deserialize(serial: any): Promise<WebpackModule> {
    const parent = WebpackChunk.getChunk(serial.parent);
    if (parent) {
      const newModule = new WebpackModule(serial.id, parent, serial.code);
      const { parent: _parent, ...rest } = serial;
      for (const key of Object.keys(rest)) {
        if (Object.hasOwn(newModule, key)) {
          // @ts-expect-error
          newModule[key] = rest[key];
        }
      }

      await newModule.proccessInitialModule();
      return newModule;
    }
    throw new Error("Couldn't find module chunk");
  }
}
