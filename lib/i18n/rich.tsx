import { Fragment, type ReactNode } from "react";

/**
 * Fills {placeholders} in an already-translated sentence with React nodes, so
 * styled fragments (a bold name, a linked email) can sit wherever each
 * language's word order puts them:
 *   richText(t("Thank you, {name}."), { name: <strong>{name}</strong> })
 */
export function richText(text: string, nodes: Record<string, ReactNode>): ReactNode {
  const parts = text.split(/(\{\w+\})/g);
  return parts.map((part, i) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    return <Fragment key={i}>{key && key in nodes ? nodes[key] : part}</Fragment>;
  });
}
