import projects from "../content/projects.json";

/**
 * 공개하기 전까지 사이트에서 숨기는 프로젝트 — 레포에 topic `vibelog-hidden`을 달면 30분 안에
 * 프로젝트 인식(projects.yml)이 projects.json에 hidden을 적고, 사이트가 그 프로젝트의 이름·카드·
 * 프로젝트 페이지·글·쇼츠·피드·사이트맵을 뺀다. topic을 떼면 다음 인식에 다시 보인다 (10/17).
 *
 * 숫자는 남긴다 — 홈 잔디·오늘/이번 주 커밋은 이름이 나오지 않아 그대로 세고, 지난 실행 줄은
 * 이름만 "비공개 프로젝트"로 바꿔 보인다.
 *
 * 이 파일은 projects.json을 통째로 읽으므로 서버·파이프라인에서만 쓴다 — 화면 코드는
 * content/projects.public.json(scripts/public-projects.ts)을 읽는다.
 *
 * 파이프라인은 그대로 돈다 — 글과 쇼츠는 계속 쌓이고 화면에만 나오지 않는다. 파이프라인
 * 스크립트는 lib/content.ts의 includeHiddenProjects()로 전부 본다 (안 그러면 숨긴 레포의 지난
 * 글을 못 찾아 소개 글을 또 쓰거나 day 번호가 틀어진다).
 */
export const HIDDEN_TOPIC = "vibelog-hidden";

/**
 * topic 말고 손으로 숨길 레포 — 평소에는 비워 둔다. topic을 달 수 없을 때만 잠깐 쓴다
 * (10/17 portfolio-tmp·Anchor를 여기 두었다가 두 레포에 topic을 단 뒤 비웠다)
 */
export const BY_HAND_HIDDEN: ReadonlySet<string> = new Set<string>();

const BY_TOPIC = new Set(
  (projects as { slug: string; hidden?: boolean }[]).filter((p) => p.hidden).map((p) => p.slug),
);

export function isHiddenProject(slug: string): boolean {
  return BY_HAND_HIDDEN.has(slug) || BY_TOPIC.has(slug);
}

export function hiddenSlugs(): string[] {
  return [...new Set([...BY_HAND_HIDDEN, ...BY_TOPIC])];
}

/**
 * 방문자에게 보이는 별칭 글자 — "미공개 프로젝트 A". 색처럼 한 번 정하면 projects.json에 적어 두고
 * 바꾸지 않는다 (글자가 날마다 바뀌면 A가 어제의 A인지 알 수 없다). 새로 숨긴 프로젝트는 비어
 * 있는 가장 앞 글자를 받는다. 레포 이름 순서로 정하지 않는다 — 순서에서 이름을 짐작할 수 있다.
 */
export function assignAliases(
  hidden: string[],
  kept: Record<string, string | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const used = new Set<string>();
  for (const s of hidden) {
    const a = kept[s];
    if (a && /^[A-Z]{1,2}$/.test(a) && !used.has(a)) {
      out[s] = a;
      used.add(a);
    }
  }
  const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
  for (const s of hidden) {
    if (out[s]) continue;
    const a = letters.find((l) => !used.has(l)) ?? `Z${used.size}`;
    out[s] = a;
    used.add(a);
  }
  return out;
}

/** 화면에 쓰는 별칭 이름 */
export function aliasName(alias: string, en = false): string {
  return en ? `Private project ${alias}` : `미공개 프로젝트 ${alias}`;
}
