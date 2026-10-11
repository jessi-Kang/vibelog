/**
 * 메일 맨 아래 "받지 않기" 링크. 로그인 없이 누를 수 있어야 하므로 링크에 서명을 넣었다
 * (lib/mail.ts). GET은 확인 화면만, 실제로 끄는 것은 POST — 메일 앱이 링크를 미리 열어 보는
 * 것만으로 꺼지면 안 된다. 메일 앱의 "구독 취소" 단추(List-Unsubscribe-Post)도 POST로 온다.
 */
import { db } from "@/lib/db";
import { readUnsubscribe } from "@/lib/mail";

function page(title: string, body: string): Response {
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;background:#0a0e14;color:#f3efe6;font-family:-apple-system,'Noto Sans KR',sans-serif;word-break:keep-all;display:grid;place-items:center;min-height:100vh;padding:0 16px}main{max-width:360px;display:flex;flex-direction:column;gap:16px}h1{font-size:20px;margin:0}p{margin:0;color:#c9cfd8;line-height:1.7}button{min-height:44px;border:0;border-radius:10px;background:#5ee1c3;color:#06261f;font:inherit;font-weight:700;cursor:pointer}a{color:#5ee1c3}</style></head>
<body><main>${body}</main></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

function read(req: Request) {
  const q = new URL(req.url).searchParams;
  return readUnsubscribe(q.get("p") ?? "", q.get("s") ?? "");
}

export async function GET(req: Request) {
  const t = read(req);
  if (!t) return page("vibelog", `<h1>링크가 맞지 않습니다</h1><p><a href="/">vibelog로 가기</a></p>`);
  const what = t.kind === "admin" ? "새 댓글 메일" : "답글 메일";
  return page("vibelog", `<h1>${what}을 그만 받을까요?</h1><p>사이트 머리글의 종 알림은 그대로 옵니다.</p><form method="post"><button style="width:100%">그만 받기</button></form>`);
}

export async function POST(req: Request) {
  const t = read(req);
  if (!t) return page("vibelog", `<h1>링크가 맞지 않습니다</h1>`);
  const sql = await db();
  if (t.kind === "admin") await sql`update users set mail_admin = false where id = ${t.userId}`;
  else await sql`update users set mail_replies = false where id = ${t.userId}`;
  return page("vibelog", `<h1>이제 메일을 보내지 않습니다</h1><p>다시 받으려면 로그인한 뒤 내 이름을 눌러 켜면 됩니다.</p><p><a href="/">vibelog로 가기</a></p>`);
}
