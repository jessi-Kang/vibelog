/**
 * 영상 번들이 노드 전용 모듈을 끌고 가지 않는지 검사한다.
 *
 * Remotion은 `video/src/*`를 **브라우저용으로** webpack 번들한다. 거기서
 * 가져오는 파일이 `node:fs` 같은 것을 import하면 렌더가 번들 단계에서 죽는다
 * (`UnhandledSchemeError: Reading from "node:fs" is not handled by plugins`).
 *
 * 이걸 타입체크는 못 잡는다. `npx tsc --noEmit -p video/tsconfig.json`이 통과한
 * 커밋이 Actions에서 세 번 연속 실패했다 — scripts/shorts-types.ts(영상이
 * 타입을 가져오는 파일)에 파일 읽는 검사기를 넣으면서 node:fs를 import했다.
 *
 * 그래서 **import를 따라가며** 본다: video/src에서 시작해 상대경로 import를
 * 훑고, 그 안에 노드 전용 모듈이 있으면 지적한다. 번들을 돌리는 것이 확실한
 * 검사지만(수십 초) 이건 한순간이라 커밋 전에 부담 없이 돌릴 수 있다.
 *
 *   npx tsx scripts/check-video-imports.ts
 */
import fs from "node:fs";
import path from "node:path";

/** 브라우저에 없는 것들 — 이 이름이나 `node:` 접두어면 지적 */
const NODE_ONLY = new Set([
  "fs",
  "path",
  "os",
  "child_process",
  "crypto",
  "http",
  "https",
  "net",
  "stream",
  "zlib",
  "url",
  "worker_threads",
  "readline",
  "process",
]);

export interface ImportFinding {
  file: string;
  module: string;
  via: string[];
}

/** `import ... from "x"` / `export ... from "x"` / `require("x")`의 x들 */
function importsOf(src: string): { spec: string; typeOnly: boolean }[] {
  const out: { spec: string; typeOnly: boolean }[] = [];
  const re =
    /(?:^|\n)\s*(?:import|export)(\s+type)?\s+(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g;
  for (const m of src.matchAll(re))
    out.push({ spec: m[2], typeOnly: Boolean(m[1]) });
  for (const m of src.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g))
    out.push({ spec: m[1], typeOnly: false });
  return out;
}

function resolve(from: string, spec: string): string | null {
  const base = path.resolve(path.dirname(from), spec);
  for (const ext of [
    "",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    "/index.ts",
    "/index.tsx",
  ]) {
    const f = base + ext;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}

export function checkVideoImports(root = "video/src"): ImportFinding[] {
  const dir = path.resolve(process.cwd(), root);
  if (!fs.existsSync(dir)) return [];
  const seen = new Set<string>();
  const out: ImportFinding[] = [];
  const walk = (file: string, via: string[]) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = fs.readFileSync(file, "utf8");
    for (const { spec, typeOnly } of importsOf(src)) {
      // `import type`은 지워지므로 번들에 남지 않는다
      if (typeOnly) continue;
      const bare = spec.replace(/^node:/, "");
      if (spec.startsWith("node:") || NODE_ONLY.has(bare)) {
        out.push({
          file: path.relative(process.cwd(), file),
          module: spec,
          via,
        });
        continue;
      }
      if (!spec.startsWith(".")) continue; // 패키지는 여기서 안 본다
      const next = resolve(file, spec);
      if (next) walk(next, [...via, path.relative(process.cwd(), file)]);
    }
  };
  for (const e of fs.readdirSync(dir))
    if (/\.(ts|tsx)$/.test(e)) walk(path.join(dir, e), []);
  return out;
}

if (process.argv[1]?.endsWith("check-video-imports.ts")) {
  const findings = checkVideoImports();
  if (findings.length === 0) {
    console.log("영상 번들: 노드 전용 모듈 없음");
  } else {
    for (const f of findings)
      console.log(
        `  ${f.file}  ${f.module}${f.via.length ? `  (경유: ${f.via.join(" → ")})` : ""}`,
      );
    console.log(
      "\n영상은 브라우저용으로 번들된다 — 위 모듈은 렌더를 번들 단계에서 죽인다.",
    );
    process.exitCode = 1;
  }
}
