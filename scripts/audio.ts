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
 * 고유어로 읽는 수량 단위의 발음 교정 — TTS가 "2대"를 "이대"로 읽는다
 * (Jessi 지적). 자막·글은 규칙대로 아라비아 숫자를 유지하고, TTS에 보내는
 * 발음용 텍스트만 한글 수사로 바꾼다. "52초"처럼 한자어로 읽는 단위(초·분·
 * 픽셀·개월 등)는 아라비아 숫자 그대로가 맞으므로 건드리지 않는다.
 */
const NATIVE_NUM = [
  "", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열",
  "열한", "열두", "열세", "열네", "열다섯", "열여섯", "열일곱", "열여덟",
  "열아홉", "스무",
];
const NATIVE_UNIT =
  /^(\d{1,2})(시간|개(?!월)|대|명|번(?!지|호)|편|줄|장|가지|마리|권|벌|곳|칸|살|군데|문제|판|곡|잔)(.*)$/u;

/**
 * 한자어 수사 풀어쓰기 — TTS가 아라비아 숫자+단위를 스스로 한국어로 푸는
 * 과정이 불안정하다: "222개"를 "22엉개", "0껀"을 "영엉건"처럼 음절을
 * 뭉갠 사고 (Jessi 지적). 숫자 해석을 TTS에 맡기지 않고 발음용 텍스트에서
 * 한글로 전부 풀어 보낸다 — "222" → "이백이십이", "0" → "영".
 */
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

/** "3.5" 같은 소수 표기까지 읽는 숫자 독음 — "삼점오". 정수면 sinoRead 그대로 */
function readNum(s: string): string {
  const [int, frac] = s.split(".");
  const head = sinoRead(Number(int));
  if (frac == null || frac === "") return head;
  // 소수부는 자릿수를 하나씩 읽는다 — "3.14" → "삼점일사"
  const tail = [...frac]
    .map((c) => (c === "0" ? "영" : SINO_DIGIT[Number(c)]))
    .join("");
  return `${head}점${tail}`;
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
    if (rd) right = `${readNum(rd[1])}${rd[2] ? ` ${rd[2].replace(/^\s+/, "")}` : ""}`;
    return `${readNum(r[1])}에서 ${right}`;
  }
  // 0.6) 퍼센트 — "%" 기호 해석을 TTS에 맡기지 않는다. "50%" → "오십 퍼센트"
  const p = tok.match(/^(\d+(?:\.\d+)?)%(.*)$/u);
  if (p) return `${readNum(p[1])} 퍼센트${p[2]}`;
  // 0.7) 만·억 접미 — "3만개" → "삼만 개" (뒤에 또 숫자가 오는 "3만5천" 꼴은
  //      섣불리 쪼개면 더 이상해지니 건드리지 않는다)
  const w = tok.match(/^(\d{1,4})(만|억)(?!\d)(.*)$/u);
  if (w) {
    const v = Number(w[1]) * (w[2] === "만" ? 1e4 : 1e8);
    const rest = w[3];
    return `${sinoRead(v)}${rest ? ` ${rest}` : ""}`;
  }
  // 0.8) 소수점 — "3.5초"는 정수 규칙 어디에도 안 걸린다. "삼점오 초"
  const d = tok.match(/^(\d+\.\d+)([가-힣].*)?$/u);
  if (d) return `${readNum(d[1])}${d[2] ? ` ${d[2]}` : ""}`;
  // 2) 고유어 단위: 20까지는 고유어 수사 — "10문제" → "열 문제"
  const m = tok.match(NATIVE_UNIT);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 20) return `${NATIVE_NUM[n]} ${m[2]}${m[3]}`;
    // 20 초과는 한자어 독음이 자연스럽다 — 역시 한글로 풀어 보낸다 ("삼십 개")
    return `${sinoRead(n)} ${m[2]}${m[3]}`;
  }
  // 3) 그 외 세 자리 이상 숫자+한글 단위: TTS가 특히 잘 뭉개는 구간이라
  //    한자어 독음으로 풀어 보낸다 ("222회" → "이백이십이 회"). 두 자리
  //    이하("52초")는 지금까지 문제없어 건드리지 않는다.
  //    "건"도 여기서 처리된다. 한때 따로 규칙을 뒀다가 두 번 헛짚었다 —
  //    된소리 강제("이백이십이 껀")도, 단위 붙여쓰기("이백이십이건",
  //    "영건")도 어색하게 읽혔다 (Jessi). 특별 대우를 없애니 세 자리
  //    이상만 "이백이십이 건"으로 풀리고, "0건"·"3건"은 손대지 않은 채
  //    TTS가 알아서 읽는다 — 애초에 뭉개진 적 없는 구간이다.
  const big = tok.match(/^(\d{3,})([가-힣].*)$/u);
  if (big) return `${sinoRead(Number(big[1]))} ${big[2]}`;
  // 4) 단위 없이 홀로 선 세 자리 이상 숫자 (뒤는 문장부호만) — "2,889"가
  //    단독 토큰이면 콤마만 벗겨 숫자 그대로 가던 구멍. 연도 "2026"도
  //    "이천이십육"으로 맞다. 숫자·한글이 더 붙은 꼴(1080×1920 등)은 제외
  const bare = tok.match(/^(\d{3,})([^\d가-힣a-zA-Z]*)$/u);
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
