import { tryMkDirSync } from "./Utilities.ts";
import path from "node:path";
import { encodeHex } from "jsr:@std/encoding/hex";
import fs from "node:fs";
import { Logger } from "./Logger.ts";

interface CacheItem<T> {
  uuid: string;
  namespace: string;
  id: string;
  cachedAt: string;
  ttlSec?: number;
  content: T;
  isSaved: boolean;
}

type Primative = string | object | number | boolean;

type CacheOptions<T> = Omit<
  CacheItem<T>,
  "uuid" | "cachedAt" | "content" | "isSaved"
> & {
  namespace: string;
};

export class Cache {
  private static path: string = path.join(".cache");
  private static defaultTtlMSec: number = 100 * 60 * 60 * 24 * 7;
  private static cache: (Omit<Required<CacheItem<Primative>>, "content"> & {
    content?: Primative;
  })[] = [];

  public static async initialize() {
    console.debug("Initializing Cache");
    const manifestPath = path.join(Cache.path, "manifest.json");
    const existingNamespaces: Set<string> = new Set();
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(await Deno.readTextFileSync(manifestPath));
      console.debug(`Loading ${manifest.length} cached items`);
      for (const item of manifest) {
        if (
          existingNamespaces.has(item.namespace) ||
          fs.existsSync(path.join(Cache.path, item.namespace))
        ) {
          this.cache.push({
            ...item,
            content: undefined,
            isSaved: true,
          });
          existingNamespaces.add(item.namespace);
        } else {
          // Logger.log("Missing namespace", item.namespace);
        }
      }
    } else {
      tryMkDirSync(Cache.path);
    }
    this.save();
  }

  public static async get<T>(
    options: CacheOptions<T>,
    fallback: (() => Promise<Primative>) | T,
    serializer?: (obj: any) => Promise<Primative> | Primative
  ) {
    let existing = this.cache.find(
      (item) => item.id === options.id && item.namespace === options.namespace
    );
    if (
      existing &&
      existing.ttlSec + new Date(existing.cachedAt).getTime() < Date.now()
    ) {
      this.cache = this.cache.filter((item) => item.uuid === existing!.uuid);
      try {
        Deno.removeSync(Cache.getFilePath(existing));
      } catch (e) {}
      existing = undefined;
      Cache.save();
    }
    if (existing) {
      if (existing.content) {
        return existing.content;
      } else {
        existing.content = JSON.parse(
          Deno.readTextFileSync(Cache.getFilePath(existing))
        );
        return existing.content;
      }
    } else {
      const content = await (typeof fallback === "function"
        ? await (fallback as Function)()
        : fallback);
      if (content) {
        Cache.add(options, serializer ? await serializer(content) : content);
      }
      return content;
    }
  }

  public static add<T>(options: CacheOptions<T>, value: NonNullable<T>) {
    if (value === undefined) {
      return;
    }
    const existing = this.cache.find(
      (item) => item.id === options.id && item.namespace === options.namespace
    );
    if (existing) {
      existing.cachedAt = new Date().toISOString();
      existing.content = value;
      existing.isSaved = false;
    }
    this.cache.push({
      ttlSec: Cache.defaultTtlMSec,
      ...options,
      uuid: crypto.randomUUID(),
      cachedAt: new Date().toISOString(),
      content: value,
      isSaved: false,
    });
    Cache.save();
  }

  private static save() {
    const existingNamespaces: string[] = [];
    const manifest = [];
    for (const item of Cache.cache.filter((item) => !item.isSaved)) {
      const namespacePath = path.join(Cache.path, item.namespace);
      if (!existingNamespaces.includes(namespacePath)) {
        existingNamespaces.push(namespacePath);
        tryMkDirSync(namespacePath);
      }
      if (item.content) {
        Deno.writeTextFileSync(
          Cache.getFilePath(item),
          JSON.stringify(item.content)
        );
      }
      item.isSaved = true;
    }
    for (const item of Cache.cache) {
      const { content: _content, isSaved: _isSaved, ...manifestEntry } = item;
      manifest.push(manifestEntry);
    }
    Deno.writeTextFileSync(
      path.join(Cache.path, "manifest.json"),
      JSON.stringify(manifest, null, 2)
    );
  }

  public static getFilePath(cacheItem: Omit<CacheItem<any>, "content">) {
    return path.join(
      Cache.path,
      cacheItem.namespace,
      cacheItem.uuid + ".cache"
    );
  }

  public static async hash(...args: any) {
    const messageBuffer = new TextEncoder().encode(JSON.stringify(args));
    const hashBuffer = await crypto.subtle.digest("SHA-256", messageBuffer);
    return encodeHex(hashBuffer).toUpperCase();
  }
}
