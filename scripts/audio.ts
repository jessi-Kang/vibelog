/**
 * audio.ts — 쇼츠 대본 → ElevenLabs 내레이션(mp3) + 문장/단어 타이밍(timing.json) + 배경음악.
 *
 * 내레이션: docs/03-shorts-spec.md 확정 설정. 타이밍은 항상 생성된 음성의
 * 타임스탬프로 잡는다 — 같은 설정이라도 테이크마다 길이가 달라지기 때문.
 * 음악: video/assets/music/<template>.mp3가 있으면 그걸 쓰고(권장),
 * 없으면 ElevenLabs Music API로 45초 인스트루멘탈을 생성해 같은 경로에 캐시.
 *
 * 사용: npx tsx scripts/audio.ts <repo> <date> [ko|en|both]
 * 필요 환경변수: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
 */
import fs from "node:fs";
import path from "node:path";
import {
  narrationPath,
  shortsJsonPath,
  timingJsonPath,
  type ShortsScript,
  type ShortsTiming,
  type TimedSentence,
  type TimedWord,
} from "./shorts-types";

const API = "https://api.elevenlabs.io/v1";
const MODEL_ID = "eleven_multilingual_v2";
// docs/03-shorts-spec.md 승인 샘플 기준 확정값 (2026-09-09 갱신)
const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
  speed: 1.0,
};
const MUSIC_PROMPT =
  "minimal lo-fi electronic, soft synth pad, muted plucked melody, " +
  "light percussion around 90 BPM, sits under narration, no vocals, no drops, " +
  "beat enters at 8 seconds, fade out in the last 3 seconds";
const SENTENCE_GAP = "\n\n";

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY가 없습니다");
  return key;
}

interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/**
 * ── 발음용 텍스트의 원칙 (Jessi 결정, 여러 번 헛짚고 정리된 것) ──
 *
 * **맞춤법이 아니라 소리 나는 대로 적는다.** TTS에 아라비아 숫자를 맡기면
 * 음절을 뭉개고("222개"→"22엉개"), 맞춤법대로 적으면 읽기가 뻣뻣해진다
 * ("이백이십이 건"). 그래서 발음용 텍스트는 한글 받아쓰기처럼 쓴다 —
 * 숫자는 자릿수 가리지 않고 전부 풀고, 단위는 붙여 쓰고, 된소리와
 * 연음까지 미리 반영한다.
 *
 *   222건이  → 이백이십이꺼니     3.5초  → 삼쩜오초
 *   0건이    → 영꺼니             3점을  → 삼쩌믈
 *
 * 표기(자막·카드·글)는 아라비아 숫자 그대로다 — 바뀌는 건 TTS로 가는
 * 텍스트뿐이다. 음절 수는 보존되므로 자막 정렬(alignment)에도 영향이 없다.
 */
const NATIVE_NUM = [
  "", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열",
  "열한", "열두", "열세", "열네", "열다섯", "열여섯", "열일곱", "열여덟",
  "열아홉", "스무",
];
const NATIVE_UNIT =
  /^(\d+)(시간|개(?!월)|대|명|번(?!지|호)|편|줄|장|가지|마리|권|벌|곳|칸|살|군데|문제|판|곡|잔)(.*)$/u;

/** 한자어 수사 풀어쓰기 — "222" → "이백이십이", "0" → "영" */
const SINO_DIGIT = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
export function sinoRead(n: number): string {
  if (n === 0) return "영";
  if (!Number.isInteger(n) || n < 0 || n >= 1e12) return String(n);
  // 만·억은 재귀로 — 예전엔 10만부터 포기하고 숫자를 그대로 돌려줘
  // 뭉갬이 재발할 지점이었다 ("123,456건" 등)
  if (n >= 1e8) {
    const rest = n % 1e8;
    return sinoRead(Math.floor(n / 1e8)) + "억" + (rest ? sinoRead(rest) : "");
  }
  if (n >= 10000) {
    const head = Math.floor(n / 10000);
    const rest = n % 10000;
    return (head === 1 ? "만" : sinoRead(head) + "만") + (rest ? sinoRead(rest) : "");
  }
  let s = "";
  let rest = n;
  for (const [u, name] of [[1000, "천"], [100, "백"], [10, "십"]] as const) {
    const d = Math.floor(rest / u);
    if (d > 0) s += (d === 1 ? "" : SINO_DIGIT[d]) + name;
    rest %= u;
  }
  return s + SINO_DIGIT[rest];
}

/**
 * 수사 뒤에서 된소리로 굳는 한자어 단위 — 소리대로 적는다.
 * 件은 [껀](사건[사껀]과 같은 이치), 點은 [쩜](초점[초쩜]).
 * 여기 없는 단위는 표기 그대로가 곧 소리다.
 */
