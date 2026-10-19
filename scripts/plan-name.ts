/**
 * plan-name.ts — 기획서가 바뀐 밤에 서비스 이름을 다시 읽는다.
 *
 * 서비스 이름은 기획서가 1순위다 (10/11 — 기획서를 최신으로 고쳐 둔다). 소개 글은 한 번만
 * 쓰므로, 그 뒤에 기획서에서 이름이 바뀌면 화면 이름이 예전 이름에 머문다. 그래서 밤마다:
 *
 * 1. 레포 파일 목록(GitHub API 한 번, AI 없음)에서 기획서들의 내용 해시를 모아 지문을 만든다.
 * 2. 지난번 지문(state.json의 planSha)과 같으면 끝 — 대부분의 밤은 여기서 멈춘다.
 * 3. 다르면 기획서 앞부분만 작은 모델(Haiku)에 넘겨 "기획서가 정한 서비스 이름"만 묻는다.
 *
 * 이름은 바꿀 뿐 소개 글·설명·아이콘은 건드리지 않는다. vibelog.json name이 있으면 그게 언제나 이긴다
 * (run.ts updateProjects).
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Octokit } from "@octokit/rest";
import { NOT_PLAN, PLAN_EXT, planRank, SKIP_DIR, SKIP_FILE, TEMPLATE_README } from "./intro";
import { createInOrder, HAIKU_MODELS } from "./models";

/** 이름은 기획서 앞부분에 있다 — 몇 편만, 앞부분만 읽는다 */
const MAX_PLANS = 3;
const PER_PLAN_CHARS = 3000;

export interface PlanName {
  name: string;
  nameEn: string | null;
}

export type PlanNameResult =
  | { status: "same" }
  | { status: "none"; planSha: string }
  | { status: "found"; planSha: string; found: PlanName };

const SYSTEM = `프로젝트 기획서의 앞부분을 받습니다. 이 기획서가 정한 **서비스 이름**만 찾습니다 —
문서 제목이나 "서비스명"·"이름" 같은 항목에 적힌 것. 레포 이름이나 파일 이름을 다듬어 지어내지 않습니다.
여러 문서가 다르게 말하면 가장 최근 결정처럼 보이는 것(예: "이름 변경", "최종")을 고릅니다.
기획서가 이름을 정하지 않았으면 null입니다.
JSON 하나만 출력합니다: {"name": "한국어 이름 또는 null", "nameEn": "영어 이름 또는 null"}
영어 이름이 따로 없으면 nameEn은 한국어 이름의 뜻을 영어로 옮겨 씁니다 — 영어 화면에 그대로 나갑니다
(예: 거짓말 탐정 → Lie Detective). 소리 나는 대로 적지 않습니다. 한국어 이름이 없으면 name은 null로 둡니다.`;

function parse(text: string): PlanName | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as { name?: unknown; nameEn?: unknown };
    const clean = (v: unknown) => (typeof v === "string" && v.trim() && v.trim().length <= 40 ? v.trim() : null);
    const name = clean(j.name) ?? clean(j.nameEn);
    return name ? { name, nameEn: clean(j.nameEn) } : null;
  } catch {
    return null;
  }
}

export async function planNameIfChanged(
  octokit: Octokit,
  owner: string,
  repo: string,
  lastPlanSha: string | undefined,
  /** 수집이 읽는 작업 브랜치 — 없으면 기본 브랜치 (lib/work-branch.ts) */
  branch?: string,
): Promise<PlanNameResult> {
  const ref = branch ?? (await octokit.rest.repos.get({ owner, repo })).data.default_branch;
  const { data: tree } = await octokit.rest.git.getTree({ owner, repo, tree_sha: ref, recursive: "true" });
  const plans = tree.tree
    .filter(
      (t) =>
        t.type === "blob" && t.path && t.sha &&
        !SKIP_DIR.test(t.path) && !SKIP_FILE.test(t.path) &&
        PLAN_EXT.test(t.path) && !NOT_PLAN.test(t.path) &&
        // CLAUDE.md·AGENTS.md는 AI에게 주는 작업 지시라 기획서가 아니다
        planRank(t.path) !== 9,
    )
    .sort((a, b) => planRank(a.path!) - planRank(b.path!) || (b.size ?? 0) - (a.size ?? 0))
    .slice(0, MAX_PLANS);
  const planSha = plans.map((t) => `${t.path}:${t.sha}`).join(",");
  if (planSha === (lastPlanSha ?? "")) return { status: "same" };
  if (!plans.length) return { status: "none", planSha };

  const parts: string[] = [];
  for (const t of plans) {
    const { data } = await octokit.rest.git.getBlob({ owner, repo, file_sha: t.sha! });
    const text = Buffer.from(data.content, "base64").toString("utf8");
    if (TEMPLATE_README.test(text)) continue;
    parts.push(`## ${t.path}\n${text.slice(0, PER_PLAN_CHARS)}`);
  }
  if (!parts.length) return { status: "none", planSha };

  const res = await createInOrder(new Anthropic(), HAIKU_MODELS, {
    max_tokens: 200,
    system: SYSTEM,
    messages: [{ role: "user", content: parts.join("\n\n") }],
  });
  const found = parse(
    res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(""),
  );
  return found ? { status: "found", planSha, found } : { status: "none", planSha };
}
