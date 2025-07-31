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

export type ModuleType = "TSX" | "FILE";

export const ModuleTransformationChain: Transformation[] = [
  RefactorModuleInit,
  ExportsDecompile,
  ConvertToJSX,
  //   AddHeaderComment,
  ConvertJsonModule,
  ConvertFileModule,
  ImportsDecompile,
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

    // Format Code
    try {
      this.moduleSourceFile.replaceWithText(
        await formatCode(this.moduleSourceFile.getFullText())
      );
    } catch (e) {
      console.error(this.id, e);
    }
  }

  public async runTransform(transform: Transformation) {
    try {
      if (
        (await transform.canBeApplied(this)) &&
        !this.transformations.includes(transform.name)
      ) {
        await transform.apply(this);
        this.transformations.push(transform.name);
        if (this.moduleType === "TSX") {
          this.code = this.moduleSourceFile?.getFullText() ?? this.code;
        }
      }
    } catch (e) {
      console.error(
        `Failed transformation ${transform.name} on module ${this.id} chunk ${this.chunk.id}`
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

  public async updateCache() {
    await Cache.add(
      {
        namespace: "WebpackModule",
        id: await Cache.hash({
          id: this.id,
          parent: this.chunk.id,
          code: this.code,
        }),
      },
      JSON.stringify(this.serialize())
    );
  }

  public bakeFile() {
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
