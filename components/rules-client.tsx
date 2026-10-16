"use client";
/**
 * 커밋 규칙과 쇼츠 테마 — 프로젝트 레포에 붙이는 두 가지를 공개로 보여 주는 페이지.
 * 소개 페이지 "어떻게 돌아가나"에서 들어온다. 복사 블록 원문은 docs/02 §3 (app/about/rules/page.tsx)
 */
import { useRef, useState, type CSSProperties } from "react";
import { useLang } from "@/components/lang";
import { PageContainer } from "@/components/page-container";
import { SectionHeader } from "@/components/ui";

type L = { ko: string; en: string };

/** 쇼츠 테마 5종 — 값은 video/src/theme.ts와 같다 (그 파일은 Remotion 글꼴을 불러와 사이트에서 못 읽는다) */
const THEMES: {
  key: string;
  name: L;
  note: L;
  uses: L;
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  keyword: "color" | "underline" | "marker";
  backdrop: "glow" | "grid" | "edge" | "flat";
  badgeFill: boolean;
  badgeRadius: number;
}[] = [
  {
    key: "terminal",
    name: { ko: "터미널", en: "Terminal" },
    note: { ko: "기본값. 도구·자동화", en: "The default. Tools and automation" },
    uses: { ko: "vibelog (지정 없음)", en: "vibelog (none set)" },
    bg: "#0A0E14", panel: "#141B24", ink: "#F3EFE6", muted: "#8C98A8", accent: "#5EE1C3", accentInk: "#06261F",
    keyword: "color", backdrop: "glow", badgeFill: false, badgeRadius: 999,
  },
  {
    key: "blueprint",
    name: { ko: "블루프린트", en: "Blueprint" },
    note: { ko: "격자와 파란 밑줄, 각진 모서리. 인프라·API", en: "Grid and blue underline, square corners. Infra and APIs" },
    uses: { ko: "Anchor, portfolio-tmp", en: "Anchor, portfolio-tmp" },
    bg: "#0D1B2E", panel: "#122540", ink: "#EDF2FA", muted: "#6D84A3", accent: "#7FB0FF", accentInk: "#071426",
    keyword: "underline", backdrop: "grid", badgeFill: false, badgeRadius: 8,
  },
  {
    key: "signal",
    name: { ko: "시그널", en: "Signal" },
    note: { ko: "주황 상단 띠와 채운 배지. 소비자 앱·운동", en: "Orange top bar and filled badge. Consumer apps and fitness" },
    uses: { ko: "아직 없음", en: "None yet" },
    bg: "#131110", panel: "#1C1815", ink: "#F5EFE8", muted: "#8A807A", accent: "#FF6B35", accentInk: "#1B0E06",
    keyword: "color", backdrop: "edge", badgeFill: true, badgeRadius: 999,
  },
  {
    key: "paper",
    name: { ko: "페이퍼", en: "Paper" },
    note: { ko: "하나뿐인 밝은 테마, 초록 형광펜. 글쓰기·정리 도구", en: "The only light theme, green highlighter. Writing and note tools" },
    uses: { ko: "apart", en: "apart" },
    bg: "#EFF1F4", panel: "#FFFFFF", ink: "#171A1F", muted: "#8A919B", accent: "#0F7B5F", accentInk: "#F2FBF8",
    keyword: "marker", backdrop: "flat", badgeFill: false, badgeRadius: 999,
  },
  {
    key: "highlighter",
    name: { ko: "하이라이터", en: "Highlighter" },
    note: { ko: "흑백에 노랑 마커. 실험작·장난감", en: "Black and white with a yellow marker. Experiments and toys" },
    uses: { ko: "agency", en: "agency" },
    bg: "#0C0C0D", panel: "#161618", ink: "#FAFAF7", muted: "#77777B", accent: "#FFD84D", accentInk: "#0C0C0D",
    keyword: "marker", backdrop: "flat", badgeFill: true, badgeRadius: 4,
  },
];

type Theme = (typeof THEMES)[number];

