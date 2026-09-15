/**
 * 글 삽화 — 그리기.
 *
 * 받는 것은 **검증을 통과한 노드 트리**(FigNode)뿐이다. SVG 문자열을
 * dangerouslySetInnerHTML로 넣지 않는다 — 이 사이트는 사람이 읽기 전에
 * 발행되므로, 생성된 마크업이 그대로 DOM이 되는 길은 아예 만들지 않는다.
 * 허용 목록은 scripts/figure-types.ts에 있고 여기서 한 번 더 건다 (파일이
 * 손으로 고쳐졌거나 옛 형식이 남아 있어도 화면은 안전해야 한다).
 *
 * 삽화는 **늘리지 않는다**. viewBox 390을 제 크기로 두고 가운데 놓는다 —
 * 칼럼 폭에 맞춰 늘리면 그림 속 글자만 작아져 삽화만 못 읽게 된다
 * (본문 글자는 안 줄어든다). 책 삽화가 본문 단보다 좁은 것과 같다.
 */
import React from "react";
import {
  FIG_ATTRS,
  FIG_TAGS,
  FIG_W,
  type FigNode,
  type FigTag,
} from "../scripts/figure-types";

/** 화면에서 한 번 더 거른다 — 통과 못 한 노드는 통째로 안 그린다 */
function draw(n: FigNode, key: number): React.ReactNode {
  if (!FIG_TAGS.includes(n.tag)) return null;
  const allowed = FIG_ATTRS[n.tag as FigTag];
  const props: Record<string, string> = {};
  for (const [k, v] of Object.entries(n.attrs ?? {}))
    if (allowed.includes(k)) props[k] = v;

  const kids = (n.children ?? []).map((c, i) => draw(c, i));
  const Tag = n.tag as keyof React.JSX.IntrinsicElements;
  return (
    <Tag key={key} {...(props as Record<string, string>)}>
      {n.text}
      {kids}
    </Tag>
  );
}

export function PostFigure({
  node,
  caption,
}: {
  node: FigNode;
  caption: string;
}) {
  if (node?.tag !== "svg") return null;
  const vb = node.attrs?.viewBox ?? `0 0 ${FIG_W} 200`;
  return (
    <figure className="my-7 flex flex-col items-center gap-3">
      <svg
        viewBox={vb}
        role="img"
        className="block h-auto w-full"
        style={{ maxWidth: FIG_W }}
      >
        {(node.children ?? []).map((c, i) => draw(c, i))}
      </svg>
      {caption && (
        <figcaption
          className="w-full text-center font-mono text-xs leading-relaxed text-muted"
          style={{ maxWidth: FIG_W, wordBreak: "keep-all" }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
