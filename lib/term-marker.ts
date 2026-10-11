/**
 * 글의 용어 설명 표시 — `[[용어|설명]]`.
 *
 * 괄호로 붙이던 용어 설명("빌드(배포 전에 코드를 묶는 단계)")이 문장 가운데를 끊어서,
 * 글 화면에서는 점선 밑줄만 긋고 누르면 낱말 위에 말풍선으로 띄운다 (시안
 * docs/post-term-tooltip.html, 10/11). 괄호를 글자로 찾아내지 않는다 — 지난 글에는
 * "열었고(로그인 없이도 낼 수 있습니다)"처럼 용어 설명이 아닌 괄호가 많다. 그래서 글 모델이
 * 용어 설명만 이 표시로 쓰고, 화면은 이 표시만 말풍선으로 그린다.
 *
 * 말풍선을 못 띄우는 자리(글 목록 요약·RSS·링크 미리보기 카드·쇼츠 대본·삽화의 재료·
 * 읽기 검사)는 `plainTerms`로 괄호 표기로 되돌려 쓴다.
 */

/** 용어 40자, 설명 120자 안 — 줄바꿈·대괄호·세로선이 없는 것만 표시로 친다 */
export const TERM_RE = /\[\[([^\[\]|\n]{1,40})\|([^\[\]|\n]{1,120})\]\]/g;

/** 표시를 괄호 표기로 — 한국어 "빌드(배포 전…)", 영어 "build (the step…)" */
export function plainTerms(s: string): string {
  return s.replace(TERM_RE, (_, term: string, note: string) => {
    const t = term.trim();
    const n = note.trim();
    // 영어 낱말 뒤에 영어 설명이면 띄어 쓴다. 한국어는 붙여 쓴다
    const space = /[A-Za-z0-9]$/.test(t) && /^[A-Za-z]/.test(n) ? " " : "";
    return `${t}${space}(${n})`;
  });
}

/** 표시를 지우고 용어만 남긴다 — 제목처럼 괄호도 넣기 어려운 자리 */
export function termsOnly(s: string): string {
  return s.replace(TERM_RE, (_, term: string) => term.trim());
}

/**
 * 같은 용어는 글에서 처음 한 번만 표시한다 — 두 번째부터는 용어만 남긴다.
 * 섹션과 문단을 나눠 그리기 전에 글 전체에 한 번 돌린다.
 */
export function firstTermsOnly(s: string): string {
  const seen = new Set<string>();
  return s.replace(TERM_RE, (m, term: string) => {
    const k = term.trim().toLowerCase();
    if (seen.has(k)) return term.trim();
    seen.add(k);
    return m;
  });
}

export type TermPart = string | { term: string; note: string };

/** 글자 하나를 일반 글자와 표시로 나눈다 */
export function splitTerms(s: string): TermPart[] {
  const out: TermPart[] = [];
  let last = 0;
  for (const m of s.matchAll(TERM_RE)) {
    if (m.index! > last) out.push(s.slice(last, m.index));
    out.push({ term: m[1].trim(), note: m[2].trim() });
    last = m.index! + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
