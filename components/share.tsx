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
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
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
    const url = SITE_URL;
    if (navigator.share) {
      try {
        await navigator.share({ title: SITE_NAME, text: SITE_DESCRIPTION, url });
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
