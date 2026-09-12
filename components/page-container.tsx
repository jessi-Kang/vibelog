import type { ReactNode } from "react";

/** 페이지 본문 컨테이너 — 모바일 430 / 넓은 화면 1120, 데브로그 본문만 680 */
export function PageContainer({
  reading,
  children,
}: {
  reading?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      id="main"
      className={`mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-10 px-5 pb-10 pt-5 max-[359px]:px-4 md:px-6 md:pb-14 md:pt-7 lg:gap-12 lg:px-8 lg:pb-[72px] lg:pt-8 ${
        reading ? "md:max-w-[680px]" : "md:max-w-[1120px]"
      }`}
    >
      {children}
    </main>
  );
}