const TENSE: Record<string, string> = { 건: "껀", 점: "쩜" };

/**
 * 단위와 그 뒤 조사를 소리대로 — 된소리를 적고, 그 안에서 연음까지 잇는다.
 *   건이 → 껀이 → 꺼니   ·   점을 → 쩜을 → 쩌믈   ·   곳에 → 고세
 *
 * 연음은 여기(단위+조사)에만 건다. 숫자 읽기 안쪽까지 이으면
 * "이백이십이"가 "이배기시비"가 되어 낱말 꼴이 사라지고, 고유어에서는
 * ㄴ첨가를 놓쳐 "열여섯"이 "여려섯"으로 틀리기까지 한다. Jessi가 준
 * 예시("삼쩜오", "이백이십이껀")도 숫자 읽기는 그대로 둔 형태다.
 */
function unitSay(unit: string): string {
  const t = TENSE[unit[0]];
  return liaise(t ? t + unit.slice(1) : unit);
}

/**
 * 연음 — 받침이 뒤 음절의 빈 초성(ㅇ)으로 넘어가는 것을 미리 적는다.
 * "이백이십이껀이"를 그대로 보내면 TTS가 음절을 또박또박 끊어 읽는다
 * (Jessi: "뭔가 연음이 안되는 것 같네"). "이백이십이꺼니"로 적어 보낸다.
 *
 * 홑받침만 옮긴다. 겹받침은 앞뒤를 쪼개야 해서 규칙이 커지고, 숫자+단위
 * 조합에서는 나오지 않는다. ㅇ 받침은 넘어가지 않고(영이→영이), ㄷ·ㅌ은
 * 구개음화까지 얽혀 있어 건드리지 않는다.
 */
const BASE = 0xac00;
const T_TO_L: Record<number, number> = {
  1: 0, 2: 1, 4: 2, 8: 5, 16: 6, 17: 7, 19: 9, 20: 10, 22: 12, 23: 14,
  24: 15, 26: 17, 27: 18,
};
export function liaise(text: string): string {
  const ch = [...text];
  for (let i = 0; i < ch.length - 1; i++) {
    const a = ch[i].codePointAt(0)! - BASE;
    const b = ch[i + 1].codePointAt(0)! - BASE;
    if (a < 0 || a > 11171 || b < 0 || b > 11171) continue;
    const t = a % 28;
    const nextL = Math.floor(b / 588);
    if (!t || nextL !== 11) continue; // 받침이 없거나, 뒤가 빈 초성이 아니다
    const L = T_TO_L[t];
    if (L === undefined) continue; // 겹받침·ㅇ·ㄷ·ㅌ — 그대로 둔다
    ch[i] = String.fromCodePoint(BASE + (a - t));
    ch[i + 1] = String.fromCodePoint(BASE + L * 588 + (b % 588));
  }
  return ch.join("");
}

/** "3.5" 같은 소수 표기까지 읽는 숫자 독음 — "삼쩜오". 정수면 sinoRead 그대로 */
function readNum(s: string): string {
  const [int, frac] = s.split(".");
  const head = sinoRead(Number(int));
  if (frac == null || frac === "") return head;
  // 소수부는 자릿수를 하나씩 읽는다 — "3.14" → "삼점일사"
  const tail = [...frac]
    .map((c) => (c === "0" ? "영" : SINO_DIGIT[Number(c)]))
    .join("");
  return `${head}쩜${tail}`;
}

