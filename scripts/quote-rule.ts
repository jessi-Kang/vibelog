/**
 * quote-rule.ts — 대화에서 Jessi가 한 말을 따옴표로 그대로 옮겨 적은 곳을 찾는다.
 *
 * 이 레포는 공개이고, 커밋 메시지는 밤마다 글의 재료가 된다. 그런데 문서·코드 주석·커밋
 * 메시지에 대화 속 말을 따옴표째 옮겨 적은 곳이 쌓였다 (10/15에 찾아 보니 수백 줄).
 * 대화는 공개하려고 한 말이 아니다 — 무엇을 왜 정했는지 뜻만 풀어 쓴다.
 * 커밋 검사(check-commit.ts)와 파일 검사(check-quotes.ts)가 같이 쓴다.
 *
 * 찾는 꼴은 다섯이다. "Jessi: …"처럼 이름 뒤 쌍점(따옴표가 없어도 말을 옮긴 꼴), Jessi가 "…",
 * 닫는 따옴표 바로 뒤에 괄호·줄표와 이름이 오는 "…" (Jessi), 이름과 따옴표 사이에
 * 몇 마디가 끼는 꼴, 이름 없이 "…"라고 했다로 잇는 꼴. 따옴표가 없어도 이름을 출처로 다는 꼴
 * (이름 + 지시·지적·요청, 날짜 옆 이름, 이름이 골랐다·짚었다)도 막는다 — 10/15에 이름 자체를
 * 문서·주석·커밋에 남기지 않기로 했다. 사이트 화면·메일·대본 지시문처럼 이름이 기능인 자리는 걸리지 않는다. 주석이 여러 줄에 걸쳐도 잡도록 줄바꿈과 주석 기호를 지운
 * 글에서 찾는다. 메일 제목 "Jessi가 내 댓글에 답글을 달았습니다"처럼 화면에 쓰는
 * 글자는 걸리지 않는다.
 */
const NAME = "Jessi";
const OPEN = `"“「‘`;
const CLOSE = `"”」’`;
const PATTERNS: RegExp[] = [
  // "Jessi: …", "Jessi 지적: …", "10/11 Jessi: …" — 따옴표가 없어도 말을 옮긴 꼴이다
  new RegExp(`${NAME}(?:\\s*(?:지시|지적|요청|의견|말))?\\s*[:：]\\s*[^\\s)]`, "g"),
  // Jessi가 "…", Jessi는 "…"
  new RegExp(`${NAME}(?:가|는|이|께서)\\s+[${OPEN}]`, "g"),
  // "…" (Jessi …), "…" — Jessi
  new RegExp(`[${CLOSE}]\\s*[)\\]]?\\s*(?:\\(|—|,)\\s*(?:\\d{1,2}/\\d{1,2}\\s*)?${NAME}`, "g"),
  // Jessi가 짚었다: "…", Jessi가 시안을 보고 "…" — 이름과 따옴표 사이에 몇 마디가 끼어도
  new RegExp(`${NAME}(?:가|는|이|께서)[^.。\\n"“”]{0,30}(?:짚었|말했|했|보고|물었)[^.\\n"“”]{0,6}[:：—]?\\s*[${OPEN}]`, "g"),
  // 이름 없이 "…"라고 했다, "…"고 짚었다 — 누가 했든 말을 옮긴 꼴이다
  new RegExp(`[${CLOSE}](?:라고|이라고|고)\\s*(?:했|말했|짚었|물었)`, "g"),
  // 따옴표가 없어도 이름을 출처로 단 꼴 — (Jessi 지시), Jessi의 지적, (10/11 Jessi), (…, Jessi), Jessi가 골랐다
  new RegExp(`${NAME}(?:의)?\\s?(?:지적|요청|결정|지시|판단|기준|선택|승인|피드백|제보|테스트|규칙|의견|점검)`, "g"),
  new RegExp(`\\(${NAME}[,)]|\\d{1,2}/\\d{1,2} ${NAME}\\b|, ${NAME}\\)`, "g"),
  new RegExp(`${NAME}(?:가|는|이)\\s[^.\\n]{0,20}(?:짚었|정했|골랐|잡았|알아챘|좋다고|싫어)`, "g"),
  // 대화의 말을 풀어 옮긴 메모 — "…라는 지적", "…하자는 요청". 무엇이 깨졌는지만 쓴다
  /(?:다는|라는|냐는|하자는|말자는|두자는|쓰자는|만들자는|맞추자는|바꾸자는|보자는)\s+(?:지적|요청|불만|피드백)/g,
];

export interface QuoteHit {
  line: number;
  text: string;
}

export function findUserQuotes(text: string): QuoteHit[] {
  // 줄바꿈과 다음 줄 앞의 주석 기호(//, *, #, >)를 공백 하나로 — 원래 줄 번호는 따로 기억한다
  let flat = "";
  const lineOf: number[] = [];
  const lines = text.split("\n");
  lines.forEach((l, i) => {
    const body = i === 0 ? l : l.replace(/^\s*(?:\/\/+|\*+|#+|>+)?\s*/, "");
    const piece = (i === 0 ? "" : " ") + body;
    for (let k = 0; k < piece.length; k++) lineOf.push(i + 1);
    flat += piece;
  });
  const seen = new Set<number>();
  const hits: QuoteHit[] = [];
  for (const re of PATTERNS) {
    for (const m of flat.matchAll(re)) {
      const ln = lineOf[m.index ?? 0];
      if (seen.has(ln)) continue;
      seen.add(ln);
      hits.push({ line: ln, text: lines[ln - 1].trim().slice(0, 120) });
    }
  }
  return hits.sort((a, b) => a.line - b.line);
}
