export type InlineNode =
  | { type: "text"; text: string }
  | { type: "ruby"; base: string; reading: string }
  | { type: "emphasis"; text: string }
  | { type: "bold"; text: string };

export type ContentBlock =
  | { type: "paragraph"; text: string; nodes: InlineNode[] }
  | { type: "heading"; level: number; text: string }
  | { type: "separator" };

export type StructuredContent = {
  blocks: ContentBlock[];
};
