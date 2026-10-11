/**
 * 댓글 DB (Neon Postgres) — 서버에서만 쓴다.
 *
 * 1단계는 파일 기반(content/)이었는데, 댓글은 방문자가 쓰는 것이라 파일로 둘 수 없다.
 * Neon은 2단계 승인 큐에서 쓰기로 했던 것을 여기서 먼저 쓴다.
 *
 * 표는 셋이다 — 사람(users), 댓글(comments), 알림(notifications). 표가 없으면 처음
 * 부를 때 만든다. 이전 판을 고치는 일은 `ALTER … IF NOT EXISTS`로만 더한다.
 */
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

let client: Sql | null = null;
let ready: Promise<void> | null = null;

export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function sql(): Sql {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL 없음");
  // 서버리스 함수 하나가 연결 하나 — Neon의 연결 모으개(pooler) 주소를 쓴다
  client ??= postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 20, prepare: false, onnotice: () => {} });
  return client;
}

async function migrate(db: Sql): Promise<void> {
  await db`
    create table if not exists users (
      id text primary key,
      name text not null,
      email text not null,
      mail_replies boolean not null default true,
      created_at timestamptz not null default now(),
      seen_at timestamptz not null default now()
    )`;
  await db`
    create table if not exists comments (
      id bigserial primary key,
      post_id text not null,
      user_id text not null references users(id),
      parent_id bigint references comments(id) on delete cascade,
      body text not null,
      hidden boolean not null default false,
      mailed boolean not null default false,
      created_at timestamptz not null default now()
    )`;
  await db`alter table users add column if not exists mail_admin boolean not null default true`;
  await db`create index if not exists comments_post on comments(post_id, created_at)`;
  await db`
    create table if not exists notifications (
      id bigserial primary key,
      user_id text not null references users(id),
      comment_id bigint not null references comments(id) on delete cascade,
      kind text not null,
      created_at timestamptz not null default now(),
      read_at timestamptz
    )`;
  await db`create index if not exists notifications_user on notifications(user_id, created_at desc)`;
  await db`
    create table if not exists mail_log (
      kind text primary key,
      sent_at timestamptz not null
    )`;
}

/** 표가 준비된 연결 — 함수가 처음 뜰 때 한 번만 표를 확인한다 */
export async function db(): Promise<Sql> {
  const s = sql();
  ready ??= migrate(s).catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}
