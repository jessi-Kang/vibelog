import type { Metadata } from "next";
import { T } from "@/components/lang";
import { PageContainer } from "@/components/page-container";
import { EmptyState } from "@/components/ui";

// 서비스 워커가 네트워크 실패 때 꺼내는 화면. 미리 캐시해 두므로
// 연결이 없어도 이 페이지만은 뜬다. 검색엔진에는 보일 이유가 없다.
export const metadata: Metadata = {
  title: "연결 없음",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <PageContainer reading>
      <EmptyState
        title={<T ko="지금은 연결이 없습니다" en="You're offline" />}
        titleAs="h1"
        body={
          <T
            ko="데브로그와 쇼츠는 매일 밤 새로 만들어지고, 읽으려면 연결이 필요합니다. 신호가 돌아오면 아래로 다시 시도해 주세요."
            en="Devlogs and shorts are rebuilt every night, so reading them needs a connection. Try again once you're back online."
          />
        }
        action={
          // 스크립트 없이 도는 링크여야 한다 — 오프라인에서는 하이드레이션이
          // 안 끝날 수 있어서 onClick에 기대면 죽은 버튼이 된다.
          // 클라이언트 라우팅(next/link)도 피한다: 진짜 네트워크를 한 번 쳐야 한다.
          <a
            href="/"
            className="hit flex h-8 items-center rounded-sm border border-line bg-panel2 px-3 text-sm font-bold text-ink transition-opacity duration-150 hover:opacity-85 active:scale-[.98]"
          >
            <T ko="다시 시도" en="Try again" /> →
          </a>
        }
      />
    </PageContainer>
  );
}
