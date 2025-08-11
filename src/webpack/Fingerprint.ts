import { encodeHex } from "jsr:@std/encoding/hex";
import { Node, SourceFile, SyntaxKind } from "npm:ts-morph";

const excludedNodes = [SyntaxKind.ImportDeclaration];

export class Fingerprint {
  public code: SourceFile = null as any;
  public codeStr: string = "";
  public astTree: string = "";
  public fingerprint: string = "";

  public static async get(code: SourceFile): Promise<Fingerprint> {
    const fingerprint = new Fingerprint();
    fingerprint.code = code;
    fingerprint.codeStr = code.getFullText();
    fingerprint.astTree = code
      .getChildren()
      .map((child) => Fingerprint.getNodeString(child))
      .join("\n")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .join("\n");

    const messageBuffer = new TextEncoder().encode(fingerprint.astTree);
    const hashBuffer = await crypto.subtle.digest("SHA-256", messageBuffer);
    fingerprint.fingerprint = encodeHex(hashBuffer).toUpperCase();
    return fingerprint;
  }

  private static getNodeString(node: Node, indent: number = 0): string {
    if (excludedNodes.includes(node.getKind())) {
      return "";
    }
    return [
      Fingerprint.getNodeName(node),
      ...node
        .getChildren()
        .map((child) => "    " + Fingerprint.getNodeString(child, indent + 1)),
    ]
      .map((line) => "    ".repeat(indent) + line)
      .join("\n");
  }

  private static getNodeName(node: Node): string {
    switch (node.getKind()) {
      case SyntaxKind.StringLiteral:
        return `${node.getKindName()}[${node.getText()}]`;
      case SyntaxKind.NumericLiteral:
        return `${node.getKindName()}[${node.getText()}]`;
      case SyntaxKind.LiteralType:
        return `${node.getKindName()}[${node.getText()}]`;
      default:
        return node.getKindName();
    }
  }
}
