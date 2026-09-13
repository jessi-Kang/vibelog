/**
 * 녹화 결과 검사 — **노드 전용.** shorts-types.ts는 브라우저 번들에 들어가므로
 * 파일을 읽는 검사기는 여기 둔다 (거기 `node:fs`를 넣었다가 Remotion 번들이
 * UnhandledSchemeError로 죽었다. 타입체크는 통과했다).
 */
import fs from "node:fs";
import path from "node:path";
import { segmentsJsonPath } from "./shorts-types";

/**
 * 녹화된 데모 구간이 **같은 화면을 두 번 보여주는지** 본다.
 *
 * 같은 페이지를 두 문장이 쓰는 것 자체는 괜찮다 — find를 다르게 주면 그 화면의
 * 다른 곳을 보여주니 다른 컷이다. 나쁜 것은 **같은 자리를 두 번** 쓰는 경우다:
 * 한쪽에 find가 없으면(화면 전체) 다른 쪽이 그 안의 한 곳이라 결국 같은 화면이
 * 비율만 달리 두 번 나온다. 실제로 홈을 전체로 한 번, 홈의 제목을 크게 한 번
 * 써서 그 편이 "같은 화면이 비율만 다르게" 반복됐다.
 *
 * 조용히 지나가는 부류라(영상을 봐야 안다) 실행 기록에 남긴다. 파일이 없으면
 * (녹화를 안 했거나 기본 투어면) 아무것도 보고하지 않는다.
 */
export function checkDemoScreens(
  repo: string,
  date: string,
  lang: "ko" | "en" = "ko",
): { stops: number; repeated: string[] } | null {
  const file = path.join(process.cwd(), segmentsJsonPath(repo, date, lang));
  if (!fs.existsSync(file)) return null;
  let segs: { path?: string; find?: string }[];
  try {
    segs = JSON.parse(fs.readFileSync(file, "utf8")).screens ?? [];
  } catch {
    return null;
  }
  if (segs.length < 3) return null;
  const byPath = new Map<string, (string | undefined)[]>();
  for (const sg of segs) {
    const key = (sg.path ?? "").split("?")[0];
    if (!key) continue;
    byPath.set(key, [...(byPath.get(key) ?? []), sg.find]);
  }
  const repeated: string[] = [];
  for (const [p2, finds] of byPath) {
    if (finds.length < 2) continue;
    // 화면 전체를 쓴 정류장이 끼어 있거나, 같은 곳을 두 번 가리켰으면 같은 컷
    const hasWhole = finds.some((f) => !f);
    const dup =
      new Set(finds.filter(Boolean)).size < finds.filter(Boolean).length;
    if (hasWhole || dup) repeated.push(p2);
  }
  return repeated.length > 0 ? { stops: segs.length, repeated } : null;
}
