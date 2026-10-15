/**
 * 댓글의 규칙 — 누가 무엇을 보고, 누가 무엇을 할 수 있는가. 라우트는 이 함수들만 부른다.
 * 시안 docs/post-comments.html (10/11 승인).
 *
 * - 읽기는 누구나. 로그인 전에는 쓴 사람의 이름·아이콘을 **서버가 보내지 않는다** —
 *   "방문자 1, 2"(그 글 안에서 처음 나온 순서)와 회색 아이콘만. 관리자는 이름까지 보인다.
 * - 쓰기는 Google 로그인한 사람. 답글은 관리자만 단다.
 * - 숨긴 댓글은 관리자와 쓴 사람에게만 보인다. 지우기는 관리자와 쓴 사람.
 * - 메일 주소는 응답에 넣지 않는다.
 */
import { isAdminEmail } from "@/auth";
import { avatarFor, ADMIN_AVATAR, ANON_AVATAR } from "./avatar";
import { getDevlogs, getProjects, type DevlogEntry } from "./content";
import { db } from "./db";
import { findByPostId } from "./post-id";
import { projectName } from "./project-name";

export const MAX_BODY = 1000;
/** 한 사람이 1분에 쓸 수 있는 댓글 수 */
export const PER_MINUTE = 3;

export interface Viewer {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface CommentView {
  id: number;
  parentId: number | null;
  body: string;
  createdAt: string;
  hidden: boolean;
  mine: boolean;
  author: { name: string; admin: boolean; icon: string; color: string; anon: boolean };
}

interface Row {
  id: string;
  parent_id: string | null;
  body: string;
  hidden: boolean;
  created_at: Date;
  user_id: string;
  name: string;
  email: string;
}

export function findPost(postId: string): DevlogEntry | undefined {
  try {
    return findByPostId(getDevlogs(), postId);
  } catch {
    return undefined;
  }
}

/** 글자만 남긴다 — 제어문자를 지우고, 빈 줄은 두 줄까지만 */
export function cleanBody(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function listComments(postId: string, viewer: Viewer | null): Promise<CommentView[]> {
  const sql = await db();
  const rows = await sql<Row[]>`
    select c.id, c.parent_id, c.body, c.hidden, c.created_at, c.user_id, u.name, u.email
    from comments c join users u on u.id = c.user_id
    where c.post_id = ${postId}
    order by c.created_at asc`;
  const order = new Map<string, number>();
  const out: CommentView[] = [];
  for (const r of rows) {
    const admin = isAdminEmail(r.email);
    const mine = viewer?.id === r.user_id;
    if (r.hidden && !viewer?.isAdmin && !mine) continue;
    if (!admin && !order.has(r.user_id)) order.set(r.user_id, order.size + 1);
    const showName = admin || Boolean(viewer);
    const av = admin ? ADMIN_AVATAR : showName ? avatarFor(r.user_id) : ANON_AVATAR;
    out.push({
      id: Number(r.id),
      parentId: r.parent_id ? Number(r.parent_id) : null,
      body: r.body,
      createdAt: r.created_at.toISOString(),
      hidden: r.hidden,
      mine,
      author: {
        name: showName ? (admin ? "Jessi" : r.name) : `방문자 ${order.get(r.user_id)}`,
        admin,
        anon: !showName,
        ...av,
      },
    });
  }
  return out;
}

export class CommentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** 관리자 계정 — 로그인한 적이 있어야 알림을 받을 수 있다 */
async function adminIds(): Promise<string[]> {
  const sql = await db();
  const rows = await sql<{ id: string; email: string }[]>`select id, email from users`;
  return rows.filter((r) => isAdminEmail(r.email)).map((r) => r.id);
}

export async function addComment(
  viewer: Viewer,
  postId: string,
  rawBody: string,
  parentId: number | null,
): Promise<{ id: number; notify: { kind: "comment" | "reply"; to: string[] } }> {
  const post = findPost(postId);
  if (!post) throw new CommentError(404, "없는 글입니다");
  const body = cleanBody(rawBody);
  if (!body) throw new CommentError(400, "댓글이 비어 있습니다");
  if (body.length > MAX_BODY) throw new CommentError(400, `${MAX_BODY.toLocaleString("en-US")}자까지 쓸 수 있습니다`);
  if (parentId !== null && !viewer.isAdmin) throw new CommentError(403, "답글은 만든 사람만 달 수 있습니다");

  const sql = await db();
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from comments
    where user_id = ${viewer.id} and created_at > now() - interval '1 minute'`;
  if (n >= PER_MINUTE) throw new CommentError(429, "잠시 뒤에 다시 써 주세요");

  let parentAuthor: string | null = null;
  if (parentId !== null) {
    const [p] = await sql<{ user_id: string; post_id: string; parent_id: string | null }[]>`
      select user_id, post_id, parent_id from comments where id = ${parentId}`;
    if (!p || p.post_id !== postId) throw new CommentError(404, "답글을 달 댓글이 없습니다");
    // 답글에 답글은 달지 않는다 — 한 단계만 둔다
    if (p.parent_id) throw new CommentError(400, "답글에는 답글을 달 수 없습니다");
    parentAuthor = p.user_id;
  }

  const [row] = await sql<{ id: string }[]>`
    insert into comments (post_id, user_id, parent_id, body, mailed)
    values (${postId}, ${viewer.id}, ${parentId}, ${body}, ${viewer.isAdmin})
    returning id`;
  const id = Number(row.id);

  if (viewer.isAdmin) {
    // 관리자의 답글 → 그 댓글을 쓴 사람에게 (관리자 자신이면 알리지 않는다)
    const to = parentAuthor && parentAuthor !== viewer.id ? [parentAuthor] : [];
    for (const u of to) await sql`insert into notifications (user_id, comment_id, kind) values (${u}, ${id}, 'reply')`;
    return { id, notify: { kind: "reply", to } };
  }
  const to = (await adminIds()).filter((u) => u !== viewer.id);
  for (const u of to) await sql`insert into notifications (user_id, comment_id, kind) values (${u}, ${id}, 'comment')`;
  return { id, notify: { kind: "comment", to } };
}

export async function setHidden(viewer: Viewer, id: number, hidden: boolean): Promise<void> {
  if (!viewer.isAdmin) throw new CommentError(403, "만든 사람만 숨길 수 있습니다");
  const sql = await db();
  const r = await sql`update comments set hidden = ${hidden} where id = ${id}`;
  if (r.count === 0) throw new CommentError(404, "없는 댓글입니다");
}

export async function removeComment(viewer: Viewer, id: number): Promise<void> {
  const sql = await db();
  const [c] = await sql<{ user_id: string }[]>`select user_id from comments where id = ${id}`;
  if (!c) throw new CommentError(404, "없는 댓글입니다");
  if (!viewer.isAdmin && c.user_id !== viewer.id) throw new CommentError(403, "지울 수 없는 댓글입니다");
  // 답글과 알림은 on delete cascade로 같이 지워진다
  await sql`delete from comments where id = ${id}`;
}

/* ---------- 알림 ---------- */

export interface NoteView {
  id: number;
  kind: "comment" | "reply";
  read: boolean;
  createdAt: string;
  postId: string;
  commentId: number;
  post: string;
  who: { name: string; icon: string; color: string };
  excerpt: string;
}

/** 30일 안의 알림. 숨긴 댓글의 알림은 빠진다 */
export async function listNotes(viewer: Viewer): Promise<{ unread: number; items: NoteView[] }> {
  const sql = await db();
  const rows = await sql<
    { id: string; kind: string; read_at: Date | null; created_at: Date; post_id: string; comment_id: string; user_id: string; name: string; email: string; body: string }[]
  >`
    select n.id, n.kind, n.read_at, n.created_at, c.post_id, c.id as comment_id, c.user_id, u.name, u.email, c.body
    from notifications n
    join comments c on c.id = n.comment_id
    join users u on u.id = c.user_id
    where n.user_id = ${viewer.id} and not c.hidden and n.created_at > now() - interval '30 days'
    order by n.created_at desc
    limit 50`;
  const posts = getDevlogs();
  const items: NoteView[] = rows.map((r) => {
    const post = (() => {
      try {
        return findByPostId(posts, r.post_id);
      } catch {
        return undefined;
      }
    })();
    const admin = isAdminEmail(r.email);
    const [m, d] = post ? post.date.slice(5).split("-").map(Number) : [0, 0];
    return {
      id: Number(r.id),
      kind: r.kind === "reply" ? "reply" : "comment",
      read: Boolean(r.read_at),
      createdAt: r.created_at.toISOString(),
      postId: r.post_id,
      commentId: Number(r.comment_id),
      post: post ? `${projectName(post.repo)} ${m}/${d} 글` : "지워진 글",
      who: { name: admin ? "Jessi" : r.name, ...(admin ? ADMIN_AVATAR : avatarFor(r.user_id)) },
      excerpt: r.body.replace(/\s+/g, " ").slice(0, 80),
    };
  });
  return { unread: items.filter((i) => !i.read).length, items };
}

export async function markRead(viewer: Viewer, ids: number[] | "all"): Promise<void> {
  const sql = await db();
  if (ids === "all") await sql`update notifications set read_at = now() where user_id = ${viewer.id} and read_at is null`;
  else if (ids.length)
    await sql`update notifications set read_at = now() where user_id = ${viewer.id} and id = any(${ids}) and read_at is null`;
}

export async function setMailReplies(viewer: Viewer, on: boolean): Promise<void> {
  const sql = await db();
  await sql`update users set mail_replies = ${on} where id = ${viewer.id}`;
}

export async function viewerInfo(viewer: Viewer): Promise<{ name: string; icon: string; color: string; isAdmin: boolean; mailReplies: boolean }> {
  const sql = await db();
  const [u] = await sql<{ mail_replies: boolean }[]>`select mail_replies from users where id = ${viewer.id}`;
  return {
    name: viewer.isAdmin ? "Jessi" : viewer.name,
    isAdmin: viewer.isAdmin,
    mailReplies: u?.mail_replies ?? true,
    ...(viewer.isAdmin ? ADMIN_AVATAR : avatarFor(viewer.id)),
  };
}

export function projectOf(post: DevlogEntry) {
  return getProjects().find((p) => p.slug === post.repo);
}
