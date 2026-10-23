/**
 * blob-cache.ts — 쇼츠 중간 결과(대본 초안, 내레이션 음성)를 Vercel Blob에 두고 다시 쓴다.
 *
 * 다시 만들기는 실행이 끝나야 커밋되므로, 렌더에서 죽으면 그때까지 산 대본·목소리가
 * 러너와 함께 사라졌다. 다음 실행은 같은 것을 또 샀다. 비싼 단계의 결과만 Blob에
 * 남겨 두고, 다음 실행이 같은 것이 필요하면 받아 쓴다.
 *
 * BLOB_READ_WRITE_TOKEN이 없으면 전부 아무 일도 하지 않는다 (저장 없이 매번 산다).
 * 저장·읽기가 실패해도 실행을 막지 않는다 — 그때는 원래대로 새로 만든다.
 */

const hasToken = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** 없거나 못 읽으면 null */
export async function blobGet(pathname: string): Promise<Buffer | null> {
  if (!hasToken()) return null;
  try {
    const { head } = await import("@vercel/blob");
    const meta = await head(pathname);
    // 같은 경로를 덮어쓰는 파일(대본 초안)이 엣지 캐시의 옛 내용으로 오지 않게 올린 시각을 붙인다
    const res = await fetch(`${meta.url}?v=${new Date(meta.uploadedAt).getTime().toString(36)}`);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function blobPut(pathname: string, data: Buffer | string): Promise<void> {
  if (!hasToken()) return;
  try {
    const { put } = await import("@vercel/blob");
    await put(pathname, data, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
  } catch (err) {
    console.warn(`[cache] 저장 실패 — 다음 실행은 새로 만듭니다: ${(err as Error).message.slice(0, 120)}`);
  }
}

export async function blobDel(pathname: string): Promise<void> {
  if (!hasToken()) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(pathname);
  } catch {
    // 지우지 못한 초안은 다음 다시 만들기가 쓴다 — 그 실행이 끝나면 다시 지운다
  }
}

/**
 * 이름이 prefix로 시작하는 파일을 전부 지운다 — 지운 개수. 다시 쓰는 글의 옛 쇼츠 영상·낭독·녹화가
 * 주소로 계속 열리지 않게 한다 (scripts/run.ts --rewrite). 토큰이 없으면 0.
 */
export async function blobDelPrefix(prefix: string): Promise<number> {
  if (!hasToken()) return 0;
  const { list, del } = await import("@vercel/blob");
  let cursor: string | undefined;
  let n = 0;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    if (page.blobs.length) {
      await del(page.blobs.map((b) => b.url));
      n += page.blobs.length;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return n;
}