function keywordStyle(t: Theme): CSSProperties {
  if (t.keyword === "underline") return { color: t.accent, boxShadow: `inset 0 -6px 0 ${t.accent}55` };
  if (t.keyword === "marker")
    return { color: t.accentInk, background: t.accent, padding: "0 5px", borderRadius: 4, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" };
  return { color: t.accent };
}

function backdrop(t: Theme): string {
  if (t.backdrop === "glow") return `radial-gradient(120% 70% at 50% 0%, ${t.accent}26, transparent 60%), ${t.bg}`;
  if (t.backdrop === "grid")
    return `linear-gradient(${t.accent}14 1px, transparent 1px) 0 0/22px 22px, linear-gradient(90deg, ${t.accent}14 1px, transparent 1px) 0 0/22px 22px, ${t.bg}`;
  if (t.backdrop === "edge") return `linear-gradient(${t.accent}, ${t.accent}) top/100% 5px no-repeat, ${t.bg}`;
  return t.bg;
}

const TYPES: { type: string; when: L; graph: L }[] = [
  { type: "feat", when: { ko: "새 기능, 눈에 보이는 새 능력", en: "A new feature or visible capability" }, graph: { ko: "강조색", en: "Accent" } },
  { type: "fix", when: { ko: "실제로 깨졌던 것을 고쳤을 때만", en: "Only when something was actually broken" }, graph: { ko: "경고색 · 글의 삽질 포인트 재료", en: "Warning · feeds the post's rabbit holes" } },
  { type: "docs", when: { ko: "문서만 바뀜", en: "Docs only" }, graph: { ko: "회색", en: "Gray" } },
  { type: "chore", when: { ko: "정리, 설정, 의존성, 자동 작업", en: "Cleanup, config, dependencies, automation" }, graph: { ko: "회색", en: "Gray" } },
  { type: "design", when: { ko: "모양만 바뀜 (새 기능 없이)", en: "Looks only (no new feature)" }, graph: { ko: "회색", en: "Gray" } },
  { type: "asset", when: { ko: "그림·글꼴·소리 파일", en: "Images, fonts, sound files" }, graph: { ko: "회색", en: "Gray" } },
];

const STEPS: L[] = [
  { ko: "테마를 바꿀 레포의 GitHub 첫 화면을 엽니다.", en: "Open the repo's page on GitHub." },
  { ko: "오른쪽 About 옆 톱니바퀴 → Topics에 위 topic을 붙여 넣고 저장합니다.", en: "Click the gear next to About → paste the topic into Topics and save." },
  { ko: "다른 vibelog-theme-… topic이 이미 있으면 지웁니다. 둘이면 앞의 것 하나만 쓰입니다.", en: "Remove any other vibelog-theme-… topic. If there are two, only the first is used." },
  { ko: "레포의 vibelog.json에 \"theme\"이 적혀 있으면 그 값이 topic보다 앞섭니다. 그때는 그 값을 바꿉니다.", en: "If the repo's vibelog.json has a \"theme\" value, it wins over the topic. Change that instead." },
];

/** 누르면 복사, 복사가 막힌 곳에서는 글을 선택해 둔다 (결과는 aria-live로 알린다) */
function useCopy(announce: (msg: string) => void, lang: "ko" | "en") {
  const [done, setDone] = useState<string | null>(null);
  return {
    done,
    async copy(id: string, text: string, el: HTMLElement | null) {
      try {
        await navigator.clipboard.writeText(text);
        setDone(id);
        announce(lang === "ko" ? "복사했습니다" : "Copied");
      } catch {
        if (el) {
          const r = document.createRange();
          r.selectNodeContents(el);
          const s = window.getSelection();
          s?.removeAllRanges();
          s?.addRange(r);
        }
        announce(lang === "ko" ? "글을 선택했습니다. 직접 복사하세요" : "Text selected. Copy it yourself");
      }
      setTimeout(() => setDone((d) => (d === id ? null : d)), 1600);
    },
  };
}

function CopyButton({ done, label, onClick, ghost }: { done: boolean; label: string; onClick: () => void; ghost?: boolean }) {
  const { lang } = useLang();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`hit h-8 shrink-0 rounded-md px-3 font-sans text-xs font-bold transition-opacity duration-150 hover:opacity-85 active:translate-y-px ${
        done
          ? "bg-panel2 text-accent"
          : ghost
            ? "border border-line-strong text-ink-soft"
            : "bg-accent text-accent-ink"
      }`}
    >
      {done ? (lang === "ko" ? "복사됨" : "Copied") : lang === "ko" ? "복사" : "Copy"}
    </button>
  );
}

