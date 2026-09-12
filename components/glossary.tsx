"use client";
/**
 * 용어 주석 — 본문은 그대로 두고, 어려운 말에만 표시를 단다 (Jessi 지시:
 * "본래 문장은 그대로 두고 어려우면 주석을 읽도록").
 *
 * 이 사이트는 커밋·레포·데브로그 같은 말 위에 서 있는데, 그 말을 모르면
 * 홈의 "오늘 커밋 21"부터 안 읽힌다. 그렇다고 문장을 쉽게 고치면 글이
 * 설명서가 된다 — 그래서 문장은 두고 주석만 붙인다.
 *
 * 마우스 올리기(hover)로는 안 연다. 폰에서 안 되는 동작이고, 이 사이트는
 * 모바일이 먼저다. 누르면 그 문단 바로 아래에 펼쳐진다 — 페이지 끝으로
 * 내려갔다 돌아오는 각주보다 읽던 자리를 안 잃는다.
 *
 * 본문에 `[[commit]]`처럼 열쇠말을 박아 두면 그 자리에 표시가 그려진다.
 * 보이는 낱말은 언어별로 아래 표에서 가져온다 — 문장은 KO/EN 따로 쓰고
 * 주석은 한 곳에서 관리한다.
 */
import { useState, type ReactNode } from "react";
import { useLang, type Lang } from "./lang";

interface Entry {
  term: string;
  note: string;
}

const GLOSSARY: Record<string, Record<Lang, Entry>> = {
  commit: {
    ko: {
      term: "커밋",
      note: '작업을 한 덩어리씩 저장하는 지점입니다. "여기까지 했다"를 남기는 표시라고 보시면 됩니다 — 하루에 백 번 넘게 남기는 날도 있습니다. 홈에 있는 "오늘 커밋 21"은 오늘 스물한 번 저장했다는 뜻이고, 그 아래 격자는 그걸 시간대별로 늘어놓은 것입니다.',
    },
    en: {
      term: "commits",
      note: 'A commit is a save point for a chunk of work — a marker that says "I got this far." Some days there are more than a hundred. So "21 commits today" on the home page means twenty-one save points today, and the grid below it lays them out by hour.',
    },
  },
  pipeline: {
    ko: {
      term: "파이프라인",
      note: "사람이 누르지 않아도 정해진 순서대로 돌아가는 자동 작업 묶음입니다. 여기서는 매일 밤 커밋을 읽어 글을 쓰고 영상까지 만들어 올리는 과정 전체를 말합니다.",
    },
    en: {
      term: "pipeline",
      note: "A chain of steps that runs itself, in order, without anyone pressing a button. Here it means the whole nightly run: read the commits, write the post, make the video, publish.",
    },
  },
  devlog: {
    ko: {
      term: "데브로그",
      note: "만드는 과정을 적은 글입니다. 개발(dev)과 기록(log)을 붙인 말이고, 이 사이트에 매일 밤 프로젝트마다 한 편씩 올라오는 게 이겁니다.",
    },
    en: {
      term: "devlog",
      note: "A build log — dev + log. A post about the making of something. That's what shows up here every night, one per project.",
    },
  },
  repo: {
    ko: {
      term: "레포",
      note: "프로젝트 하나가 통째로 들어 있는 폴더입니다(repository). 만든 것도, 거기 쌓인 저장 기록도 전부 여기 있습니다.",
    },
    en: {
      term: "repo",
      note: "Short for repository — the folder that holds one whole project: the work itself and every save point in it.",
    },
  },
  topic: {
    ko: {
      term: "표식(topic)",
      note: "폴더에 붙이는 이름표입니다. 이 사이트는 'vibelog'라는 이름표가 붙은 폴더만 찾아 읽습니다 — 그래서 새 프로젝트를 등록하는 일이 이름표 하나 붙이는 것으로 끝납니다.",
    },
    en: {
      term: "topic",
      note: "A label you stick on a folder. This site only reads folders labelled 'vibelog' — which is why registering a new project is just adding one label.",
    },
  },
};

/** 열린 주석은 페이지에 하나. 문단마다 제 것만 펼친다 */
export function useGlossary() {
  return useState<string | null>(null);
}

/**
 * 본문 한 문단 + 그 문단에서 열린 주석.
 * `[[key]]`를 표시로 바꿔 그린다. 표시가 없으면 평범한 문단이다.
 */
export function AnnotatedText({
  text,
  open,
  onToggle,
  className,
}: {
  text: string;
  open: string | null;
  onToggle: (key: string | null) => void;
  className?: string;
}): ReactNode {
  const { lang } = useLang();
  const parts = text.split(/\[\[(\w+)\]\]/g);
  const keys: string[] = [];
  const nodes = parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const entry = GLOSSARY[part]?.[lang];
    if (!entry) return part;
    keys.push(part);
    const isOpen = open === part;
    return (
      <button
        key={`${part}-${i}`}
        type="button"
        aria-expanded={isOpen}
        aria-controls={`note-${part}`}
        onClick={() => onToggle(isOpen ? null : part)}
        className={`cursor-pointer border-b border-dotted underline-offset-4 transition-colors duration-150 ${
          isOpen
            ? "border-accent text-accent"
            : "border-muted text-ink hover:border-ink hover:text-ink"
        }`}
      >
        {entry.term}
      </button>
    );
  });

  const openHere = open && keys.includes(open) ? GLOSSARY[open]?.[lang] : null;

  return (
    <>
      <p className={className}>{nodes}</p>
      {openHere && open ? (
        <div
          id={`note-${open}`}
          role="note"
          // 왼쪽 강조 막대는 안 쓴다 — 흔한 장식이고, 용어 이름이 이미 라벨로 있다
          className="flex flex-col gap-1 rounded-sm bg-panel2 px-3.5 py-3"
        >
          <span className="font-mono text-2xs uppercase tracking-[.08em] text-accent">
            {openHere.term}
          </span>
          <span className="text-base leading-relaxed text-ink-soft">
            {openHere.note}
          </span>
        </div>
      ) : null}
    </>
  );
}
