/**
 * 글 화면에서 `[[용어|설명]]`을 말풍선 용어로 바꾸는 remark 플러그인.
 * 글자 노드만 본다 — 코드(`인라인 코드`·코드 블록)와 링크 안은 건드리지 않는다.
 * 바뀐 노드는 `<term-tip note="…">용어</term-tip>`이 되고, 화면은 components로 그린다.
 *
 * 글 본문은 글자 단위로 끊는다(줄 끝이 비지 않게, app/globals.css의 .post-body). 그대로 두면
 * 용어도 "기본 브랜 / 치"처럼 낱말 가운데서 끊기고, 뒤에 붙은 조사가 "기본 브랜치 / 만"으로
 * 떨어진다. 그래서 용어와 바로 뒤의 한글(조사)을 `.term-word`로 묶어 그 안에서는 띄어쓰기에서만
 * 끊기게 한다 (10/20).
 */
import { splitTerms, TERM_RE } from "./term-marker";

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, string | string[]> };
}

function walk(node: MdNode): void {
  if (!node.children || node.type === "link" || node.type === "linkReference") return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value && new RegExp(TERM_RE.source).test(child.value)) {
      const parts = splitTerms(child.value);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (typeof part === "string") {
          if (part) next.push({ type: "text", value: part });
          continue;
        }
        const tip: MdNode = {
          type: "termTip",
          data: { hName: "term-tip", hProperties: { note: part.note } },
          children: [{ type: "text", value: part.term }],
        };
        // 바로 뒤에 띄어쓰기 없이 붙은 한글(조사)을 용어와 한 덩어리로 묶는다
        const after = parts[i + 1];
        const josa = typeof after === "string" ? (after.match(/^[가-힣]+/)?.[0] ?? "") : "";
        if (josa) parts[i + 1] = (after as string).slice(josa.length);
        next.push({
          type: "termWord",
          data: { hName: "span", hProperties: { className: ["term-word"] } },
          children: josa ? [tip, { type: "text", value: josa }] : [tip],
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
