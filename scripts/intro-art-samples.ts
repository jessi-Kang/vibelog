/**
 * intro-art-samples.ts — 프로젝트 소개 글 머리 그림 시안.
 *
 * 소개 글에만 그림 한 장을 넣기로 했다 (10/11 Jessi — 모든 글에 넣기엔 비용이 크다). 쇼츠 그림처럼
 * 가운데 물건 하나를 세로로 세우면 글 칼럼에서 길쭉해져서, 블로그용 가로 판형으로 그린다 — 글의 삽화와 같은 판에 같은 비율(약 16:9)로 놓는다
 * (지금 삽화와 같은 비율에 더 시각적인 그림을 바란 Jessi의 요청).
 * 그림 묘사는 밤 실행에서 소개 글을 쓰는 모델이 같이 쓸 자리라, 시안도 소개 글 본문을 읽혀 만든다.
 * 사이트는 어두운 바탕이라 terminal 테마 색으로, 투명 배경(OpenAI)으로 그린다.
 *
 * 출력: art-samples/intro-<repo>.png + art-samples/intro-prompts.txt — 커밋하지 않는다
 * 사용: npx tsx scripts/intro-art-samples.ts   (ANTHROPIC_API_KEY·OPENAI_API_KEY)
 */
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { generateImage, styleFor } from "./art";
import { createInOrder, HAIKU_MODELS } from "./models";

const SYSTEM = `프로젝트 소개 글을 받습니다. 이 글 맨 위에 놓을 **가로로 긴 그림**의 묘사를 영어 한 문장으로 씁니다.
- 이 프로젝트가 무엇을 하는지 한눈에 떠오르는 물건 두세 개를 옆으로 늘어놓은 작은 장면입니다.
- 화면·앱 화면·UI·글자·숫자·로고·사람·손·동물은 넣지 않습니다. 물건으로만 말합니다.
- 소개 글에 없는 것을 지어내지 않고, 정답·비밀·푸는 법·내부 동작은 그리지 않습니다 — 간판 정도만.
- **물건 이름과 놓인 순서만** 씁니다. 색·재질(금빛, 놋쇠, 나무, 벨벳)·빛(조명, 따뜻한 빛, 밤빛)·분위기·
  바닥이나 탁자·배경은 쓰지 않습니다. 색과 그림체는 따로 정해져 있어서, 여기서 색을 말하면 그쪽이 깨집니다.
그 문장 하나만 출력합니다.`;

function introPosts(): { repo: string; text: string }[] {
  const root = path.join(process.cwd(), "content", "devlog");
  const out: { repo: string; text: string }[] = [];
  for (const repo of fs.readdirSync(root)) {
    const dir = path.join(root, repo);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      if (!/^intro:\s*true\s*$/m.test(raw)) continue;
      const body = raw.replace(/^---[\s\S]*?---/, "").split("<!-- en -->")[0].trim();
      out.push({ repo, text: body });
    }
  }
  return out;
}

async function main(): Promise<void> {
  const dir = path.join(process.cwd(), "art-samples");
  fs.mkdirSync(dir, { recursive: true });
  const client = new Anthropic();
  const lines: string[] = [];
  const failed: string[] = [];
  for (const { repo, text } of introPosts()) {
    try {
      const res = await createInOrder(client, ["claude-sonnet-5-5", ...HAIKU_MODELS], {
        // 200이면 생각에 다 써서 답이 비었다 (첫 시안의 apart·Anchor) — 넉넉히 둔다
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: "user", content: text }],
      });
      const scene = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .split("\n")
        .map((x) => x.trim())
        .find(Boolean);
      // 빈 답이면 그림체 문장만으로 엉뚱한 물건이 그려졌다 (첫 시안의 apart·Anchor) — 그리지 않는다
      if (!scene) throw new Error(`그림 묘사가 비었습니다 (stop_reason ${res.stop_reason})`);
      lines.push(`${repo}: ${scene}`);
      const r = await generateImage(styleFor("terminal", "flat", { wide: true }) + scene, ["openai"], {
        transparent: true,
        wide: true,
      });
      fs.writeFileSync(path.join(dir, `intro-${repo}.${r.ext}`), r.data);
      console.log(`- ${repo} (${r.model}): ${scene}`);
    } catch (err) {
      failed.push(repo);
      console.warn(`- ${repo} 실패:`, err instanceof Error ? err.message : err);
    }
  }
  fs.writeFileSync(path.join(dir, "intro-prompts.txt"), lines.join("\n") + "\n");
  console.log(`만든 것 ${lines.length - failed.length}장, 실패 ${failed.length}장${failed.length ? ` — ${failed.join(", ")}` : ""}`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
