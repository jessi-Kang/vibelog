"use client";
/**
 * 공유 버튼 — 푸터의 조용한 진입점.
 *
 * 폰에서는 OS 공유 시트를 열고(카톡·메시지 등으로 바로 넘어간다), 그게 없는
 * 데스크탑 브라우저에서는 주소를 클립보드에 복사하고 라벨로 알려 준다.
 * 두 경로 다 막힌 환경(권한 차단·비보안 컨텍스트)에서는 조용히 실패하지 않고
 * "복사 실패"를 보여 준다 — 눌렀는데 아무 일도 안 나는 게 제일 나쁘다.
 *
 * 공유 대상은 어느 페이지에서 누르든 **사이트 메인**이다 (Jessi 지시).
 * 푸터는 모든 페이지에 있으니 "이 사이트를 알린다"는 뜻으로 고정한다.
 */
import { useEffect, useRef, useState } from "react";
import { SITE_URL } from "@/lib/site";
import { useLang } from "./lang";

type State = "idle" | "copied" | "failed";

export function ShareLink() {
  const { lang } = useLang(); // 접근 이름도 헤더의 KO/EN을 따른다
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flash = (next: State) => {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  };

  const share = async () => {
    const url = SITE_URL;
    if (navigator.share) {
      try {
        // 주소만 보낸다. 제목·설명을 같이 넘기면 카톡 같은 앱이 그걸 글자로
        // 한 번 붙이고 미리보기 카드에서 또 보여 준다 — "소개 · vibelog -
        // https://..."처럼 애매한 이름이 붙어 나갔다 (Jessi 지적).
        // 이름과 설명은 카드가 말하게 두는 편이 깔끔하다.
        await navigator.share({ url });
      } catch {
        // 사용자가 시트를 닫은 것도 여기로 온다 — 실패로 취급하지 않는다
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("copied");
    } catch {
      flash("failed");
    }
  };

  const label =
    state === "copied"
      ? { ko: "주소가 복사됐습니다", en: "Link copied" }
      : state === "failed"
        ? { ko: "복사하지 못했습니다", en: "Couldn't copy" }
        : { ko: "공유", en: "Share" };

  return (
    <button
      type="button"
      onClick={() => void share()}
      // 아이콘만 (Jessi 지시) — 이름이 글자로 안 남으니 aria-label로 남기고,
      // 결과는 라벨이 바뀌는 것으로 알린다. 탭 영역은 음수 마진으로 푸터 줄
      // 높이를 안 밀면서 넓힌다.
      aria-label={label[lang]}
      className="hit -m-2.5 flex cursor-pointer p-2.5 text-muted transition-colors duration-150 hover:text-ink"
    >
      {/* 복사 결과는 눈으로도 보여야 한다 — 아이콘이 잠깐 체크로 바뀐다 */}
      <svg
        aria-hidden
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={state === "copied" ? "text-accent" : undefined}
      >
        {state === "copied" ? (
          <polyline points="4 12.5 9.5 18 20 6.5" />
        ) : (
          <>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
            <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
          </>
        )}
      </svg>
      {/* 스크린리더에는 결과를 말로 알린다 */}
      <span className="sr-only" aria-live="polite">
        {state === "idle" ? "" : label[lang]}
      </span>
    </button>
  );
}
