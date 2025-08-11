import path from "node:path";
// @deno-types="npm:@types/css-tree"
import * as csstree from "npm:css-tree";
import { formatCode } from "../Prettier.ts";
import { fetchCode } from "../Utilities.ts";
import { Logger } from "../Logger.ts";

interface HashAssociation {
  source: CSSChunk;
  originalName: string;
  hashedName: string;
}

export class CSSChunk {
  public static chunks: CSSChunk[] = [];
  public static hashAssociation: HashAssociation[] = [];

  public id: string = "";
  public remotePath: string = "";
  public remoteUrl: string = "";
  public currentLocation: string = "";
  public code: string = "";
  public classNames: string[] = [];
  public classFingerprint: string = "";

  private constructor(id: string, remotePath: string, remoteUrl: string) {
    this.id = id;
    this.remotePath = remotePath;
    this.remoteUrl = remoteUrl;
    this.currentLocation = path.join(
      "app/css-modules",
      this.id + ".module.css"
    );
    CSSChunk.chunks.push(this);
  }

  public async loadChunk() {
    this.code = await formatCode(await fetchCode(this.remoteUrl), "css");
    const ast = csstree.parse(this.code);
    const classNames = new Set<string>(
      csstree
        .findAll(
          ast,
          (node: any, item: any, list: any) => node.type === "ClassSelector"
        )
        .map((node: { name: any }) => node.name)
    );
    this.classNames = [...classNames];
    this.classFingerprint = this.classNames.join(" ");
  }

  public async bakeFile() {
    const ast = csstree.parse(this.code);
    const classes = csstree.findAll(
      ast,
      (node, item, list) => node.type === "ClassSelector"
    ) as csstree.ClassSelector[];
    let code = this.code;
    for (const classObj of classes) {
      const assoc = CSSChunk.hashAssociation.find(
        (assoc) => assoc.hashedName === classObj.name
      );
      if (assoc) {
        Logger.log(`.${classObj.name}`, `.${assoc.originalName}`);
        code = code.replaceAll(`.${classObj.name}`, `.${assoc.originalName}`);
      }
    }
    Deno.writeTextFileSync(this.currentLocation, await formatCode(code, "css"));
  }

  public static findClass(className: string): CSSChunk | undefined {
    return CSSChunk.chunks.find((chunk) =>
      chunk.classNames.includes(className)
    );
  }

  public static addAssociation(originalName: string, hashedName: string) {
    const chunk = CSSChunk.findClass(hashedName);
    if (chunk) {
      CSSChunk.hashAssociation.push({
        source: chunk,
        originalName,
        hashedName,
      });
    }
  }

  public static async registerChunk(
    rawId: string,
    remotePath: string,
    remoteUrl: string
  ) {
    const id = path.basename(rawId).split(".")[0];
    const existing = CSSChunk.chunks.find((chunks) => id === chunks.id);
    if (existing) {
      return existing;
    }
    const chunk = new CSSChunk(id, remotePath, remoteUrl);
    await chunk.loadChunk();
    return chunk;
  }
}
