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
  /** 내레이션 시작 지연(초) — 기본 0.5, 커밋 콜드오픈이 있으면 +2.0 */
  narrationDelaySec = 0.5,
): void {
  const DUR = durationSec.toFixed(3);
  const DELAY = Math.round(narrationDelaySec * 1000);
  const filter =
    `[1:a]adelay=${DELAY}|${DELAY},apad=whole_dur=${DUR},asplit=2[n1][n2];` +
    // 음악은 45초짜리 고정 트랙이라 영상이 더 길면 거기서 끊긴다 — 그러면
    // -shortest가 영상까지 잘라 엔드카드가 통째로 날아간다 (apart 9/10에서
    // 50초 영상이 45초로 잘림, Jessi 지적). 루프로 이어 붙이고, 그래도 모자라면
    // 무음으로 채워 오디오 길이가 항상 영상 길이와 같게 만든다.
    `[2:a]aloop=loop=-1:size=2147483647,atrim=0:${DUR},asetpts=N/SR/TB,` +
    `apad=whole_dur=${DUR},volume=0.20,` +
    `afade=t=out:st=${(durationSec - 3.5).toFixed(3)}:d=3.5[m];` +
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
