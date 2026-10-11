/**
 * homepage.ts — live 전 사이트 주소를 공개 파일에 남기지 않는다.
 *
 * 이 레포는 공개다. 그래서 `content/` 밑 파일과 Actions 로그를 누구나 본다. 사이트
 * 화면에서는 live일 때만 주소를 걸지만(lib/public-homepage.ts), 그 주소가
 * projects.json·쇼츠 JSON·쇼츠 마지막 장면의 주소 버튼에 그대로 들어가 있었다
 * (10/11 점검 — lie-detective.vercel.app이 셋 다에 있었다).
 *
 * 쇼츠 녹화에는 주소가 있어야 하므로 버리지는 않는다. live가 아닌 주소는
 * `.private/homepages.json`(커밋하지 않는 파일)에 두고, 같은 실행 안의 대본·녹화가
 * 거기서 읽는다. 쇼츠만 다시 만드는 실행처럼 그 파일이 없는 새 작업 공간에서는
 * GitHub·Vercel에 다시 물어 찾는다 (collect.ts lookupHomepage).
 */
import fs from "node:fs";
import path from "node:path";
import { lookupHomepage } from "./collect";

const PRIVATE_FILE = path.join(process.cwd(), ".private", "homepages.json");

/** 공개해도 되는 주소인가 — live일 때만. lib/public-homepage.ts와 같은 기준 */
export function isPublicStatus(status: string | undefined): boolean {
  return status === "live";
}

/** 이 실행이 찾은 주소를 커밋하지 않는 파일에 적어 둔다 */
export function savePrivateHomepages(map: Record<string, string>): void {
  fs.mkdirSync(path.dirname(PRIVATE_FILE), { recursive: true });
  fs.writeFileSync(PRIVATE_FILE, JSON.stringify(map, null, 2) + "\n");
}

function readPrivate(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(PRIVATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

/** 녹화에 쓸 실제 주소 — 공개 목록 → 이 실행의 비공개 파일 → GitHub·Vercel에 다시 물음 */
export async function resolveHomepage(repo: string, publicHomepage?: string): Promise<string> {
  if (publicHomepage) return publicHomepage;
  const cached = readPrivate()[repo];
  if (cached) return cached;
  try {
    return (await lookupHomepage(repo)) ?? "";
  } catch {
    return "";
  }
}
