import path from "node:path";
import { WebpackChunk } from "./WebpackChunk.ts";
import { encodeHex } from "jsr:@std/encoding/hex";
import { Project, SourceFile } from "npm:ts-morph";
import { formatCode } from "../Prettier.ts";
import { Cache } from "../Cache.ts";
import {
  Transformation,
  TransformationResult,
} from "./transformations/Transformation.ts";
import { ExportsDecompile } from "./transformations/ExportsDecompile.ts";
import { ConvertToJSX } from "./transformations/ConvertToJSX.ts";
import { AddHeaderComment } from "./transformations/AddHeaderComment.ts";
import { ConvertJsonModule } from "./transformations/ConvertJsonModule.ts";
import { ConvertFileModule } from "./transformations/ConvertFileModule.ts";

import { ImportsDecompile } from "./transformations/ImportsDecompile.ts";
import { RefactorModuleInit } from "./transformations/RefactorModuleInit.ts";
import { ReplaceDefaultSymbol } from "./transformations/ReplaceDefaultSymbol.ts";
import { Logger, LoggerMessage } from "../Logger.ts";
import {
  camelize,
  tryMkDirSync,
  writeUnsureTextFileSync,
} from "../Utilities.ts";
import chalk from "npm:chalk";
import { UnfurlOptionalChain } from "./transformations/UnfurlOptionalChain.ts";
import { Fingerprint } from "./Fingerprint.ts";
import { IdentifyKnownImports } from "./transformations/IdentifyKnownImports.ts";
import { CSSModuleTransformer } from "./transformations/CSSModuleTransformer.ts";

export type ModuleType = "TSX" | "FILE";

export const ModuleTransformationChain: {
  suid: number;
  transformer: Transformation;
}[] = [
  { suid: 1, transformer: ReplaceDefaultSymbol },
  { suid: 1, transformer: RefactorModuleInit },
  { suid: 1, transformer: ExportsDecompile },
  { suid: 1, transformer: UnfurlOptionalChain },
  { suid: 1, transformer: ConvertToJSX },
  // // { suid: 1, transformer: AddHeaderComment },
  { suid: 1, transformer: ConvertJsonModule },
  { suid: 1, transformer: ConvertFileModule },
  { suid: 1, transformer: CSSModuleTransformer },
  { suid: 1, transformer: ImportsDecompile },
  { suid: 1, transformer: IdentifyKnownImports },
];

export class WebpackModule {
  public static modules: WebpackModule[] = [];

  public static specialFunctions = {
    require: "$$_webpackRequire",
    exports: "$$_webpackExports",
    module: "$$_webpackModule",
  };

  public isLoaded: boolean = false;
  public chunk: WebpackChunk;
  public currentLocation: string = "";
  public id: string;
  public name: string;
  private code: string = "";
  public codeHash: string = "";
  public transformations: string[] = [];
  private transformationLog: TransformationResult[] = [];
  public moduleType: ModuleType = "TSX";

  private constructor(id: string, parent: WebpackChunk, code: string) {
    this.id = id;
    this.code = code;
    this.chunk = parent;
    this.name = `module-${id}`;

    WebpackModule.modules.push(this);
  }

  public setCode(code: string) {
    this.code = code;
  }

  public getCode() {
    return this.code;
  }

  private async proccessInitialModule() {
    this.currentLocation = path.join(this.chunk.name, `${this.name}.tsx`);
    this.codeHash = encodeHex(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(this.code))
    ).toUpperCase();
  }

  public async runTransform(transform: Transformation) {
    const thisTransformation: TransformationResult = {
      name: transform.name,
      state: "success",
      wasCached: true,
      durationMs: Date.now(),
      beforeCode: this.code,
      afterCode: "",
      logMessages: [],
    };
    const logHandler = (message: LoggerMessage) => {
      thisTransformation.logMessages.push(message);
    };
    Logger.addEventListener(logHandler);
    try {
      if (
        (await transform.canBeApplied(this)) &&
        !this.transformations.includes(transform.name)
      ) {
        // deno-lint-ignore no-this-alias
        const thisMod: WebpackModule = this;
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
            thisTransformation.wasCached = false;
            await transform.apply(thisMod);
            return {
              code: thisMod.code,
              currentLocation: thisMod.currentLocation,
              moduleType: thisMod.moduleType,
            };
          }
        );
        this.transformations.push(transform.name);
        this.code = transformedCode.code;
        this.currentLocation = transformedCode.currentLocation;
        this.moduleType = transformedCode.moduleType;
      } else {
        thisTransformation.state = "skipped";
      }
    } catch (e) {
      Logger.error(
        chalk.red(`[${transform.name}]`),
        `Failed transformation ${transform.name} on module ${this.id} chunk ${this.chunk.id}`,
        e
      );
      thisTransformation.state = "error";
    }

    thisTransformation.durationMs = Date.now() - thisTransformation.durationMs;
    thisTransformation.afterCode = this.code;
    this.transformationLog.push(thisTransformation);
    Logger.removeEventListener(logHandler);
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
        id: await Cache.hash({ id: id, parent: parent.id, code }),
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

  public async bakeFile(outputStats?: boolean) {
    writeUnsureTextFileSync(
      path.join("app", "src", this.currentLocation),
      this.moduleType === "TSX" ? await formatCode(this.code) : this.code
    );
    //Output stats
    if (outputStats) {
      const statsDir = path.join(".stats", this.chunk.name, this.name);

      const modManifest: any = {
        module: {
          id: this.id,
          name: this.name,
        },
        chunk: {
          id: this.chunk.id,
          name: this.chunk.name,
          remotePath: this.chunk.remotePath,
          remoteUrl: this.chunk.remoteUrl,
        },
        transforms: [],
      };

      let i = 0;
      for (const transform of this.transformationLog) {
        const transformManifest = {
          name: transform.name,
          files: {
            beforeCode: path.join(
              statsDir,
              "transforms",
              `${i}_` + camelize(transform.name),
              "before.code"
            ),
            afterCode: path.join(
              statsDir,
              "transforms",
              `${i}_` + camelize(transform.name),
              "after.code"
            ),
            consoleLog: path.join(
              statsDir,
              "transforms",
              `${i}_` + camelize(transform.name),
              "console.log"
            ),
          },
          duration: transform.durationMs,
          state: transform.state,
          wasCached: transform.wasCached,
          errorCount: transform.logMessages.filter(
            (message) => message.messageType === "error"
          ).length,
        };
        writeUnsureTextFileSync(
          path.join("app", transformManifest.files.beforeCode),
          transform.beforeCode
        );
        writeUnsureTextFileSync(
          path.join("app", transformManifest.files.afterCode),
          transform.afterCode
        );
        writeUnsureTextFileSync(
          path.join("app", transformManifest.files.consoleLog),
          transform.logMessages
            .map((message) => message.renderedMessage)
            .join("\n")
        );
        modManifest.transforms.push(transformManifest);
        i++;
      }
      writeUnsureTextFileSync(
        path.join("app", statsDir, "manifest.json"),
        JSON.stringify(modManifest, null, 2)
      );
    }
  }

  public getSourceFileAST(): SourceFile {
    const project = new Project({
      //
      compilerOptions: {
        jsx: 4,
        allowJs: true,
        resolveJsonModule: true,
      },
    });

    return project.createSourceFile(this.currentLocation, this.code, {
      overwrite: true,
    });
  }

  public static getModule(moduleId: string) {
    return WebpackModule.modules.find((mod) => mod.id === moduleId);
  }

  public serialize(): object {
    const { chunk: _chunk, ...rest } = this;
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
