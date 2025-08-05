import chalk from "npm:chalk";
import fs from "node:fs";
import path from "node:path";
import callsites from "npm:callsites";

export class Logger {
  private static renderMessage(...message: any) {
    const renderedMessage = [];
    for (const part of message) {
      if (typeof part === "string") {
        renderedMessage.push(part);
      } else if (Error.isError(part)) {
        renderedMessage.push(
          [part.name, part.cause ?? "", part.message, part.stack].join("\n")
        );
      } else if (Array.isArray(part)) {
        renderedMessage.push(JSON.stringify(part));
      } else if (typeof part === "object") {
        renderedMessage.push(JSON.stringify(part, null, 2));
      } else {
        renderedMessage.push(part.toString());
      }
    }
    return renderedMessage.join(" ");
  }

  private static getCallsiteStr() {
    const site = callsites()[2];
    let locStr = "";
    locStr += path.relative(Deno.cwd(), site.getFileName() ?? "/");
    locStr += ":" + site.getLineNumber() + ":" + site.getColumnNumber();
    locStr += "->";
    locStr += (site.getFunctionName() ?? "default") + "()";
    return locStr;
  }

  private static sanitizeString(str: string) {
    const regex =
      // deno-lint-ignore no-control-regex
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/gm;
    return str.replaceAll(regex, "");
  }

  public static log(...message: any) {
    const renderedMessage = [
      chalk.white("[Log]"),
      chalk.white(`[${new Date().toISOString()}]`),
      chalk.blue(`[${Logger.getCallsiteStr()}]`),
    ];
    console.log(...renderedMessage, ...message);

    renderedMessage.push(Logger.renderMessage(...message));
    fs.appendFileSync(
      "output.log",
      Logger.sanitizeString(renderedMessage.join(" ") + "\n")
    );
  }

  public static error(...message: any) {
    const renderedMessage = [
      chalk.red("[Error]"),
      chalk.white(`[${new Date().toISOString()}]`),
      chalk.blue(`[${Logger.getCallsiteStr()}]`),
    ];
    console.error(...renderedMessage, ...message);

    renderedMessage.push(Logger.renderMessage(...message));
    fs.appendFileSync(
      "output.log",
      Logger.sanitizeString(renderedMessage.join(" ") + "\n")
    );
  }
}
