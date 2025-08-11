import path from "node:path";
import fs from "node:fs";
import { fetchCode } from "../Utilities.ts";

import { Cache } from "../Cache.ts";
import { WebpackModule } from "./WebpackModule.ts";
import { Logger } from "../Logger.ts";

export class WebpackChunk {
  public static chunks: WebpackChunk[] = [];

  public isLoaded: boolean = false;
  public id: string;
  public remotePath: string;
  public remoteUrl: string;
  private code: string = "";

  public modules: WebpackModule[] = [];

  private constructor(id: string, remotePath: string, remoteUrl: string) {
    this.id = id;
    this.remotePath = remotePath;
    this.remoteUrl = remoteUrl;

    WebpackChunk.chunks.push(this);
  }

  private async loadChunk() {
    const chunkCode = await fetchCode(this.remoteUrl);
    if (chunkCode) {
      this.code = chunkCode;
    } else {
      Logger.error("Chunk could not be downloaded, skipping...");
    }
  }

  public async extractModules() {
    const regex =
      /^\s{4}"?(?<moduleId>(?:[0-9]*|[^"]*))"?: (?<moduleCode>(?:(?:.|\n)(?!\n\s{4}},?))*.\n\s{4}\})/gm;

    let m;
    while ((m = regex.exec(this.code)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      if (m.groups && m.groups["moduleId"] && m.groups["moduleCode"]) {
        const rawCode = "export default " + m.groups["moduleCode"];
        try {
          this.modules.push(
            await WebpackModule.registerModule(
              m.groups["moduleId"]
                .replaceAll("node_modules/", "")
                .replaceAll("./", "")
                .replaceAll("/", "-"),
              this,
              rawCode
            )
          );
        } catch (e) {
          Logger.error("Failed to register module ", this.serialize(), e);
        }
      }
    }
  }

  public static async registerChunk(
    id: string,
    remotePath: string,
    remoteUrl: string
  ): Promise<WebpackChunk> {
    let isNewChunk = false;
    const chunk = await Cache.get(
      {
        namespace: "WebpackChunk",
        id: await Cache.hash({ id, remotePath, remoteUrl }),
      },
      async () => {
        isNewChunk = true;
        const newChunk = new WebpackChunk(id, remotePath, remoteUrl);
        await newChunk.loadChunk();
        return newChunk;
      }
    );
    if (!isNewChunk) {
      return await WebpackChunk.deserialize(chunk);
    } else {
      return chunk;
    }
  }

  public static getChunk(id: string): WebpackChunk | undefined {
    return WebpackChunk.chunks.find((chunk) => chunk.id === id);
  }

  public serialize(): object {
    const { modules: _modules, ...rest } = this;
    return {
      ...rest,
      modules: this.modules.map((mod) => mod.id),
    };
  }

  public static async deserialize(serial: any): Promise<WebpackChunk> {
    let newChunk = new WebpackChunk(
      serial.id,
      serial.remotePath,
      serial.remoteUrl
    );
    await newChunk.loadChunk();
    return newChunk;
  }
}
