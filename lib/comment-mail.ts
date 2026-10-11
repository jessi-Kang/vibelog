/**
 * 댓글이 달린 뒤 메일 보내기 — 응답을 늦추지 않게 라우트가 after()로 부른다.
 * 그리기는 lib/mail.ts, 누가 받는지는 여기서 정한다.
 */
import { isAdminEmail } from "@/auth";
import { avatarFor, ADMIN_AVATAR } from "./avatar";
import { findPost, projectOf } from "./comments";
import { db } from "./db";
import { adminMail, hasMail, replyMail, sendMail, SITE_URL, unsubscribeUrl, type MailPost } from "./mail";
import { postPath } from "./post-id";
import { projectColor } from "./project-color";
import { projectName } from "./project-name";

/** 새 댓글 메일은 10분에 한 통까지 */
const ADMIN_EVERY_MS = 10 * 60 * 1000;

function kst(d: Date): string {
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  return `${k.getUTCMonth() + 1}/${k.getUTCDate()} ${String(k.getUTCHours()).padStart(2, "0")}:${String(k.getUTCMinutes()).padStart(2, "0")}`;
}

function mailPost(postId: string): MailPost | null {
  const post = findPost(postId);
  if (!post) return null;
  const [, m, d] = post.date.split("-").map(Number);
  return {
    slug: post.repo,
    project: projectName(post.repo),
    projectColor: projectOf(post)?.color ?? projectColor(post.repo),
    date: `${m}/${d}`,
    title: post.title,
    url: `${SITE_URL}${postPath(post)}`,
  };
}

export async function mailAfterComment(kind: "comment" | "reply", commentId: number): Promise<void> {
  if (!hasMail()) return;
  try {
    if (kind === "reply") await mailReply(commentId);
    else await mailAdmins();
  } catch (e) {
    console.error(`[mail] ${kind} 처리 실패: ${(e as Error).message.slice(0, 120)}`);
  }
}

async function mailReply(replyId: number): Promise<void> {
  const sql = await db();
  const [r] = await sql<
    { post_id: string; body: string; created_at: Date; p_body: string; p_created: Date; p_user: string; p_name: string; p_email: string; mail_replies: boolean; p_hidden: boolean }[]
  >`
    select c.post_id, c.body, c.created_at, p.body as p_body, p.created_at as p_created, p.user_id as p_user,
           u.name as p_name, u.email as p_email, u.mail_replies, p.hidden as p_hidden
    from comments c join comments p on p.id = c.parent_id join users u on u.id = p.user_id
    where c.id = ${replyId}`;
  if (!r || !r.mail_replies || r.p_hidden || isAdminEmail(r.p_email)) return;
  const post = mailPost(r.post_id);
  if (!post) return;
  const un = unsubscribeUrl(r.p_user, "reply");
  const { subject, html } = replyMail(
    post,
    { name: r.p_name, ...avatarFor(r.p_user), time: kst(r.p_created), body: r.p_body },
    { name: "Jessi", ...ADMIN_AVATAR, time: kst(r.created_at), body: r.body },
    `${post.url}#c-${replyId}`,
    un,
  );
  await sendMail(r.p_email, subject, html, un);
}

async function mailAdmins(): Promise<void> {
  const sql = await db();
  const [last] = await sql<{ sent_at: Date }[]>`select sent_at from mail_log where kind = 'admin'`;
  if (last && Date.now() - last.sent_at.getTime() < ADMIN_EVERY_MS) return;
  const rows = await sql<{ id: string; post_id: string; body: string; created_at: Date; user_id: string; name: string }[]>`
    select c.id, c.post_id, c.body, c.created_at, c.user_id, u.name
    from comments c join users u on u.id = c.user_id
    where not c.mailed and not c.hidden
    order by c.created_at asc limit 20`;
  if (!rows.length) return;
  const items = rows.flatMap((r) => {
    const post = mailPost(r.post_id);
    return post
      ? [{ post, comment: { name: r.name, ...avatarFor(r.user_id), time: kst(r.created_at), body: r.body }, anchor: `${post.url}#c-${r.id}` }]
      : [];
  });
  await sql`update comments set mailed = true where id = any(${rows.map((r) => r.id)})`;
  await sql`insert into mail_log (kind, sent_at) values ('admin', now()) on conflict (kind) do update set sent_at = now()`;
  if (!items.length) return;
  const admins = (await sql<{ id: string; email: string; mail_admin: boolean }[]>`select id, email, mail_admin from users`).filter(
    (u) => isAdminEmail(u.email) && u.mail_admin,
  );
  for (const a of admins) {
    const un = unsubscribeUrl(a.id, "admin");
    const { subject, html } = adminMail(items, un);
    // 받는 주소는 따로 정할 수 있다 (ADMIN_NOTIFY_EMAIL, 비밀값) — 로그인 계정과 메일을 읽는 곳이 다르다
    await sendMail(process.env.ADMIN_NOTIFY_EMAIL?.trim() || a.email, subject, html, un);
  }
}
