"use client";
/** 소개 — 이 사이트에서 유일하게 사람이 쓴 글. 언어는 헤더의 전역 설정을 따른다 */
import { useLang } from "@/components/lang";
import { PageContainer } from "@/components/page-container";
import { SectionHeader } from "@/components/ui";

interface Section {
  label: string;
  title: { ko: string; en: string };
  body: { ko: string; en: string }[];
}

const INTRO = {
  ko: "안녕하세요. 저는 제시, 바이브 코딩을 즐기는 바이브 코더입니다. 여기는 제가 만들고 있는 것들의 기록이죠. 여기 올라오는 글은 제가 쓰지 않습니다. 커밋이 곧 콘텐츠가 되도록, 파이프라인이 매일 밤 대신 씁니다. 단, 이 소개만은 예외입니다. 부디 같이 즐겨주세요.",
  en: "Hi, I'm Jessi — a vibe coder who enjoys vibe coding. This is a record of the things I'm building. I don't write the posts here: so that commits become the content, a pipeline writes them for me every night. Only this introduction is the exception. I hope you'll enjoy it with me.",
};

const SECTIONS: Section[] = [
  {
    label: "why",
    title: { ko: "왜 만들었나", en: "Why this exists" },
    body: [
      {
        ko: "바이브 코딩으로 이것저것 만들다 보면, 만드는 과정이 커밋 기록 속에만 남고 흩어집니다. 기록을 사람이 쓰자니 하루 이틀은 쓰다가 결국 안 쓰게 되고요.",
        en: "When you vibe-code your way through projects, the making of them survives only inside commit logs, scattered. And if a human has to write the journal, it lasts a day or two before it stops.",
      },
      {
        ko: "그래서 기록을 아예 기계에 맡기는 실험을 시작했습니다. 저는 평소처럼 만들기만 하고, 매일 밤 11시에 자동화가 그날의 커밋을 읽어 제작기를 대신 씁니다. 이 사이트가 그 실험의 첫 번째 대상이고, 이 사이트를 만드는 과정 자체가 첫 콘텐츠입니다.",
        en: "So this is an experiment in handing the journal to a machine. I just build as usual; every night at 11, automation reads the day's commits and writes the build log for me. This site is the experiment's first subject — the process of building it is the first content.",
      },
    ],
  },
  {
    label: "how",
    title: { ko: "어떻게 돌아가나", en: "How it works" },
    body: [
      {
        ko: "매일 밤 자동화가 그날의 커밋과 작업 기록을 모아, AI가 데브로그를 한국어·영어로 씁니다. 같은 밤에 그 글을 30~45초 세로 영상으로도 만듭니다 — 대본을 뽑고, 미리 복제해 둔 제 목소리로 내레이션을 입히고, 실제 배포된 화면을 녹화해 합칩니다.",
        en: "Each night, automation gathers the day's commits and work records, and AI writes the devlog in Korean and English. The same night it turns the post into a 30–45 second vertical video — drafting a script, narrating it in a cloned copy of my voice, and stitching in recordings of the actual deployed site.",
      },
      {
        ko: "글도 영상도 사람이 만들지 않습니다. 품질이 마음에 안 드는 날만 버튼 하나로 다시 만들게 합니다.",
        en: "No human makes the posts or the videos. Only on days when the quality isn't right do I press one button to have them remade.",
      },
      {
        ko: "새 프로젝트를 등록하는 데 필요한 건 레포에 붙이는 표식(topic) 하나뿐입니다. 프로젝트 쪽에는 아무것도 설치하지 않습니다. 표식이 붙은 레포에 커밋이 생기면, 그날 밤 카드가 생기고 제작기가 쌓이기 시작합니다.",
        en: "Registering a new project takes one label (a repo topic) — nothing gets installed in the project itself. Once a labeled repo has commits, a card appears that night and its build log starts piling up.",
      },
    ],
  },
  {
    label: "next",
    title: { ko: "뭘 하고 싶나", en: "Where it's going" },
    body: [
      {
        ko: "지금은 글과 영상이 이 사이트에 자동으로 쌓이는 단계입니다. 다음은 올리기 전에 미리보기로 승인만 누르는 큐, 그 다음은 유튜브 쇼츠와 인스타 릴스까지 자동 게시입니다. 반응 데이터가 다시 이 사이트의 현황판으로 돌아오는 것까지가 그림입니다.",
        en: "Right now, posts and videos pile up here automatically. Next comes an approval queue — preview, tap approve — then automatic publishing to YouTube Shorts and Instagram Reels. The full picture ends with reaction data flowing back into this site's dashboard.",
      },
      {
        ko: "새 프로젝트를 시작하면 카드가 하나 늘어나고, 그 프로젝트의 제작기도 같은 방식으로 자동으로 쌓입니다.",
        en: "When I start a new project, one more card appears — and its build log starts piling up the same way.",
      },
    ],
  },
];

export function AboutClient() {
  const { lang } = useLang(); // 전역 설정 — 헤더의 KO/EN 스위치가 바꾼다
  return (
    <PageContainer>
      <section className="mx-auto flex w-full max-w-[680px] flex-col gap-10">
        <div className="flex flex-col gap-3.5">
          <SectionHeader title={lang === "ko" ? "소개" : "About"} />
          <p className="text-[15px] leading-relaxed text-ink-soft">{INTRO[lang]}</p>
        </div>
        {SECTIONS.map((s) => (
          <div key={s.label} className="flex flex-col gap-3 border-t border-line pt-6">
            <div className="font-mono text-2xs uppercase tracking-[.08em] text-muted">
              {s.label}
            </div>
            <h2 className="text-lg font-bold text-ink">{s.title[lang]}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-ink-soft">
                {p[lang]}
              </p>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-6 font-mono text-2xs text-muted">
          <p className="m-0">
            {lang === "ko"
              ? "만든 사람 · Jessi — 코딩과 승인만 합니다"
              : "Made by Jessi — who only codes and approves"}
          </p>
          {/* 아이콘만 (Jessi 지시). 이름이 글자로 안 보이니 aria-label로 남기고,
              탭 영역은 음수 마진으로 레이아웃을 안 밀면서 넓힌다 */}
          <a
            href="https://www.linkedin.com/in/ji-hyun-kang-53276696"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="hit -m-2 flex p-2 text-muted transition-colors duration-150 hover:text-ink"
          >
            <svg
              aria-hidden
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
            </svg>
          </a>
        </div>
      </section>
    </PageContainer>
  );
}
