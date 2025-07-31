import { formatCode } from "./Prettier.ts";
import { Cache } from "./Cache.ts";

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
  try {
    Deno.mkdirSync(pathName);
  } catch (e) {}
};
