/**
 * icons.ts — 소개 글이 고른 아이콘 이름을 Tabler outline 세트에서 찾아 그리는 좌표로 바꾼다.
 *
 * 모델은 이름 후보를 몇 개 낸다("spy", "detective", "search"). 세트 5,198개 이름을 통째로
 * 넘기면 호출마다 2만 토큰이 들어서, 후보를 받아 여기서 맞춘다: 정확히 같은 이름 → 그 낱말로
 * 시작하는 이름. 어느 것도 없으면 아이콘 없이 둔다 — 지어낸 이름으로 빈칸이 생기지 않게.
 */
import fs from "node:fs";
import path from "node:path";
import { safeIcon, type IconPath, type ProjectIcon } from "../lib/project-icon";

interface IconSet {
  icons: Record<string, { body: string }>;
  aliases?: Record<string, { parent: string }>;
}

let cache: IconSet | null = null;
function tabler(): IconSet {
  cache ??= JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "node_modules/@iconify-json/tabler/icons.json"), "utf8"),
  ) as IconSet;
  return cache;
}

/** 아이콘 하나를 좌표 목록으로 — path만으로 된 것만 받는다 (원·사각형·defs가 든 몇 개는 뺀다) */
export function iconPaths(name: string): IconPath[] | null {
  const set = tabler();
  const real = set.icons[name] ? name : set.aliases?.[name]?.parent;
  const body = real ? set.icons[real]?.body : undefined;
  if (!body || name.endsWith("-filled")) return null;
  if (/<(circle|rect|defs|use|ellipse|line|polyline|polygon)\b/.test(body)) return null;
  const paths: IconPath[] = [];
  for (const m of body.matchAll(/<path\b([^>]*)\/>/g)) {
    const d = m[1].match(/\bd="([^"]+)"/)?.[1];
    if (!d) return null;
    paths.push({ d, ...(/fill="currentColor"/.test(m[1]) ? { filled: true } : {}) });
  }
  return paths.length ? paths : null;
}

export function pickIcon(candidates: unknown): ProjectIcon | null {
  if (!Array.isArray(candidates)) return null;
  const names = Object.keys(tabler().icons).filter((n) => !n.endsWith("-filled"));
  const clean = candidates
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim().toLowerCase().replace(/^tabler:/, "").replace(/[^a-z0-9-]/g, ""))
    .filter(Boolean)
    .slice(0, 6);
  const tries = [
    ...clean,
    ...clean.flatMap((c) => names.filter((n) => n.startsWith(`${c}-`)).slice(0, 1)),
  ];
  for (const n of tries) {
    const paths = iconPaths(n);
    if (paths) return safeIcon({ name: `tabler:${n}`, paths });
  }
  return null;
}
