/**
 * 레드팀 기계 검사 — 사람이 판단할 것만 남기고 반복 가능한 것은 여기서 센다.
 *
 *   node .claude/skills/redteam/scripts/probe.mjs            # 코드만
 *   node .claude/skills/redteam/scripts/probe.mjs --live      # 배포도 찔러 본다
 *
 * 여기서 하지 않는 것: 비용이 나는 호출(워크플로 띄우기·TTS), 남의 서비스.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import ts from "typescript";

const LIVE = process.argv.includes("--live");
const SITE = process.env.REDTEAM_SITE || "https://vibelog.space";
const out = [];
const add = (level, title, detail) => out.push({ level, title, detail });

const read = (f) => {
  try {
    return fs.readFileSync(f, "utf8");
  } catch {
    return "";
  }
};
const walk = (dir, hit = []) => {
  if (!fs.existsSync(dir)) return hit;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    if (e.isDirectory()) walk(p, hit);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) hit.push(p);
  }
  return hit;
};

const files = ["app", "components", "lib", "scripts"].flatMap((d) => walk(d));

// 1. 생성된 내용이 <script> 안에 문자열로 들어가는 자리.
//    JSON.stringify는 `<`와 `/`를 이스케이프하지 않는다 — 제목에 </script>가
//    있으면 태그가 닫히고 그 뒤가 마크업이 된다.
//
//    **정규식 말고 타입스크립트 파서로 읽는다.** 처음엔 정규식으로 떴는데
//    200자 상한 때문에 정작 뚫린 자리를 놓치고, 문자열을 걷어내다 엉긴 조각을
//    변수 이름이라고 보고했다. 파서는 상수와 바깥에서 온 값을 정확히 가른다.
{
  const escapes = JSON.stringify({ a: "x</script>y" }).includes("</script>");
  for (const f of files) {
    const src = read(f);
    if (!src.includes("dangerouslySetInnerHTML")) continue;
    const sf = ts.createSourceFile(
      f,
      src,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node) => {
      const isAttr =
        ts.isJsxAttribute(node) &&
        node.name.getText() === "dangerouslySetInnerHTML";
      if (isAttr && node.initializer && ts.isJsxExpression(node.initializer)) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        let stringify = false;
        let safeHelper = false; // lib/ld-json.ts의 ldJson — `<`를 막아 둔 자리
        const outside = new Set();
        const scan = (n) => {
          if (ts.isCallExpression(n)) {
            const callee = n.expression.getText();
            // 이 레포가 고른 안전한 길. `<`를 \\u003c로 바꿔 태그가 일찍 닫히지
            // 않게 한다 (lib/ld-json.ts). 이걸 모르면 고친 코드를 계속 지적해
            // 진짜 결함이 그 소음에 묻힌다.
            if (callee === "ldJson") safeHelper = true;
            if (/JSON\.stringify/.test(callee)) stringify = true;
            if (callee === "ldJson" || /JSON\.stringify/.test(callee)) {
              n.arguments.forEach(scan); // 호출 이름은 값이 아니다
              return;
            }
          }
          // 값이 바깥에서 오는가. 전부 대문자면 우리 상수다
          if (ts.isPropertyAccessExpression(n)) {
            const t = n.getText();
            const head = t.split(".")[0];
            if (!/^[A-Z0-9_]+$/.test(head)) outside.add(t);
            return; // 안쪽(d, title)을 또 세지 않는다
          }
          if (ts.isIdentifier(n)) {
            const parent = n.parent;
            const isKey =
              parent &&
              (ts.isPropertyAssignment(parent) ||
                ts.isShorthandPropertyAssignment(parent)) &&
              parent.name === n;
            if (!isKey && !/^[A-Z0-9_]+$/.test(n.text)) outside.add(n.text);
            return;
          }
          n.forEachChild(scan);
        };
        scan(node.initializer);
        if (safeHelper && !stringify) {
          add(
            "통과",
            "<script>에 이스케이프를 거쳐 들어간다",
            `${f}:${line} — ldJson() 사용${outside.size ? ` (값: ${[...outside].join(", ")})` : ""}`,
          );
        } else if (outside.size === 0) {
          add(
            "기록만",
            "<script>에 상수만 들어간다",
            `${f}:${line} — 바깥에서 오는 값 없음`,
          );
        } else if (stringify && escapes) {
          add(
            "높음",
            "JSON.stringify로 <script>에 내용을 넣는다 (스크립트 이탈)",
            `${f}:${line} — 끼워지는 값: ${[...outside].join(", ")}. </script>가 들어오면 태그가 닫힌다. 이 사이트의 제목은 모델이 쓰고 사람 없이 발행된다.`,
          );
        } else if (!stringify) {
          add(
            "중간",
            "dangerouslySetInnerHTML에 변수가 들어간다",
            `${f}:${line} — ${[...outside].join(", ")}`,
          );
        }
      }
      node.forEachChild(visit);
    };
    visit(sf);
  }
}

// 2. 마크다운에서 raw HTML을 켰는지
for (const f of files) {
  if (/rehype-?[Rr]aw/.test(read(f)))
    add(
      "높음",
      "마크다운 raw HTML이 켜져 있다",
      `${f} — 생성된 본문이 HTML이 된다`,
    );
}

// 3. 워크플로 셸 주입: run: 블록 **안**의 ${{ }}만.
//    처음엔 정규식으로 블록을 떴는데 바로 아래 env:까지 삼켜서, env로 안전하게
//    받고 있는 입력을 주입이라고 잘못 짚었다. 들여쓰기로 블록을 끊는다.
{
  const dir = ".github/workflows";
  const wf = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((n) => /\.ya?ml$/.test(n))
    : [];
  for (const n of wf) {
    const f = path.join(dir, n);
    const lines = read(f).split("\n");
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(\s*)-?\s*run:\s*\|?\s*(.*)$/);
      if (!m) continue;
      const indent = m[1].length;
      const block = [m[2]];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === "") {
          block.push("");
          continue;
        }
        const ind = lines[j].length - lines[j].trimStart().length;
        if (ind <= indent) break; // 형제 키(env: 등)에서 끊는다
        block.push(lines[j]);
      }
      const bad = [
        ...block
          .join("\n")
          .matchAll(/\$\{\{\s*(inputs|github\.event)[^}]*\}\}/g),
      ];
      if (bad.length)
        add(
          "높음",
          "워크플로 run: 안에 외부 입력이 직접 들어간다 (셸 주입)",
          `${f}:${i + 1} — ${bad.map((b) => b[0]).join(", ")}. env:로 받아 "$VAR"로 쓸 것`,
        );
    }
    const src = read(f);
    if (/pull_request_target|workflow_run/.test(src))
      add(
        "중간",
        "pull_request_target/workflow_run 사용",
        `${f} — 시크릿 + 외부 코드 체크아웃이 겹치는지 확인`,
      );
  }
}

// 4. 클라이언트에 노출되는 환경변수
for (const f of files) {
  for (const m of read(f).matchAll(/process\.env\.(NEXT_PUBLIC_\w+)/g))
    add(
      "기록만",
      "클라이언트로 나가는 환경변수",
      `${f} — ${m[1]} (공개값이어야 한다)`,
    );
}

// 5. 커밋된 비밀
{
  const pat =
    /(ghp_|github_pat_|sk-ant-|xoxb-|AIza|vercel_blob_rw_)[A-Za-z0-9_-]{8,}/;
  let hits = 0;
  for (const f of files.concat(["README.md", "CLAUDE.md"]))
    if (pat.test(read(f))) {
      hits++;
      add(
        "높음",
        "비밀로 보이는 문자열이 파일에 있다",
        `${f} — 값은 옮겨 적지 말 것`,
      );
    }
  if (!hits) add("통과", "커밋된 비밀 없음", "토큰 접두어 패턴 없음");
  try {
    const tracked = execSync("git ls-files", { encoding: "utf8" });
    const env = tracked.split("\n").filter((l) => /(^|\/)\.env/.test(l));
    if (env.length) add("높음", ".env가 추적되고 있다", env.join(", "));
    else add("통과", ".env 추적 없음", ".gitignore에 .env* 있음");
  } catch {}
}

// 6. 라이브 — 읽기만 한다
if (LIVE) {
  const get = async (p, headers = {}) => {
    const res = await fetch(SITE + p, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    return { status: res.status, headers: res.headers, body: await res.text() };
  };
  const SEC = [
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "strict-transport-security",
  ];
  try {
    const home = await get("/");
    const missing = SEC.filter((h) => !home.headers.get(h));
    if (missing.length)
      add(
        "중간",
        "보안 응답 헤더가 없다",
        `${missing.join(", ")} — CSP가 없으면 1번 같은 주입이 그대로 실행된다`,
      );
    for (const p of ["/api/cron/devlog", "/api/cron/projects"]) {
      const anon = await get(p);
      const wrong = await get(p, { authorization: "Bearer wrong-on-purpose" });
      if (anon.status < 400)
        add(
          "높음",
          "크론 라우트가 익명 호출을 받는다",
          `${p} → ${anon.status}`,
        );
      const leak = /설정 완료|CRON_SECRET|GH_PAT|없습니다/.test(anon.body);
      if (leak)
        add(
          "중간",
          "크론 라우트가 설정 상태를 익명에게 알려 준다",
          `${p} → ${anon.status} "${anon.body.trim().slice(0, 60)}…"`,
        );
      if (wrong.status < 400)
        add("높음", "잘못된 토큰이 통과한다", `${p} → ${wrong.status}`);
    }
    const commits = await get("/api/commits");
    if (/ghp_|github_pat_|authorization/i.test(commits.body))
      add("높음", "/api/commits 응답에 토큰 흔적", "본문 확인 필요");
  } catch (e) {
    add("기록만", "라이브 검사 실패", String(e).slice(0, 120));
  }
}

const ORDER = ["높음", "중간", "낮음", "기록만", "통과"];
out.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));
for (const f of out)
  console.log(`[${f.level}] ${f.title}\n        ${f.detail}`);
const bad = out.filter((f) => f.level === "높음").length;
console.log(`\n높음 ${bad}건 / 전체 ${out.length}건`);
process.exitCode = bad > 0 ? 1 : 0;
