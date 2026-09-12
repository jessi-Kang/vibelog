/**
 * 의도 없는 서식 검사 — 글이 쓴 대로 보이는지.
 *
 * apart 9/12 글의 "둘 중 하나는 6~12점, 넷 중 하나는 9~16점"이 화면에서
 * "6[12점, 넷 중 하나는 9]16점"으로 가운데가 통째로 그어져 나갔다 (Jessi가
 * 잡았다). remark-gfm이 물결표 하나짜리 취소선을 켜 두는데 우리 글은 물결표를
 * 범위에 쓴다. 파서 쪽은 껐다 (components/post-client.tsx).
 *
 * 문제는 이 부류가 조용하다는 것이다. 글은 파이프라인이 매일 쓰고 사람이 읽기
 * 전에 발행되므로, 본문 한 줄이 엉뚱하게 꾸며져도 아무도 모른다. 그래서
 * **글의 서식이 예상 밖이면 실행 기록에 남긴다** — 홈의 "지난 실행"에 보이니
 * 다음날 눈에 걸린다.
 *
 * 우리 글은 문단·목록·소제목·코드·링크만 쓴다. 굵게·기울임·취소선·표·raw HTML은
 * 쓸 일이 없으므로, 그게 나왔다면 모델이 흘린 기호가 서식으로 먹힌 것이다.
 *
 *   npx tsx scripts/check-markdown.ts            # content/devlog 전체
 *   npx tsx scripts/check-markdown.ts <파일…>
 */
import fs from "node:fs";
import path from "node:path";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import type { Node, Parent } from "unist";

/** 우리 글이 쓰는 서식. 이 밖은 모델이 흘린 기호가 먹힌 것으로 본다 */
const ALLOWED = new Set([
  "root",
  "paragraph",
  "text",
  "heading",
  "list",
  "listItem",
  "inlineCode",
  "code",
  "link",
  "blockquote",
  "break",
  "thematicBreak",
  "yaml", // frontmatter는 파서가 text로 흘리므로 실제로는 아래에서 잘라낸다
]);

export interface MarkdownFinding {
  file: string;
  type: string;
  snippet: string;
}

/** frontmatter를 떼고 본문만 — `---` 블록은 서식 검사 대상이 아니다 */
function bodyOf(source: string): string {
  const m = source.match(/^---\n[\s\S]*?\n---\n/);
  return m ? source.slice(m[0].length) : source;
}

function textOf(node: Node): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  const kids = (node as Parent).children ?? [];
  return kids.map(textOf).join("");
}

export function checkMarkdown(file: string, source: string): MarkdownFinding[] {
  const tree = fromMarkdown(bodyOf(source), {
    // 화면과 **같은 설정**으로 읽는다 (post-client.tsx의 REMARK) — 검사기가
    // 렌더러와 다른 눈을 갖고 있으면 없는 문제를 보고하거나 있는 문제를 놓친다
    extensions: [gfm({ singleTilde: false })],
    mdastExtensions: [gfmFromMarkdown()],
  });
  const out: MarkdownFinding[] = [];
  const walk = (node: Node) => {
    // `<!-- en -->`는 KO/EN 구분자다 (lib/content.ts가 이걸로 자른다)
    const isComment =
      node.type === "html" &&
      "value" in node &&
      typeof node.value === "string" &&
      /^<!--[\s\S]*-->$/.test(node.value.trim());
    if (!ALLOWED.has(node.type) && !isComment) {
      const text = textOf(node).replace(/\s+/g, " ").trim();
      out.push({
        file,
        type: node.type,
        snippet: text.length > 60 ? `${text.slice(0, 60)}…` : text,
      });
      return; // 안쪽은 더 파지 않는다 — 한 군데를 여러 번 세지 않기 위해
    }
    for (const kid of ((node as Parent).children ?? []) as Node[]) walk(kid);
  };
  walk(tree);
  return out;
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? listFiles(path.join(dir, e.name))
        : e.name.endsWith(".md") || e.name.endsWith(".mdx")
          ? [path.join(dir, e.name)]
          : [],
    );
}

/** 파이프라인용 — 실행 기록에 넣을 한 줄들 */
export function checkDevlogs(root = "content/devlog"): MarkdownFinding[] {
  return listFiles(root).flatMap((f) =>
    checkMarkdown(f, fs.readFileSync(f, "utf8")),
  );
}

if (process.argv[1]?.endsWith("check-markdown.ts")) {
  const args = process.argv.slice(2);
  const files = args.length > 0 ? args : listFiles("content/devlog");
  const findings = files.flatMap((f) =>
    checkMarkdown(f, fs.readFileSync(f, "utf8")),
  );
  console.log(`검사한 글 ${files.length}편`);
  if (findings.length === 0) {
    console.log("의도 없는 서식 없음");
  } else {
    for (const f of findings)
      console.log(`  ${f.file}  [${f.type}]  ${f.snippet}`);
    process.exitCode = 1;
  }
}
