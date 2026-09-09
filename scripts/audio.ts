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
      let consumed = 0;
      while (cursor < chars.length && consumed < word.length) {
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
  const { audio, alignment } = await tts(sentences.join(SENTENCE_GAP));
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

/** 템플릿 고정 트랙이 있으면 그대로 쓰고, 없으면 생성해서 캐시한다 */
export async function ensureMusic(template: string): Promise<string> {
  const file = musicPath(template);
  if (fs.existsSync(file)) return file;

  // ElevenLabs Music API. 미지원 계정/엔드포인트 변경 시 아래 에러를 보고
  // video/assets/music/<template>.mp3를 직접 넣는 것으로 대체한다 (스펙 문서 권장안).
  const res = await fetch(`${API}/music?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey(), "content-type": "application/json" },
    body: JSON.stringify({
      prompt: MUSIC_PROMPT,
      music_length_ms: 45000,
      model_id: "eleven_music_v2",
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
  await ensureMusic(script.template);
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