export function RulesClient({ rules, display }: { rules: string; display: string }) {
  const { lang } = useLang();
  const [live, setLive] = useState("");
  const { done, copy } = useCopy(setLive, lang);
  const ruleRef = useRef<HTMLPreElement>(null);
  const t = (l: L) => l[lang];

  return (
    <PageContainer>
      <section className="mx-auto flex w-full max-w-[680px] flex-col gap-10">
        <div className="flex flex-col gap-3.5">
          <SectionHeader title={lang === "ko" ? "커밋 규칙과 쇼츠 테마" : "Commit rules and Shorts themes"} />
          <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
            {lang === "ko"
              ? "새 프로젝트를 vibelog에 올릴 때 그 레포에 붙이는 두 가지입니다. 커밋 규칙은 레포의 CLAUDE.md에, 쇼츠 테마는 레포 topic에 넣습니다. 이 사이트의 글과 영상은 전부 이 규칙을 따른 커밋에서 나옵니다."
              : "Two things I add to every repo I put on vibelog: the commit rules go in the repo's CLAUDE.md, the Shorts theme goes in a repo topic. Every post and video on this site comes from commits that follow these rules."}
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-6">
          <div className="font-mono text-2xs uppercase tracking-[.08em] text-muted">rules</div>
          <h2 className="text-lg font-bold text-ink">{lang === "ko" ? "커밋 규칙과 대화 비공개" : "Commit rules and chat privacy"}</h2>
          <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
            {lang === "ko"
              ? "커밋 메시지가 밤마다 글과 쇼츠의 재료가 됩니다. 본문이 40자 이상인 커밋이 5개 모여야 그날 글이 나오므로, 이 블록이 없으면 글이 아예 안 나올 수 있습니다. 커밋 메시지는 그대로 공개되므로, AI와 나눈 말이 커밋에 들어가지 않게 하는 규칙도 같이 붙입니다."
              : "Commit messages are the raw material for each night's post and Short. A post needs five commits with bodies of 40+ characters, so without this block there may be no post at all. Commit messages go public as written, so a rule that keeps my chats with the AI out of commits comes with it."}
          </p>
          <div className="min-w-0 rounded-lg border border-line bg-panel">
            <div className="flex items-center justify-between gap-3 border-b border-line py-2 pl-4 pr-2">
              <span className="font-mono text-2xs text-muted">CLAUDE.md</span>
              <CopyButton
                done={done === "rules"}
                label={lang === "ko" ? "커밋 규칙 복사" : "Copy the commit rules"}
                onClick={() => copy("rules", rules, ruleRef.current)}
              />
            </div>
            <pre
              ref={ruleRef}
              className="m-0 max-h-[420px] overflow-auto whitespace-pre-wrap p-4 font-sans text-sm leading-[1.75] text-ink-soft"
            >
              {display}
            </pre>
          </div>
          {lang === "en" && (
            <p className="m-0 text-sm text-muted">The block stays in Korean — it is the exact text my repos use.</p>
          )}
          <div className="min-w-0 overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-2xs text-muted">
                  <th className="px-3.5 py-2.5 font-medium">{lang === "ko" ? "타입" : "Type"}</th>
                  <th className="px-3.5 py-2.5 font-medium">{lang === "ko" ? "쓸 때" : "When"}</th>
                  <th className="px-3.5 py-2.5 font-medium">{lang === "ko" ? "쇼츠 커밋 그래프" : "Shorts commit graph"}</th>
                </tr>
              </thead>
              <tbody>
                {TYPES.map((r) => (
                  <tr key={r.type} className="border-b border-line last:border-0">
                    <td className="px-3.5 py-2.5 font-mono text-ink">{r.type}</td>
                    <td className="px-3.5 py-2.5 text-ink-soft">{t(r.when)}</td>
                    <td
                      className={`px-3.5 py-2.5 ${r.type === "feat" ? "text-accent" : r.type === "fix" ? "text-warn" : "text-muted"}`}
                    >
                      {t(r.graph)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="m-0 text-sm leading-relaxed text-muted">
            {lang === "ko" ? "커밋할 때 이 규칙을 기계로 검사하는 코드는 " : "The check that enforces this at commit time is "}
            <a
              href="https://github.com/jessi-Kang/vibelog/blob/claude/file-analysis-dpnhw1/scripts/quote-rule.ts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline-offset-2 hover:underline"
            >
              scripts/quote-rule.ts
            </a>
            {lang === "ko" ? "에 있습니다." : "."}
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-6">
          <div className="font-mono text-2xs uppercase tracking-[.08em] text-muted">themes</div>
          <h2 className="text-lg font-bold text-ink">{lang === "ko" ? "쇼츠 테마" : "Shorts themes"}</h2>
          <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
            {lang === "ko"
              ? "레포에 topic 하나를 달면 그 레포의 쇼츠 색과 강조 방식이 바뀝니다. 장면 순서와 자막 규칙은 모든 테마가 같고, 색·강조·카드 모양만 다릅니다. 아무것도 안 달면 터미널입니다."
              : "One topic on a repo changes the colors and emphasis of its Shorts. Scene order and caption rules are the same for every theme; only colors, emphasis and card shapes differ. With no topic, it's Terminal."}
          </p>
          <div className="grid gap-3.5 sm:grid-cols-2">
            {THEMES.map((th) => {
              const topic = `vibelog-theme-${th.key}`;
              return (
                <article key={th.key} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-panel">
                  <div
                    aria-hidden
                    className="flex aspect-[9/8] max-w-full flex-col justify-between gap-3 px-4 py-4"
                    style={{ background: backdrop(th), color: th.ink }}
                  >
                    <span
                      className="self-start border-[1.5px] px-2.5 py-0.5 font-mono text-2xs font-bold tracking-[.08em]"
                      style={
                        th.badgeFill
                          ? { background: th.accent, color: th.accentInk, borderColor: th.accent, borderRadius: th.badgeRadius }
                          : { color: th.accent, borderColor: th.accent, borderRadius: th.badgeRadius }
                      }
                    >
                      SHIP IT
                    </span>
                    <p className="m-0 text-lg font-black leading-[1.45]">
                      {lang === "ko" ? (
                        <>
                          가짜 아파트 이름이 <span style={keywordStyle(th)}>진짜만큼</span> 길어졌습니다
                        </>
                      ) : (
                        <>
                          Fake apartment names got <span style={keywordStyle(th)}>as long</span> as real ones
                        </>
                      )}
                    </p>
                    <span className="font-mono text-[10px]" style={{ color: th.muted }}>
                      © 2026 vibelog · Jessi
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 border-t border-line px-4 pb-4 pt-3.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-md font-bold text-ink">
                        {t(th.name)}
                        <span className="ml-1.5 font-mono text-2xs font-medium text-muted">{th.key}</span>
                      </span>
                      <span aria-hidden className="flex gap-1">
                        {[th.bg, th.panel, th.ink, th.accent].map((c) => (
                          <i key={c} className="block size-4 rounded-[4px] border border-line-strong" style={{ background: c }} />
                        ))}
                      </span>
                    </div>
                    <p className="m-0 text-sm text-muted">{t(th.note)}</p>
                    <div className="flex min-w-0 items-center gap-2 rounded-md bg-panel2 py-1.5 pl-3 pr-1.5">
                      <code id={`topic-${th.key}`} className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-ink">
                        {topic}
                      </code>
                      <CopyButton
                        ghost
                        done={done === th.key}
                        label={lang === "ko" ? `${th.name.ko} 테마 topic 복사` : `Copy the ${th.name.en} theme topic`}
                        onClick={() => copy(th.key, topic, document.getElementById(`topic-${th.key}`))}
                      />
                    </div>
                    <span className="text-xs text-muted">
                      {lang === "ko" ? "지금 쓰는 레포: " : "Used by: "}
                      <span className="text-ink-soft">{t(th.uses)}</span>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-6">
          <div className="font-mono text-2xs uppercase tracking-[.08em] text-muted">apply</div>
          <h2 className="text-lg font-bold text-ink">{lang === "ko" ? "테마 적용하는 법" : "Applying a theme"}</h2>
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {STEPS.map((s, i) => (
              <li key={i} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2.5 text-[15px] leading-relaxed text-ink-soft">
                <span className="mt-[3px] grid size-6 place-items-center rounded-full border border-line-strong font-mono text-2xs text-accent">
                  {i + 1}
                </span>
                <span>{t(s)}</span>
              </li>
            ))}
          </ol>
          <p className="m-0 text-sm leading-relaxed text-muted">
            {lang === "ko"
              ? "30분 안에 프로젝트 인식이 topic을 읽고, 그 레포의 다음 쇼츠부터 새 테마로 나옵니다. 이미 만든 쇼츠는 그대로입니다."
              : "Within 30 minutes the project scan picks up the topic, and the repo's next Short uses the new theme. Shorts already made stay as they are."}
          </p>
        </div>
      </section>
      <div aria-live="polite" className="sr-only">
        {live}
      </div>
    </PageContainer>
  );
}
