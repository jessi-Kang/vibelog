"use client";

import { PageContainer } from "@/components/page-container";
import { EmptyState } from "@/components/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer reading>
      <EmptyState
        title="화면을 그리다 문제가 생겼습니다"
        body="일시적인 오류일 수 있습니다. 다시 시도해도 반복되면 다음 실행에서 콘텐츠가 다시 만들어질 때 해결되는 경우가 많습니다."
        action={
          <button
            type="button"
            onClick={() => reset()}
            className="h-8 cursor-pointer rounded-sm border border-line bg-panel2 px-3 text-sm font-bold text-ink transition-opacity duration-150 hover:opacity-85 active:scale-[.98]"
          >
            다시 시도
          </button>
        }
      />
    </PageContainer>
  );
}
