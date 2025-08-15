import { formatCode } from "./Prettier.ts";
import { Cache } from "./Cache.ts";
import path from "node:path";
import { Logger } from "./Logger.ts";

export const fetchCode = async (url: string, unformatted?: boolean) => {
  return await Cache.get(
    { namespace: "WebRequestCode", id: await Cache.hash({ url, unformatted }) },
    async () => {
      const data = await fetch(url, {
        method: "GET",
      });

      if (data.status !== 200) {
        return null;
      }

      const content = await data.text();

      if (unformatted) {
        return content;
      } else {
        try {
          return await formatCode(content);
        } catch (e) {
          return content;
        }
      }
    }
  );
};

export const fetchBlob = async (url: string) => {
  const data = await fetch(url, {
    method: "GET",
  });

  if (data.status !== 200) {
    return null;
  }

  return await data.blob();
};

export const tryMkDirSync = (pathName: string) => {
  const pathParts = pathName.split("/");
  for (let i = 1; i <= pathParts.length; i++) {
    try {
      Deno.mkdirSync(path.join(...pathParts.slice(0, i)));
    } catch (e) {}
  }
};

export const camelize = (str: string) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
};

export const writeUnsureTextFileSync = (pathName: string, content: string) => {
  tryMkDirSync(path.dirname(pathName));
  Deno.writeTextFileSync(pathName, content);
};
