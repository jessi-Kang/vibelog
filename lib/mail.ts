/**
 * 댓글 알림 메일 — 시안 docs/post-comments.html ⑤ (10/11 승인).
 *
 * 두 가지만 보낸다: Jessi에게 새 댓글, 댓글 쓴 사람에게 Jessi의 답글.
 * 발송은 Resend(`RESEND_API_KEY` 비밀값, `MAIL_FROM` 설정값). 키가 없으면 보내지 않고 조용히
 * 넘어간다 — 메일이 없어도 댓글과 종 알림은 그대로 돈다.
 *
 * 새 댓글 메일은 10분에 한 통까지다. 그 사이에 달린 댓글은 다음 메일에 같이 묶인다
 * (이 사이트에는 10분마다 깨어날 시계가 없어서, 다음 댓글이 달릴 때 같이 보낸다 —
 * 그때까지는 종 알림이 먼저 알린다).
 *
 * 메일 앱은 SVG를 지우므로 아이콘은 PNG로 구운 그림을 건다 (app/api/mail-icon). 모든 글자는
 * 이스케이프한다 — 댓글은 아무나 쓰는 글이다.
 *
 * 사이트와 같은 정렬 규칙을 따른다: 한글이 든 작은 표시는 한글 글꼴로(코딩용 글꼴엔 한글이 없어
 * 기기마다 높이가 흔들린다), 버튼 글자는 아래 여백을 2px 더 줘 1px 올린다(2배·3배 화면에서 재서 맞춤).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const SITE = "https://vibelog.space";

export function hasMail(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/* ---------- 메일 끄기 링크 ---------- */

function sign(payload: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(payload).digest("base64url").slice(0, 32);
}

export function unsubscribeUrl(userId: string, kind: "reply" | "admin"): string {
  const p = Buffer.from(`${kind}:${userId}`).toString("base64url");
  return `${SITE}/api/mail/unsubscribe?p=${p}&s=${sign(p)}`;
}