export function speakToken(tok: string): string {
  // 0) 천 단위 콤마 제거 — "2,889곳"은 콤마 때문에 아래 규칙이 하나도 안
  //    걸려 원문이 그대로 TTS로 가 뭉개졌다. 표기(자막·카드)는 콤마를
  //    유지하고 발음용 토큰만 편다.
  tok = tok.replace(/(\d),(?=\d{3})/g, "$1");
  // 0.5) 범위 "30~45초" — 물결표는 TTS가 아예 못 읽는다. 왼쪽은 숫자 독음,
  //      오른쪽은 단위까지 통째로 재귀 처리한 뒤 여전히 숫자로 시작하면
  //      ("45초"처럼 평소엔 안 건드리는 꼴) 강제로 풀어 좌우 읽기를 맞춘다
  const r = tok.match(/^(\d+(?:\.\d+)?)[~∼–](\d.*)$/u);
  if (r) {
    let right = speakToken(r[2]);
    const rd = right.match(/^(\d+(?:\.\d+)?)(.*)$/u);
    if (rd) right = `${readNum(rd[1])}${rd[2].replace(/^\s+/, "")}`;
    return `${readNum(r[1])}에서 ${right}`;
  }
  // 0.6) 퍼센트 — "%" 기호 해석을 TTS에 맡기지 않는다. "50%" → "오십퍼센트"
  const p = tok.match(/^(\d+(?:\.\d+)?)%(.*)$/u);
  if (p) return `${readNum(p[1])}퍼센트${p[2]}`;
  // 0.7) 만·억 접미 — "3만개" → "삼만개" (뒤에 또 숫자가 오는 "3만5천" 꼴은
  //      섣불리 쪼개면 더 이상해지니 건드리지 않는다)
  const w = tok.match(/^(\d{1,4})(만|억)(?!\d)(.*)$/u);
  if (w) {
    const v = Number(w[1]) * (w[2] === "만" ? 1e4 : 1e8);
    return `${sinoRead(v)}${unitSay(w[3])}`;
  }
  // 0.8) 소수점 — "3.5초"는 정수 규칙 어디에도 안 걸린다. "삼점오초"
  const d = tok.match(/^(\d+\.\d+)([가-힣].*)?$/u);
  if (d) return `${readNum(d[1])}${unitSay(d[2] ?? "")}`;
  // 2) 고유어 단위: 20까지는 고유어 수사 — "10문제" → "열문제"
  const m = tok.match(NATIVE_UNIT);
  if (m) {
    const n = Number(m[1]);
    const head = n >= 1 && n <= 20 ? NATIVE_NUM[n] : sinoRead(n);
    return `${head}${unitSay(m[2] + m[3])}`;
  }
  // 3) 그 외 숫자+한글 단위 — 자릿수를 가리지 않고 전부 푼다.
  //    한때 "두 자리 이하는 TTS가 알아서 읽는다"고 뒀는데, 실제로 들어 보니
  //    아라비아 숫자는 자릿수와 무관하게 읽기가 불안했다 (Jessi 테스트).
  //    "222건" → "이백이십이껀", "0건" → "영껀", "3점" → "삼쩜".
  const big = tok.match(/^(\d+)([가-힣].*)$/u);
  if (big) return `${sinoRead(Number(big[1]))}${unitSay(big[2])}`;
  // 4) 단위 없이 홀로 선 숫자 (뒤는 문장부호만). 연도 "2026"도
  //    "이천이십육"으로 맞다. 숫자·한글이 더 붙은 꼴(1080×1920 등)은 제외
  const bare = tok.match(/^(\d+)([^\d가-힣a-zA-Z]*)$/u);
  if (bare) return `${sinoRead(Number(bare[1]))}${bare[2]}`;
  return tok;
}

/** 문장 전체의 발음용 변환 — 토큰 순서·공백 구분은 유지된다 (타이밍 정렬용) */
function speakable(sentence: string, lang: "ko" | "en"): string {
  if (lang !== "ko") return sentence;
  return sentence.split(/\s+/).filter(Boolean).map(speakToken).join(" ");
}

async function tts(
  text: string,
): Promise<{ audio: Buffer; alignment: Alignment }> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID가 없습니다");
  const res = await fetch(
    `${API}/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey(), "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: VOICE_SETTINGS,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`TTS 실패 ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    audio_base64: string;
    alignment: Alignment;
  };
  return {
    audio: Buffer.from(data.audio_base64, "base64"),
    alignment: data.alignment,
  };
}

/**
 * 문장들을 하나로 이어 TTS를 한 번 호출하고, 문자 단위 타임스탬프를
 * 문장·단어 타이밍으로 되돌린다. 조인 문자열의 문자 오프셋으로 경계를 잡는다.
 */
function toTiming(
  sentences: string[],
  lineIndexes: number[],
  alignment: Alignment,
  lang: "ko" | "en",
): ShortsTiming {
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;

  const timed: TimedSentence[] = [];
  let cursor = 0; // alignment 문자 배열에서의 위치

  for (let s = 0; s < sentences.length; s++) {
    const sentence = sentences[s];
    // 조인 구분자(공백/개행)를 건너뛴다
    while (cursor < chars.length && /\s/.test(chars[cursor])) cursor++;

    const words: TimedWord[] = [];
    for (const word of sentence.split(/\s+/).filter(Boolean)) {
      // 단어의 첫 문자에 도달할 때까지 공백을 소비
      while (cursor < chars.length && /\s/.test(chars[cursor])) cursor++;
      const wStartIdx = cursor;
      // TTS에는 발음 교정된 텍스트가 갔다("2대"→"두 대") — alignment의 문자
      // 소비 길이는 표시 단어가 아니라 발음 형태 기준이어야 정렬이 안 밀린다
      const spokenLen = speakable(word, lang).replace(/\s/g, "").length;
      let consumed = 0;
      while (cursor < chars.length && consumed < spokenLen) {
        // TTS가 문자를 그대로 돌려주므로 순서대로 소비한다
        if (!/\s/.test(chars[cursor])) consumed++;
        cursor++;
      }
      const wEndIdx = Math.max(wStartIdx, cursor - 1);
      words.push({
        text: word,
        start: starts[wStartIdx] ?? 0,
        end: ends[wEndIdx] ?? starts[wStartIdx] ?? 0,
      });
    }
    if (words.length === 0) continue;
    timed.push({
      index: lineIndexes[s],
      start: words[0].start,
      end: words[words.length - 1].end,
      words,
    });
  }

  return {
    lang,
    duration: ends[ends.length - 1] ?? 0,
    sentences: timed,
  };
}

