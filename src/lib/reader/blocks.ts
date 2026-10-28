import { HEADING_MARK, type HeadingLevel } from "@/lib/pdf/structure";

export type TextBlock =
  | { kind: "heading"; level: Exclude<HeadingLevel, 0>; text: string }
  | { kind: "paragraph"; text: string };

/** Converte o content.txt (blocos separados por "\n\n") em blocos tipados. */
export function parseBlocks(content: string): TextBlock[] {
  return content
    .split("\n\n")
    .filter((b) => b.trim())
    .map((block) => {
      const mark = HEADING_MARK.exec(block);
      if (!mark) return { kind: "paragraph", text: block };
      return {
        kind: "heading",
        level: mark[1].length as Exclude<HeadingLevel, 0>,
        text: block.slice(mark[0].length),
      };
    });
}
