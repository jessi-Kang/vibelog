/**
 * usage.ts — 모델 호출의 토큰을 모아 실행 기록(run.json)에 남긴다.
 *
 * 비용은 밖에서 세면 틀린다. 삽화에서 실측한 결과, 보이는 출력의 3–4배가
 * 보이지 않는 thinking이었고 재작성은 입력을 3–5배로 늘렸다. 그래서 모든
 * Opus 호출이 usage를 여기 적고, run.ts가 단계별로 꺼내 홈의 "지난 실행"에
 * `토큰 in N · out M`으로 찍는다. 이 줄이 비용 절감의 자(尺)다 — 어떤 손잡이를
 * 돌리든 다음 밤 이 숫자로 판단한다.
 *
 * 순수 모듈 — 파일·네트워크 없음. video/가 가져가지는 않지만 같은 규칙을 지킨다.
 */
import { fmtNum } from "../lib/format";

export interface Tally {
  calls: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

interface UsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

const tallies = new Map<string, Tally>();

/** 호출 하나를 단계(stage)에 더하고 로그에 한 줄 남긴다 */
export function noteUsage(stage: string, u: UsageLike): Tally {
  const t = tallies.get(stage) ?? {
    calls: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
  };
  t.calls += 1;
  t.input += u.input_tokens;
  t.output += u.output_tokens;
  t.cacheRead += u.cache_read_input_tokens ?? 0;
  t.cacheWrite += u.cache_creation_input_tokens ?? 0;
  tallies.set(stage, t);
  console.log(
    `[${stage}] 토큰 in ${u.input_tokens} · out ${u.output_tokens} (thinking 포함)` +
      (u.cache_read_input_tokens ? ` · cache read ${u.cache_read_input_tokens}` : "") +
      (u.cache_creation_input_tokens ? ` · cache write ${u.cache_creation_input_tokens}` : ""),
  );
  return t;
}

/** 단계의 합을 꺼내고 비운다 — 글(레포/날짜) 하나가 끝날 때마다 부른다 */
export function takeUsage(stage: string): Tally | undefined {
  const t = tallies.get(stage);
  tallies.delete(stage);
  return t;
}

/** run.json 한 줄에 붙이는 꼴. 캐시 읽기는 있을 때만 */
export function fmtTally(t: Tally | undefined): string {
  if (!t) return "";
  const cache = t.cacheRead ? ` · cache ${fmtNum(t.cacheRead)}` : "";
  return `토큰 in ${fmtNum(t.input)} · out ${fmtNum(t.output)}${cache}`;
}
