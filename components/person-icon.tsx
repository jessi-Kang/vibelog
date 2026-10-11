/**
 * 댓글 쓴 사람의 아이콘 — vibelog 아이콘 세트에서 고른 것 (lib/avatar.ts).
 * 옅은 색 바탕 동그라미 위에 같은 색 선 아이콘. 꾸밈이라 화면 읽기 프로그램에는 숨긴다.
 */
import { AVATAR_PATHS } from "@/lib/avatar-icons";
import { withAlpha } from "@/lib/project-color";

export function PersonIcon({ icon, color, size = 24 }: { icon: string; color: string; size?: number }) {
  const paths = AVATAR_PATHS[icon] ?? AVATAR_PATHS.user;
  return (
    <span
      aria-hidden
      className="grid flex-none place-items-center rounded-full"
      style={{ width: size, height: size, background: withAlpha(color, 0.16), color }}
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    </span>
  );
}
