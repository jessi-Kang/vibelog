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
  // 계약은 <title>을 요구하지만 **그릴 때는 aria-label로 옮긴다.**
  // React 19는 <title>을 문서 메타데이터로 다뤄 서버 렌더에서 속을 비워
  // 내보낸다 — 브라우저에서 하이드레이션되면 채워지지만, 자바스크립트 없이
  // 읽는 쪽·크롤러에는 접근성 이름이 아예 없다 (라이브에서 <title></title>로
  // 나가는 것을 보고 알았다). role="img" + aria-label은 그런 취급이 없다.
  const kids = node.children ?? [];
  const label = kids.find((c) => c.tag === "title")?.text ?? "";
  return (
    // 은은한 바탕판 (Jessi가 시안 A를 골랐다 — docs/post-figures-frame.html).
    // 테두리는 없다: 두르면 카드가 되어 본문에서 떨어져 나온다. 바탕색 한 단계로
    // "여기는 그림"만 읽히게 한다.
    //
    // 모바일에서는 판을 페이지 여백까지 밀어 붙인다(-mx = 컨테이너의 px). 화면 끝에
    // 닿는 판은 모서리를 둥글리지 않는다 — 가장자리에 둥근 귀퉁이 조각이 남는다. 판의
    // 안쪽 여백이 삽화 폭을 먹으면 320px에서 라벨이 11px 아래로 내려간다 —
    // 삽화는 늘리지 않는 대신 줄어들 수는 있어서, 판 안의 폭이 곧 글자 크기다.
    // 그래서 안쪽 여백을 여백값과 똑같이 두어 삽화 폭은 판이 없을 때와 같다.
    <figure className="my-7 -mx-5 flex flex-col items-center gap-3 bg-panel px-5 pb-4 pt-6 max-[359px]:-mx-4 max-[359px]:px-4 md:mx-0 md:rounded-lg md:px-6">
      <svg
        viewBox={vb}
        role="img"
        aria-label={label || undefined}
        className="block h-auto w-full"
        style={{ maxWidth: FIG_W }}
      >
        {kids.filter((c) => c.tag !== "title").map((c, i) => draw(c, i))}
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
