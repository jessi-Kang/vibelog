"use client";
/**
 * 공유 버튼 — 푸터의 조용한 진입점.
 *
 * 폰에서는 OS 공유 시트를 열고(카톡·메시지 등으로 바로 넘어간다), 그게 없는
 * 데스크탑 브라우저에서는 주소를 클립보드에 복사하고 라벨로 알려 준다.
 * 두 경로 다 막힌 환경(권한 차단·비보안 컨텍스트)에서는 조용히 실패하지 않고
 * "복사 실패"를 보여 준다 — 눌렀는데 아무 일도 안 나는 게 제일 나쁘다.
 *
 * 공유 대상은 **지금 보고 있는 페이지**다. 글을 읽다 누르면 그 글이,
 * 홈에서 누르면 사이트가 공유된다. 글마다 미리보기 카드가 따로 있으므로
 * (lib/og.tsx) 그 편이 링크를 받는 쪽에 더 쓸모 있다.
 */
import { useEffect, useRef, useState } from "react";
import { T } from "./lang";

type State = "idle" | "copied" | "failed";

export function ShareLink() {
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
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
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

  return (
    <button
      type="button"
      onClick={() => void share()}
      // 탭 영역은 음수 마진으로 푸터 줄 높이를 안 밀면서 세로로 넓힌다
      className="hit -my-2 cursor-pointer py-2 font-mono text-xs text-muted transition-colors duration-150 hover:text-ink"
    >
      {/* 결과는 라벨이 바뀌는 것으로 알린다 — 스크린리더에도 읽히게 live 영역으로 */}
      <span aria-live="polite">
        {state === "copied" ? (
          <T ko="주소 복사됨" en="link copied" />
        ) : state === "failed" ? (
          <T ko="복사 실패" en="copy failed" />
        ) : (
          <T ko="공유" en="share" />
        )}
      </span>
    </button>
  );
}
