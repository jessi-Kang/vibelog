/**
 * mux.ts — 무음 렌더(mp4) + 내레이션(mp3) + 음악(mp3) → 최종 mp4.
 *
 * 필터그래프는 docs/03-shorts-spec.md "오디오" 확정값:
 * 내레이션 0.5초 딜레이, 음악 volume 0.20 + 사이드체인 더킹
 * (threshold .03, ratio 5, attack 40ms, release 500ms), 끝 3.5초 페이드아웃,
 * amix normalize=0. 오디오 믹스는 Remotion 밖(ffmpeg)에서 한다.
 *
 * 사용: npx tsx scripts/mux.ts <silent.mp4> <narration.mp3> <music.mp3> <out.mp4> <durationSec>
 */
import { execFileSync } from "node:child_process";

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

export function mux(
  silentVideo: string,
  narration: string,
  music: string,
  out: string,
  durationSec: number,
): void {
  const DUR = durationSec.toFixed(3);
  const filter =
    `[1:a]adelay=500|500,apad=whole_dur=${DUR},asplit=2[n1][n2];` +
    `[2:a]atrim=0:${DUR},volume=0.20,afade=t=out:st=${(durationSec - 3.5).toFixed(3)}:d=3.5[m];` +
    `[m][n1]sidechaincompress=threshold=0.03:ratio=5:attack=40:release=500:makeup=1[d];` +
    `[d][n2]amix=inputs=2:duration=first:normalize=0[a]`;
  execFileSync(
    FFMPEG,
    [
      "-y",
      "-i", silentVideo,
      "-i", narration,
      "-i", music,
      "-filter_complex", filter,
      "-map", "0:v",
      "-map", "[a]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      out,
    ],
    { stdio: "inherit" },
  );
  console.log(`믹스 완료: ${out}`);
}

if (process.argv[1]?.endsWith("mux.ts")) {
  const [video, narration, music, out, dur] = process.argv.slice(2);
  if (!video || !narration || !music || !out || !dur) {
    console.error(
      "사용: npx tsx scripts/mux.ts <silent.mp4> <narration.mp3> <music.mp3> <out.mp4> <durationSec>",
    );
    process.exit(1);
  }
  mux(video, narration, music, out, Number(dur));
}
