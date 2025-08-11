import { Cache } from "./Cache.ts";
import chalk from "npm:chalk";
import { MultiProgressBars } from "npm:multi-progress-bars";
import AppTSConfig from "./AppTSConfig.ts";

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
import { Logger } from "./Logger.ts";
import { CSSChunk } from "./webpack/CSSChunk.ts";

Logger.log(chalk.white("⚙️  Starting Webpack Decompiler..."));
await Cache.initialize();

// const url = "https://www.airbnb.com/";
// const url = "https://trello.com/b/8STvXz9Q/house-closing";
const url = "https://www.duolingo.com/learn";

Logger.log(chalk.white(`🔎 Attempting to find Webpack Manifest at ${url}`));
const manifestScript = await findWebpackManifestScript(url);
if (!manifestScript) {
  Logger.error(`Could not find Webpack Manifest at ${url}`);
  Deno.exit(0);
}
Logger.log(
  chalk.white(
    `✅ Found webpack manifest ${
      manifestScript.url === "local"
        ? "embedded in DOM"
        : `at ${manifestScript.url}`
    }`
  )
);

Logger.log(chalk.white(`🧱 Building chunk names`));

const mpb = new MultiProgressBars({
  initMessage: " $ React Webpack Decompiler ",
  anchor: "bottom",
  persist: true,
  border: true,
});

let chunks: Awaited<ReturnType<typeof analyzeManifest>> = {
  jsChunks: [],
  cssChunks: [],
};
mpb.addTask("Extracting chunks", { type: "indefinite" });
mpb.addTask("Registering CSS chunks", { type: "percentage" });
mpb.addTask("Registering JS/TS chunks", { type: "percentage" });
mpb.addTask("Unpacking Modules", { type: "percentage" });
for (const transform of ModuleTransformationChain) {
  mpb.addTask(`Run module transform "${transform.transformer.name}"`, {
    type: "percentage",
  });
}
mpb.addTask("Bake project", { type: "percentage" });

// Extracting chunks
chunks = await analyzeManifest(url, manifestScript.content);
Logger.log(`Found ${chunks.jsChunks.length} chunks`);
mpb.done("Extracting chunks", { message: "Build finished." });

const chunkLimit = 10;

// Registering css chunks
Logger.log(chalk.white(`🗂️ Registering CSS Chunks`));
await (async () => {
  let i = 0;
  for (const cssChunk of chunks.cssChunks) {
    await CSSChunk.registerChunk(
      cssChunk.id,
      cssChunk.remotePath,
      cssChunk.url
    );
    mpb.updateTask("Registering CSS chunks", {
      percentage: i / chunks.cssChunks.length,
      message: `[${i}/${chunks.cssChunks.length}] Downloading chunk ${
        cssChunk.id
      } (${path.basename(cssChunk.remotePath).replace(/\.[^/.]+$/, "")})`,
    });
    i++;
  }
  mpb.done("Registering CSS chunks", { message: "Chunks registered." });
})();

// Registering js/ts chunks
Logger.log(chalk.white(`🗂️ Registering JS/TS Chunks`));
await (async () => {
  let i = 0;
  for (const jsChunk of chunks.jsChunks) {
    if (i > chunkLimit && chunkLimit > 0) {
      Logger.log(`Chunk processing limited to ${chunkLimit}`);
      break;
    }
    await WebpackChunk.registerChunk(
      jsChunk.id,
      jsChunk.remotePath,
      jsChunk.url
    );
    mpb.updateTask("Registering JS/TS chunks", {
      percentage: i / chunks.jsChunks.length,
      message: `[${i}/${chunks.jsChunks.length}] Downloading chunk ${
        jsChunk.id
      } (${path.basename(jsChunk.remotePath).replace(/\.[^/.]+$/, "")})`,
    });
    i++;
  }
  mpb.done("Registering JS/TS chunks", { message: "Chunks registered." });
})();

// Unpacking Modules
Logger.log(chalk.white(`📦 Unpacking modules`));
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
Logger.log(chalk.white(`🚀 Starting transformers`));
for (const transform of ModuleTransformationChain) {
  const transformer = transform.transformer;
  await (async () => {
    Logger.log(`Starting transformer ${transformer.name}`);
    const startTime = Date.now();
    let i = 0;
    for (const mod of WebpackModule.modules) {
      await mod.runTransform(transformer);
      mpb.updateTask(`Run module transform "${transformer.name}"`, {
        percentage: i / WebpackModule.modules.length,
        message: `[${i}/${WebpackModule.modules.length}] Running transform "${transformer.name}" on module ${mod.id} chunk ${mod.chunk.id}`,
      });
      i++;
    }
    mpb.done(`Run module transform "${transformer.name}"`, {
      message: `Module transform "${transformer.name}" complete. (${(
        (Date.now() - startTime) /
        1000
      ).toFixed(2)} seconds)`,
    });
  })();
}

// Bake project
Logger.log(chalk.white(`🍰 Baking project`));
await (async () => {
  tryMkDirSync("app");
  tryMkDirSync("app/css-modules");
  for (const chunk of WebpackChunk.chunks) {
    tryMkDirSync(path.join("app", `chunk-${chunk.id}`));
  }
  const totalModules = WebpackModule.modules.length + CSSChunk.chunks.length;
  let i = 0;
  for (const mod of WebpackModule.modules) {
    await mod.bakeFile();
    mpb.updateTask("Bake project", {
      percentage: i / totalModules,
      message: `[${i}/${totalModules}] Baking module ${mod.id} chunk ${mod.chunk.id}`,
    });
    i++;
  }
  for (const cssChunk of CSSChunk.chunks) {
    await cssChunk.bakeFile();
    mpb.updateTask("Bake project", {
      percentage: i / totalModules,
      message: `[${i}/${totalModules}] Baking CSS module ${cssChunk.id}`,
    });
    i++;
  }
  Deno.writeTextFileSync(
    "app/tsconfig.json",
    JSON.stringify(AppTSConfig, null, 2)
  );
  mpb.done("Bake project", { message: "Files baked." });
})();
