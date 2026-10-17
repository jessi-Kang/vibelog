"use client";
/**
 * 프로젝트 구분 필터 — 데브로그 피드와 쇼츠가 **같은 것**을 쓴다.
 *
 * 전에는 피드 안에만 있었다. 쇼츠에도 넣으면서 복사하지 않고 꺼냈다 —
 * 사본을 두면 반드시 갈라진다 (칩 개수 기준, 색 점, 카운트 표기 셋 중 하나만
 * 달라져도 두 화면이 다른 물건처럼 보인다).
 *
 * 여덟 개까지는 칩, 넘으면 셀렉트. 칩이 아홉 개가 되면 한 줄을 넘겨 가로로
 * 흐르는데, 그때부터는 고르는 것보다 훑는 게 힘들어진다.
 * 프로젝트가 하나뿐이면 아무것도 그리지 않는다 — 고를 게 없는 필터는 잡음이다.
 */
import { projectColor } from "@/lib/project-color";
import { useLang } from "./lang";

export interface FilterProject {
  slug: string;
  name: string;
  nameEn?: string;
}

const MAX_CHIPS = 8;

export function ProjectFilter({
  projects,
  counts,
  value,
  onChange,
  label,
}: {
  projects: FilterProject[];
  /** slug별 개수 ("all" 포함). 칩·셀렉트에 같이 적는다 */
  counts: Record<string, number>;
  value: string;
  onChange: (slug: string) => void;
  /** 스크린리더용 이름 — 화면에는 섹션 제목이 이미 있다 */
  label: string;
}) {
  const { lang } = useLang();
  const en = lang === "en";
  if (projects.length < 2) return null;

  // 많이 쓴 것부터 — 고를 가능성이 높은 것이 앞에 온다
  const sorted = [...projects].sort(
    (a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0),
  );
  const options = [{ slug: "all", name: en ? "All" : "전체" }, ...sorted];

  if (projects.length > MAX_CHIPS) {
    return (
      <label className="relative block max-w-[320px]">
        <span className="sr-only">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full cursor-pointer appearance-none rounded-md border border-line bg-bg px-3.5 pr-10 font-mono text-base text-ink focus:border-accent"
        >
          {options.map((p) => (
            <option key={p.slug} value={p.slug}>
              {en ? (p.nameEn ?? p.name) : p.name}
              {counts[p.slug] != null ? `  ·  ${counts[p.slug]}` : ""}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">
          ▾
        </span>
      </label>
    );
  }

  return (
    // 가로로만 흐른다 — overflow-x를 열면 세로도 auto가 되는데, 칩(28px)의 터치 영역(.hit, 44px)이
    // 위아래로 8px씩 나와 세로로 2px가 넘쳐서, 가로로 밀 때 위아래로도 조금씩 흔들렸다 (10/17).
    // 세로는 막고, 위아래 여백을 8px로 두어 터치 영역이 잘리지 않게 한다 (py-2는 html 글자 크기에 따라 7px가 된다)
    <div
      role="group"
      aria-label={label}
      className="-mx-1 flex gap-1.5 overflow-x-auto overflow-y-hidden px-1 py-[8px] [scrollbar-width:none]"
    >
      {options.map((p) => {
        const on = p.slug === value;
        return (
          <button
            key={p.slug}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(p.slug)}
            className={`hit min-h-8 flex-none cursor-pointer whitespace-nowrap rounded-full border px-3 font-sans text-xs transition-colors duration-150 ${
              on
                ? "border-line-strong bg-panel2 font-bold text-ink"
                : "border-line bg-transparent font-medium text-muted"
            }`}
          >
            {p.slug !== "all" && (
              // 칩에도 프로젝트 식별색 점 — 피드 마커와 색으로 이어진다
              <span
                aria-hidden
                className="mr-1.5 text-[8px] align-[1px]"
                style={{ color: projectColor(p.slug) }}
              >
                ●
              </span>
            )}
            {en ? (p.nameEn ?? p.name) : p.name}
            {counts[p.slug] != null && (
              <span className="ml-1.5 tabular-nums text-muted">{counts[p.slug]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
