/**
 * 서버에서 GitHub를 읽는 공용 함수 — `/api/commits`(홈)와 `/api/repo-stats`(프로젝트 상세)가 같이 쓴다.
 *
 * 토큰(`GH_PAT`/`GITHUB_TOKEN`)으로 읽어야 비공개 레포가 보인다. 브라우저가 GitHub를
 * 직접 부르던 상세 페이지는 비공개 레포에서 늘 404였다 (10/11 지적).
 */
const API = "https://api.github.com";

const TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;

function headers(withToken: boolean): HeadersInit {
  return {
    accept: "application/vnd.github+json",
    ...(withToken && TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
  };
}

export function repoOf(repoUrl: string): string | null {
  return repoUrl.match(/github\.com\/([^/]+\/[^/]+)/)?.[1] ?? null;
}

export async function ghGet(path: string): Promise<Response> {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    headers: headers(true),
    signal: AbortSignal.timeout(8000),
  });
  if (res.ok) return res;
  // 토큰이 만료·오설정이면 401/403이 온다. 공개 레포는 토큰 없이도 읽히므로 한 번 더
  // 맨손으로 물어본다 — 잘못된 토큰 하나가 기능을 죽이면 안 된다
  if (TOKEN && (res.status === 401 || res.status === 403)) {
    const plain = await fetch(url, {
      headers: headers(false),
      signal: AbortSignal.timeout(8000),
    });
    if (plain.ok) return plain;
    throw new Error(`GitHub ${res.status}/${plain.status} ${path}`);
  }
  throw new Error(`GitHub ${res.status} ${path}`);
}

/** per_page=1의 Link 헤더 마지막 페이지 번호가 총 개수 (collect.ts와 같은 기법) */
export function countFromLink(res: Response, bodyLen: number): number {
  const last = res.headers.get("link")?.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return last ? Number(last[1]) : bodyLen;
}

export async function countSince(repo: string, since?: string): Promise<number> {
  const q = since ? `since=${encodeURIComponent(since)}&` : "";
  const res = await ghGet(`/repos/${repo}/commits?${q}per_page=1`);
  return countFromLink(res, ((await res.json()) as unknown[]).length);
}
