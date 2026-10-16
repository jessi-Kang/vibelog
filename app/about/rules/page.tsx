import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { RulesClient } from "@/components/rules-client";

export const metadata: Metadata = {
  title: "커밋 규칙과 쇼츠 테마",
  description: "vibelog에 프로젝트를 올릴 때 그 레포에 붙이는 커밋 규칙과 쇼츠 테마입니다.",
  alternates: { canonical: "/about/rules" },
};

/**
 * 복사 블록의 원문은 docs/02 §3 "커밋 메시지 규약 문구" 한 곳에 둔다 — 페이지에 따로 적어 두면
 * 문서를 고칠 때 사본이 갈라진다. 빌드할 때 읽는다
 */
function ruleBlock(): string {
  const doc = fs.readFileSync(
    path.join(process.cwd(), "docs", "02-pipeline-and-setup.md"),
    "utf8",
  );
  const from = doc.indexOf("### 커밋 메시지 규약 문구");
  const open = doc.indexOf("```markdown\n", from);
  const close = doc.indexOf("\n```", open + 12);
  if (from === -1 || open === -1 || close === -1) {
    throw new Error("docs/02에서 커밋 규칙 블록을 찾지 못했습니다");
  }
  return doc.slice(open + "```markdown\n".length, close).trim();
}

/**
 * 화면용 — 문서는 80자에서 손으로 줄을 꺾어 두었는데, 그대로 보이면 폰에서 줄이 들쭉날쭉하다.
 * 이어지는 줄을 앞 줄에 붙여 문단·목록 항목마다 한 줄로 만든다. 복사는 원문 그대로 한다
 */
function reflow(text: string): string {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    const prev = out[out.length - 1];
    const starts = /^(#|- |\d+\. )/.test(line.trim());
    if (line.trim() && prev?.trim() && !starts) out[out.length - 1] = `${prev} ${line.trim()}`;
    else out.push(line);
  }
  return out.join("\n");
}

export default function RulesPage() {
  const rules = ruleBlock();
  return <RulesClient rules={rules} display={reflow(rules)} />;
}
