import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { EmptyState } from "@/components/ui";

/** 잘못된 주소도 이 사이트의 세계관(다크·존댓말·EmptyState 문법) 안에서 받는다 */
export default function NotFound() {
  return (
    <PageContainer reading>
      <EmptyState
        title="이 주소에는 글이 없습니다"
        body="활동이 없는 날은 글을 건너뛰고, 주소가 바뀌었을 수도 있습니다. 전체 데브로그에서 찾아보세요."
        action={
          <Link
            href="/log"
            className="flex h-8 items-center rounded-sm border border-line bg-panel2 px-3 text-sm font-bold text-ink transition-opacity duration-150 hover:opacity-85"
          >
            전체 데브로그 →
          </Link>
        }
      />
    </PageContainer>
  );
}