export function readUnsubscribe(p: string, s: string): { kind: string; userId: string } | null {
  const want = Buffer.from(sign(p));
  const got = Buffer.from(s);
  if (!process.env.AUTH_SECRET || want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const [kind, ...rest] = Buffer.from(p, "base64url").toString().split(":");
  return kind && rest.length ? { kind, userId: rest.join(":") } : null;
}

/* ---------- 그리기 ---------- */

export interface MailComment {
  name: string;
  /** 사람 아이콘 이름 (lib/avatar-icons.ts) */
  icon: string;
  color: string;
  time: string;
  body: string;
}

export interface MailPost {
  slug: string;
  project: string;
  projectColor: string;
  date: string;
  title: string;
  url: string;
}

/**
 * 글꼴 — 사이트와 같은 Noto Sans KR·JetBrains Mono를 먼저 부른다. 메일 앱마다 웹 글꼴을 받는지가
 * 달라서(애플 메일·iOS는 받고, Gmail은 안 받는다), 못 받으면 그 기기의 기본 한글 글꼴로 내려간다:
 * 애플 기기 Apple SD Gothic Neo, 윈도 맑은 고딕, 안드로이드 Noto Sans CJK KR.
 * 한글은 코딩용 고정폭 글꼴로 쓰지 않는다 — 그 글꼴엔 한글이 없어 기기마다 다른 글꼴로 바뀐다.
 * 고정폭은 vibelog 이름과 시각(숫자)에만 쓴다.
 */
const FONT = `font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic','Noto Sans CJK KR',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`;
const MONO = `font-family:'JetBrains Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace`;
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&family=JetBrains+Mono:wght@500;700&display=swap";

function iconImg(src: string, size: number, radius: string): string {
  return `<img src="${esc(src)}" width="${size}" height="${size}" alt="" style="display:block;width:${size}px;height:${size}px;border-radius:${radius}">`;
}

function personIcon(c: MailComment): string {
  return iconImg(`${SITE}/api/mail-icon?i=${encodeURIComponent(c.icon)}&c=${c.color.replace("#", "")}`, 24, "50%");
}

function commentBlock(c: MailComment, tone: "main" | "quiet" | "jessi", label?: string): string {
  const bg = tone === "jessi" ? "#eaf6f2" : "#f5f6f8";
  const text = tone === "quiet" ? "font-size:13px;color:#6b7482" : "font-size:15px;color:#2b3340";
  const badge =
    tone === "jessi"
      ? ` <span style="display:inline-block;height:16px;line-height:15px;padding:0 7px 1px;margin-left:6px;${FONT};font-size:11px;font-weight:700;color:#0f8f75;border:1px solid #0f8f75;border-radius:999px;vertical-align:middle">만든 사람</span>`
      : "";
  return `<tr><td style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border-radius:10px"><tr><td style="padding:${tone === "quiet" ? "14px 16px" : "16px 18px"}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="32" valign="middle">${personIcon(c)}</td>
<td valign="middle" style="${FONT};font-size:13px;font-weight:700;color:#1d2430">${esc(label ?? c.name)}${badge}</td>
<td align="right" style="${MONO};font-size:11px;color:#8a93a2">${esc(c.time)}</td></tr></table>
<div style="${FONT};${text};line-height:1.75;margin-top:8px;white-space:pre-wrap;word-break:keep-all">${esc(c.body)}</div>
</td></tr></table></td></tr>`;
}

function postCard(p: MailPost): string {
  return `<tr><td style="padding:0 24px"><a href="${esc(p.url)}" style="display:block;text-decoration:none;border:1px solid #e6e9ee;border-radius:10px;padding:12px 16px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td width="40" valign="middle">${iconImg(`${SITE}/api/mail-icon?p=${encodeURIComponent(p.slug)}`, 28, "8px")}</td>
<td valign="middle"><div style="${FONT};font-size:12px;color:#5b6573">${esc(p.project)} · ${esc(p.date)}</div>
<div style="${FONT};font-size:14px;font-weight:700;color:#1d2430;margin-top:2px;word-break:keep-all">${esc(p.title)}</div></td></tr></table></a></td></tr>`;
}

const GAP = `<tr><td style="height:20px;line-height:20px;font-size:0">&nbsp;</td></tr>`;
const SMALL_GAP = `<tr><td style="height:8px;line-height:8px;font-size:0">&nbsp;</td></tr>`;

function frame(o: { kind: string; preheader: string; heading: string; rows: string; button: { label: string; url: string }; foot: string }): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light">
<link href="${FONT_LINK}" rel="stylesheet"><style>@import url("${FONT_LINK}");</style></head>
<body style="margin:0;padding:0;background:#eef0f3">
<div style="display:none;max-height:0;overflow:hidden">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f3"><tr><td align="center" style="padding:16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0a0e14;padding:16px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="${MONO};font-size:16px;font-weight:700;color:#f3efe6">vibelog</td>
<td align="right" style="${FONT};font-size:12px;font-weight:700;color:#5ee1c3">${esc(o.kind)}</td></tr></table></td></tr>
<tr><td style="padding:24px 24px 20px;${FONT};font-size:20px;line-height:1.45;font-weight:700;color:#111722;word-break:keep-all">${esc(o.heading)}</td></tr>
${o.rows}
<tr><td style="padding:24px"><a href="${esc(o.button.url)}" style="display:inline-block;${FONT};font-size:14px;font-weight:700;color:#ffffff;background:#0f8f75;border-radius:10px;padding:12px 20px 14px;text-decoration:none">${esc(o.button.label)}</a></td></tr>
<tr><td style="border-top:1px solid #eef0f3;padding:16px 24px;${FONT};font-size:12px;line-height:1.7;color:#8a93a2">${o.foot}<br>© ${new Date().getFullYear()} vibelog · Jessi</td></tr>
</table></td></tr></table></body></html>`;
}

/** Jessi에게 — 새 댓글 (여러 개면 묶어서) */
export function adminMail(items: { post: MailPost; comment: MailComment; anchor: string }[], unsubscribe: string) {
  const first = items[0];
  const many = items.length > 1;
  const subject = many
    ? `[vibelog] 새 댓글 ${items.length}개`
    : `[vibelog] ${first.post.project} 글에 새 댓글 — ${first.comment.name}`;
  const rows = items
    .map((it, i) => (i ? GAP : "") + postCard(it.post) + GAP + commentBlock(it.comment, "main"))
    .join("");
  const html = frame({
    kind: "새 댓글",
    preheader: `${first.comment.name}: ${first.comment.body.slice(0, 80)}`,
    heading: many ? `새 댓글이 ${items.length}개 달렸습니다` : `${first.comment.name} 님이 댓글을 남겼습니다`,
    rows,
    button: { label: "답글 쓰기", url: first.anchor },
    foot: `<a href="${esc(unsubscribe)}" style="color:#5b6573">새 댓글 메일 끄기</a>`,
  });
  return { subject, html };
}

/** 댓글 쓴 사람에게 — Jessi의 답글 */
export function replyMail(post: MailPost, mine: MailComment, reply: MailComment, anchor: string, unsubscribe: string) {
  const html = frame({
    kind: "답글",
    preheader: reply.body.slice(0, 80),
    heading: "Jessi가 내 댓글에 답글을 달았습니다",
    rows: commentBlock(mine, "quiet", "내 댓글") + SMALL_GAP + commentBlock(reply, "jessi") + GAP + postCard(post),
    button: { label: "답글 보러 가기", url: anchor },
    foot: `vibelog 글에 댓글을 남겨서 받는 메일입니다. <a href="${esc(unsubscribe)}" style="color:#5b6573">답글 메일 받지 않기</a>`,
  });
  return { subject: "[vibelog] Jessi가 내 댓글에 답글을 달았습니다", html };
}

export async function sendMail(to: string, subject: string, html: string, unsubscribe: string): Promise<void> {
  if (!hasMail()) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [to],
      subject,
      html,
      headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  // 받는 사람 주소는 로그에 남기지 않는다
  if (!res.ok) console.error(`[mail] 보내기 실패 ${res.status}`);
}

export const SITE_URL = SITE;
