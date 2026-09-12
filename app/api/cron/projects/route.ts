/**
 * 새 프로젝트 인식 배치. topic `vibelog`를 단 레포가 30분 안에 카드로 뜨는
 * 약속을 지키려면 이 주기가 실제로 돌아야 한다 (GitHub 예약은 4시간까지
 * 밀렸다). 목록이 안 바뀌면 아무것도 커밋하지 않으므로 자주 불러도 된다.
 */
import { dispatch, fromCron } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!fromCron(req)) return new Response("forbidden", { status: 403 });
  return dispatch("projects.yml");
}
