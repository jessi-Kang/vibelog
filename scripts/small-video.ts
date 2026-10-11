/**
 * small-video.ts — 쇼츠의 작은 사본(540×960)을 만든다.
 *
 * 데스크톱 팝업은 영상을 화면 높이의 85%로 띄워 보통 모니터에서 폭이 450px 안팎이다.
 * 1080px 원본을 브라우저가 한 번에 두 배 넘게 줄이면 작은 글자(머리글·아이콘)가
 * … 모바일은
 * 화면 밀도가 높아 원본을 거의 그대로 써서 멀쩡했다. 그래서 작게 보는 화면용으로 미리
 * 곱게(lanczos) 줄인 사본을 하나 더 올리고, 팝업이 필요한 크기를 보고 고른다 (components/lightbox.tsx).
 */
import { execFileSync } from "node:child_process";

export function makeSmall(input: string, output: string): void {
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    "-i", input,
    "-vf", "scale=540:960:flags=lanczos",
    "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p",
    "-c:a", "copy",
    "-movflags", "+faststart",
    output,
  ]);
}
