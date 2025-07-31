import path from "node:path";
import { fetchCode } from "../Utilities.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { WebpackChunk } from "./WebpackChunk.ts";

export const findWebpackManifestScript = async (url: string) => {
  const urlObj = new URL(url);
  const rawDom = await fetchCode(url);
  if (!rawDom) {
    return false;
  }
  const parser = new DOMParser();
  const dom = parser.parseFromString(rawDom, "text/html");
  for (const scriptElem of dom.getElementsByTagName("script")) {
    if (scriptElem.hasAttribute("src")) {
      let scriptUrl = scriptElem.getAttribute("src")!;
      if (scriptUrl?.startsWith("/")) {
        scriptUrl = urlObj.host + scriptUrl;
      }
      const content = await fetchCode(scriptUrl);
      if (content && content.includes(`"Loading chunk "`)) {
        return {
          url: scriptUrl,
          content,
        };
      }
    } else {
      if (scriptElem.innerText.includes(`"Loading chunk "`)) {
        return {
          url: "local",
          content: scriptElem.innerText,
        };
      }
    }
  }
  return false;
};

export const extractRawJSChunks = (code: string) => {
  const regex = /^\s*\(t.u = \(e\) =>(?:(?:.|\n)(?!\),))*.\)/gm;

  const m = regex.exec(code);

  return m ? m[0] : null;
};

export const buildChunkNameParts = (baseUrl: string, code: string) => {
  const regex =
    /^\s*"(?<staticString>[^"]*)" ?\+?|^\s*\(*{(?<table>(?:(?:.|\n)(?!}))*)/gm;

  const moduleIds: Set<string> = new Set();
  const builderParts: ((modId: string) => string)[] = [];

  let m;
  while ((m = regex.exec(code)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }

    if (m && m.groups) {
      if (m.groups["staticString"]) {
        const str = m.groups["staticString"];
        builderParts.push((modId) => str as string);
      }
      if (m.groups["table"]) {
        const table = JSON.parse(
          "{" +
            m.groups["table"]
              .trim()
              .slice(0, -1)
              .replaceAll(/^\s*([^:]*):\s*"([^"]*)"/gm, `"$1": "$2"`) +
            "}"
        );
        for (const modId of Object.keys(table)) {
          moduleIds.add(modId);
        }
        builderParts.push((modId) => table[modId.toString()] ?? modId);
      }
    }
  }

  const modules = [];
  for (const modId of moduleIds) {
    let modPath = "";
    for (const builderPart of builderParts) {
      modPath += builderPart(modId);
    }
    modules.push({
      id: modId,
      remotePath: modPath,
      url: path.join(baseUrl, modPath),
    });
  }
  return modules;
};

export const analyzeManifest = async (baseUrl: string, code: string) => {
  const rawJSChunks = extractRawJSChunks(code);
  const jsChunks = buildChunkNameParts(baseUrl, rawJSChunks ?? "");
  return jsChunks;

  //   Deno.writeTextFileSync(
  //     "app/chunkManifest.json",
  //     JSON.stringify(
  //       {
  //         chunks: WebpackChunk.chunks.map((chunk) => chunk.toObject()),
  //         modules: WebpackModule.modules.map((mod) => mod.toObject()),
  //       },
  //       null,
  //       2
  //     )
  //   );
};
