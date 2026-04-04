import type { InlineNode } from "@/types";
import styles from "./Paragraph.module.css";

export function renderNodes(nodes: InlineNode[]): React.ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "ruby":
        return (
          <ruby key={i}>
            {node.base}
            <rp>(</rp>
            <rt>{node.reading}</rt>
            <rp>)</rp>
          </ruby>
        );
      case "emphasis":
        return (
          <em key={i} className={styles.emphasis}>
            {node.text}
          </em>
        );
      case "bold":
        return <strong key={i}>{node.text}</strong>;
      case "text":
      default:
        return <span key={i}>{node.text}</span>;
    }
  });
}