async function generateNarration(
  script: ShortsScript,
  lang: "ko" | "en",
): Promise<void> {
  const sentences = script.lines.map((l) => l[lang]);
  const lineIndexes = script.lines.map((_, i) => i);
  // 발음 교정본으로 녹음하고, 자막(timing.words)은 표시용 원문을 유지한다
  const { audio, alignment } = await tts(
    sentences.map((s) => speakable(s, lang)).join(SENTENCE_GAP),
  );
  const timing = toTiming(sentences, lineIndexes, alignment, lang);

  const mp3 = path.join(process.cwd(), narrationPath(script.repo, script.date, lang));
  fs.mkdirSync(path.dirname(mp3), { recursive: true });
  fs.writeFileSync(mp3, audio);
  fs.writeFileSync(
    path.join(process.cwd(), timingJsonPath(script.repo, script.date, lang)),
    JSON.stringify(timing, null, 2) + "\n",
  );
  console.log(
    `${lang} 내레이션 ${timing.duration.toFixed(1)}초, 문장 ${timing.sentences.length}개`,
  );
}

export function musicPath(template: string): string {
  return path.join(process.cwd(), "video", "assets", "music", `${template}.mp3`);
}

/**
 * 대본이 고른 무드 트랙 → 템플릿 트랙 → 아무 고정 트랙 순으로 고른다.
 * 무드 트랙 5종(ship-it/upbeat/tense/calm/playful)은 미리 만들어 커밋해
 * 둔다 (Jessi 지시 — 상황에 맞는 톤). 이 폴백 사슬 덕에 음악 API(크레딧)
 * 의존 없이 파이프라인이 항상 돈다 (run #11: fail.mp3가 없어 API 폴백을
 * 탔다가 크레딧 부족 401로 전체가 죽었다).
 */
export function resolveMusic(s: { music?: string; template: string }): string | null {
  for (const name of [s.music, s.template]) {
    if (name && fs.existsSync(musicPath(name))) return musicPath(name);
  }
  const dir = path.dirname(musicPath(s.template));
  if (!fs.existsSync(dir)) return null;
  const any = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mp3"))
    .sort(); // 결정론적 선택
  return any.length > 0 ? path.join(dir, any[0]) : null;
}

/** 고정 트랙(무드 → 템플릿 → 아무거나) 우선, 정말 하나도 없을 때만 API 생성 */
export async function ensureMusic(s: { music?: string; template: string }): Promise<string> {
  const resolved = resolveMusic(s);
  if (resolved) {
    console.log(`음악: ${path.basename(resolved)}`);
    return resolved;
  }
  const file = musicPath(s.template);

  // ElevenLabs Music API 폴백 — 기본 경로는 레포에 커밋된 고정 트랙이다.
  // model_id는 명시하지 않는다: REST API의 모델명이 문서와 달라 422를 냈다
  // ("Invalid model id: eleven_music_v2"). 기본 모델에 맡긴다.
  const res = await fetch(`${API}/music?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey(), "content-type": "application/json" },
    body: JSON.stringify({
      prompt: MUSIC_PROMPT,
      music_length_ms: 45000,
      force_instrumental: true,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `음악 생성 실패 ${res.status}: ${await res.text()}\n` +
        `→ 대안: ${file} 위치에 45초 인스트루멘탈 mp3를 직접 넣으면 그걸 사용합니다.`,
    );
  }
  const audio = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, audio);
  console.log(`음악 생성·캐시: ${file}`);
  return file;
}

export async function generateAudio(
  repo: string,
  date: string,
  langs: ("ko" | "en")[] = ["ko", "en"],
): Promise<void> {
  const script: ShortsScript = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), shortsJsonPath(repo, date)), "utf8"),
  );
  for (const lang of langs) {
    await generateNarration(script, lang);
  }
  await ensureMusic(script);
}

if (process.argv[1]?.endsWith("audio.ts")) {
  const [repo, date, langArg] = process.argv.slice(2);
  if (!repo || !date) {
    console.error("사용: npx tsx scripts/audio.ts <repo> <date> [ko|en|both]");
    process.exit(1);
  }
  const langs: ("ko" | "en")[] =
    langArg === "ko" ? ["ko"] : langArg === "en" ? ["en"] : ["ko", "en"];
  generateAudio(repo, date, langs).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
