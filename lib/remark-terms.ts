/**
 * 글 화면에서 `[[용어|설명]]`을 말풍선 용어로 바꾸는 remark 플러그인.
 * 글자 노드만 본다 — 코드(`인라인 코드`·코드 블록)와 링크 안은 건드리지 않는다.
 * 바뀐 노드는 `<term-tip note="…">용어</term-tip>`이 되고, 화면은 components로 그린다.
 */
import { splitTerms, TERM_RE } from "./term-marker";

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, string> };
}

function walk(node: MdNode): void {
  if (!node.children || node.type === "link" || node.type === "linkReference") return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value && new RegExp(TERM_RE.source).test(child.value)) {
      for (const part of splitTerms(child.value)) {
        if (typeof part === "string") next.push({ type: "text", value: part });
        else
          next.push({
            type: "termTip",
            data: { hName: "term-tip", hProperties: { note: part.note } },
            children: [{ type: "text", value: part.term }],
          });
      }
    } else {
      walk(child);
      next.push(child);
    }
  }
  node.children = next;
}

export function remarkTerms() {
  return (tree: MdNode) => walk(tree);
}
