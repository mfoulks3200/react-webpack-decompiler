import { Cache } from "./Cache.ts";
import chalk from "npm:chalk";
import { MultiProgressBars } from "npm:multi-progress-bars";

import {
  analyzeManifest,
  findWebpackManifestScript,
} from "./webpack/WebpackUtilities.ts";
import { WebpackChunk } from "./webpack/WebpackChunk.ts";
import path from "node:path";
import {
  ModuleTransformationChain,
  WebpackModule,
} from "./webpack/WebpackModule.ts";
import { tryMkDirSync } from "./Utilities.ts";

console.log(chalk.white("⚙️  Starting Webpack Decompiler..."));
await Cache.initialize();

// const url = "https://trello.com/b/8STvXz9Q/house-closing";
const url = "https://www.duolingo.com/learn";

console.log(chalk.white(`🔎 Attempting to find Webpack Manifest at ${url}`));
const manifestScript = await findWebpackManifestScript(url);
if (!manifestScript) {
  console.error(`Could not find Webpack Manifest at ${url}`);
  Deno.exit(0);
}
console.log(
  chalk.white(
    `✅ Found webpack manifest ${
      manifestScript.url === "local"
        ? "embedded in DOM"
        : `at ${manifestScript.url}`
    }`
  )
);

console.log(chalk.white(`🧱 Building chunk names`));
export const baseUrl =
  "https://" +
  new URL(manifestScript.url === "local" ? url : manifestScript.url).host;

const mpb = new MultiProgressBars({
  initMessage: " $ React Webpack Decompiler ",
  anchor: "bottom",
  persist: true,
  border: true,
});

let jsChunks: Awaited<ReturnType<typeof analyzeManifest>> = [];
mpb.addTask("Extracting chunks", { type: "indefinite" });
mpb.addTask("Registering chunks", { type: "percentage" });
mpb.addTask("Unpacking Modules", { type: "percentage" });
for (const transform of ModuleTransformationChain) {
  mpb.addTask(`Run module transform "${transform.name}"`, {
    type: "percentage",
  });
}
mpb.addTask("Bake project", { type: "percentage" });

// Extracting chunks
jsChunks = await analyzeManifest(baseUrl, manifestScript.content);
mpb.done("Extracting chunks", { message: "Build finished." });

// Registering chunks
await (async () => {
  let i = 0;
  for (const jsChunk of jsChunks) {
    await WebpackChunk.registerChunk(
      jsChunk.id,
      jsChunk.remotePath,
      jsChunk.url
    );
    mpb.updateTask("Registering chunks", {
      percentage: i / jsChunks.length,
      message: `[${i}/${jsChunks.length}] Downloading chunk ${
        jsChunk.id
      } (${path.basename(jsChunk.remotePath).replace(/\.[^/.]+$/, "")})`,
    });
    i++;
  }
  mpb.done("Registering chunks", { message: "Chunks registered." });
})();

// Unpacking Modules
await (async () => {
  let i = 0;
  for (const chunk of WebpackChunk.chunks) {
    await chunk.extractModules();
    mpb.updateTask("Unpacking Modules", {
      percentage: i / WebpackChunk.chunks.length,
      message: `[${i}/${
        WebpackChunk.chunks.length
      }] Unpacking modules from chunk ${chunk.id} (${path
        .basename(chunk.remotePath)
        .replace(/\.[^/.]+$/, "")})`,
    });
    i++;
  }
  mpb.done("Unpacking Modules", { message: "Modules unpacked." });
})();

// Transformers
for (const transform of ModuleTransformationChain) {
  await (async () => {
    let i = 0;
    for (const mod of WebpackModule.modules) {
      await mod.runTransform(transform);
      await mod.updateCache();
      mpb.updateTask(`Run module transform "${transform.name}"`, {
        percentage: i / WebpackModule.modules.length,
        message: `[${i}/${WebpackModule.modules.length}] Running transform "${transform.name}" on module ${mod.id} chunk ${mod.chunk.id}`,
      });
      i++;
    }
    mpb.done(`Run module transform "${transform.name}"`, {
      message: `Module transform "${transform.name}" complete.`,
    });
  })();
}

// Bake project
await (async () => {
  tryMkDirSync("app");
  for (const chunk of WebpackChunk.chunks) {
    tryMkDirSync(path.join("app", `chunk-${chunk.id}`));
  }
  let i = 0;
  for (const mod of WebpackModule.modules) {
    mod.bakeFile();
    mpb.updateTask("Bake project", {
      percentage: i / WebpackModule.modules.length,
      message: `[${i}/${WebpackModule.modules.length}] Baking module ${mod.id} chunk ${mod.chunk.id}`,
    });
    i++;
  }
  mpb.done("Bake project", { message: "Files baked." });
})();
