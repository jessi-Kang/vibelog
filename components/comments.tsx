"use client";
/**
 * 데브로그 댓글 — 시안 docs/post-comments.html (10/11 Jessi 승인).
 *
 * - 읽기는 누구나. 로그인 전에는 쓴 사람이 "방문자 1, 2"와 회색 아이콘으로만 나온다 (서버가 이름을 안 보낸다).
 * - 로그인 전 쓰는 칸은 빈 댓글 칸 모양 — 어디를 눌러도 Google 로그인으로 간다.
 * - 메뉴는 이름을 누르면 열린다: 방문자는 내 이름 → 답글 메일 끄기·로그아웃, 내 댓글 → 지우기.
 *   Jessi는 댓글 쓴 사람의 이름 → 숨기기(다시 보이기)·지우기. 따로 ⋯ 버튼을 두지 않는다.
 * - 답글은 Jessi만, 안으로 밀지 않고 같은 폭에 바탕만 깐다 (모바일에서 본문 폭이 줄지 않게).
 * - Jessi의 답글 칸 위에는 AI 버튼(초안 쓰기·다듬기·짧게). 초안은 칸에만 들어가고 올리기는 Jessi가 누른다.
 * - 한글이 든 버튼·표시는 글자를 재서 눈으로 보이는 가운데에 맞췄다 (lift 값들).
 *
 * DB가 없는 배포(DATABASE_URL 없음)에서는 아무것도 그리지 않는다.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { login, logout } from "@/app/actions/auth";
import { useLang } from "./lang";
import { PersonIcon } from "./person-icon";

interface Author {
  name: string;
  admin: boolean;
  icon: string;
  color: string;
  anon: boolean;
}
interface C {
  id: number;
  parentId: number | null;
  body: string;
  createdAt: string;
  hidden: boolean;
  mine: boolean;
  author: Author;
}
interface Me {
  name: string;
  icon: string;
  color: string;
  isAdmin: boolean;
  mailReplies: boolean;
}

const MAX = 1000;

function kst(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

async function call(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/* ---------- 이름 메뉴 ---------- */

interface MenuItem {
  label: string;
  danger?: boolean;
  /** 지우기처럼 한 번 더 묻는 것 */
  confirm?: string;
  onSelect: () => void;
}

function NameMenu({ name, items, label }: { name: ReactNode; items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState<number | null>(null);
  const box = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  useEffect(() => {
    if (!open) setAsking(null);
  }, [open]);
  return (
    <span ref={box} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen(!open)}
        className={`relative -mx-1.5 cursor-pointer rounded-md px-1.5 py-0.5 text-sm font-bold text-ink transition-colors duration-150 after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 hover:bg-panel2 ${open ? "bg-panel2" : ""}`}
      >
        {name}
      </button>
      {open && (
        <span
          id={id}
          role="menu"
          className="absolute left-[-6px] top-[calc(100%+4px)] z-20 flex min-w-[148px] flex-col rounded-[10px] border border-line-strong bg-panel2 p-1 shadow-[0_8px_20px_rgba(5,8,12,.5)]"
        >
          {items.map((it, i) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                if (it.confirm && asking !== i) return setAsking(i);
                setOpen(false);
                it.onSelect();
              }}
              className={`flex min-h-10 cursor-pointer items-center whitespace-nowrap rounded-[7px] px-3 text-left text-sm transition-colors duration-150 hover:bg-line focus-visible:bg-line ${it.danger ? "text-danger" : "text-ink-soft hover:text-ink"}`}
            >
              {asking === i ? it.confirm : it.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/* ---------- 작은 조각 ---------- */

/** 한글 작은 표시 — 한글 글꼴, 높이 18px, 가운데 */
function Pill({ children, tone }: { children: ReactNode; tone: "accent" | "muted" }) {
  return (
    <span
      className={`inline-flex h-[18px] flex-none items-center rounded-full border px-[7px] text-2xs font-bold leading-none ${
        tone === "accent" ? "border-accent text-accent" : "border-line-strong text-muted"
      }`}
    >
      {children}
    </span>
  );
}

/** 글자만 살짝 올리는 칸 — 한글은 줄 상자 가운데보다 아래에 잉크가 앉는다 (2배·3배 화면에서 재서 고른 값) */
function Lift({ by, children }: { by: number; children: ReactNode }) {
  return (
    <span className="inline-block" style={{ transform: `translateY(${by}px)` }}>
      {children}
    </span>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span className={`font-mono text-xs tabular-nums ${n > MAX ? "text-danger" : "text-muted"}`}>
      {n.toLocaleString("en-US")} / 1,000
    </span>
  );
}

function SubmitButton({ busy, disabled, children }: { busy: boolean; disabled: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={disabled || busy}
      className="relative inline-flex min-h-[30px] cursor-pointer items-center rounded-lg bg-accent px-3 text-sm font-bold text-accent-ink transition-opacity duration-150 after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 hover:opacity-90 disabled:cursor-default disabled:opacity-50"
    >
      {/* 2배·3배 화면에서 글자 잉크의 위아래 여백을 재서 맞췄다 — 1px은 위로 떴다 (10/11) */}
      <Lift by={-0.5}>{children}</Lift>
    </button>
  );
}

/** 글을 쓰면 칸이 늘어난다 — field-sizing을 못 쓰는 브라우저(사파리)도 같게 */
function useAutosize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.max(48, t.scrollHeight)}px`;
  }, [value]);
  return ref;
}

/* ---------- 댓글 한 개 ---------- */

function Who({
  c,
  me,
  onHide,
  onDelete,
}: {
  c: C;
  me: Me | null;
  onHide: (c: C) => void;
  onDelete: (c: C) => void;
}) {
  const { lang } = useLang();
  const en = lang === "en";
  const name = c.author.anon ? (en ? c.author.name.replace("방문자", "Visitor") : c.author.name) : c.author.name;
  const items: MenuItem[] = [];
  if (me?.isAdmin && !c.author.admin) {
    items.push({ label: c.hidden ? (en ? "Show again" : "다시 보이기") : en ? "Hide" : "숨기기", onSelect: () => onHide(c) });
    items.push({ label: en ? "Delete" : "지우기", danger: true, confirm: en ? "Delete for good?" : "정말 지울까요?", onSelect: () => onDelete(c) });
  } else if (c.mine && !me?.isAdmin) {
    items.push({ label: en ? "Delete" : "지우기", danger: true, confirm: en ? "Delete for good?" : "정말 지울까요?", onSelect: () => onDelete(c) });
  }
  return (
    <div className="flex min-h-6 items-center gap-2">
      <PersonIcon icon={c.author.icon} color={c.author.color} />
      {items.length ? (
        <NameMenu name={name} items={items} label={en ? `${name} — menu` : `${name} 메뉴`} />
      ) : (
        <span className={`text-sm font-bold ${c.author.anon ? "font-normal text-muted" : "text-ink"}`}>{name}</span>
      )}
      {c.author.admin && <Pill tone="accent">{en ? "Maker" : "만든 사람"}</Pill>}
      {c.hidden && <Pill tone="muted">{en ? "Hidden" : "숨김"}</Pill>}
      <time dateTime={c.createdAt} className="ml-auto flex-none font-mono text-2xs text-muted">
        {kst(c.createdAt)}
      </time>
    </div>
  );
}

function Body({ c }: { c: C }) {
  return (
    <p className={`m-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink-soft [overflow-wrap:anywhere] ${c.hidden ? "opacity-50" : ""}`}>
      {c.body}
    </p>
  );
}

/* ---------- 쓰는 칸 ---------- */

type Mode = "draft" | "polish" | "short";

function ReplyBox({ comment, onDone }: { comment: C; onDone: () => void }) {
  const { lang } = useLang();
  const en = lang === "en";
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<Mode | null>(null);
  const [fromAi, setFromAi] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const ref = useAutosize(text);

  const askAi = async (mode: Mode) => {
    setAi(mode);
    setErr("");
    const r = await call("/api/comments/draft", "POST", { commentId: comment.id, mode, current: text });
    setAi(null);
    if (!r.ok) return setErr(String(r.data.error ?? (en ? "Couldn't make a draft" : "초안을 만들지 못했습니다")));
    setText(String(r.data.text ?? ""));
    setRead(mode === "draft" ? ((r.data.read as string[]) ?? []) : read);
    setFromAi(true);
    ref.current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await call("/api/comments", "POST", { post: postIdOf(), body: text, parentId: comment.id });
    setBusy(false);
    if (!r.ok) return setErr(String(r.data.error ?? ""));
    setText("");
    onDone();
  };

  const chips: [Mode, string][] = [
    ["draft", en ? "Draft" : "초안 쓰기"],
    ["polish", en ? "Polish" : "다듬기"],
    ["short", en ? "Shorter" : "짧게"],
  ];

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-line-strong bg-panel py-3 pl-3.5 pr-2 pb-2 transition-colors duration-150 focus-within:border-accent">
      <div role="group" aria-label={en ? "AI help" : "AI 도움"} className="flex flex-wrap items-center gap-1.5 border-b border-line pb-2.5 pr-1.5">
        {chips.map(([m, label]) => (
          <button
            key={m}
            type="button"
            disabled={ai !== null || busy}
            onClick={() => askAi(m)}
            className="relative inline-flex min-h-[30px] cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-2.5 text-xs text-ink-soft transition-colors duration-150 after:absolute after:-inset-1.5 hover:border-ink-soft hover:text-ink disabled:cursor-default disabled:opacity-60"
          >
            {m === "draft" && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />
              </svg>
            )}
            <Lift by={-1}>{ai === m ? (en ? "Writing…" : "쓰는 중…") : label}</Lift>
          </button>
        ))}
      </div>
      {fromAi && <span className="text-xs font-bold text-warn">{en ? "AI draft — edit before posting" : "AI 초안 — 고친 뒤 올리세요"}</span>}
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setFromAi(false);
        }}
        aria-label={en ? "Reply" : "답글"}
        placeholder={en ? "Write a reply or get an AI draft" : "답글을 쓰거나 AI 초안을 받아 보세요"}
        rows={2}
        className="block w-full resize-none bg-transparent pr-1.5 text-base leading-relaxed text-ink placeholder:text-muted"
        // 칸 전체가 포커스를 보여 준다 — 사이트 공통 :focus-visible 테두리가 글 칸에 한 겹 더 그려졌다
        style={{ outline: "none", boxShadow: "none" }}
      />
      {fromAi && read.length > 0 && (
        <span className="text-2xs text-muted">
          {en ? "Read" : "읽은 것"} · {read.join(" · ")}
        </span>
      )}
      <div className="flex items-center justify-end gap-2.5">
        <Count n={text.length} />
        <SubmitButton busy={busy} disabled={!text.trim() || text.length > MAX}>
          {en ? "Post reply" : "답글 올리기"}
        </SubmitButton>
      </div>
      <p aria-live="polite" className="m-0 text-xs text-danger empty:hidden">
        {err}
      </p>
    </form>
  );
}

let currentPostId = "";
function postIdOf() {
  return currentPostId;
}

function Writer({ me, onDone, onMe }: { me: Me; onDone: () => void; onMe: (m: Me) => void }) {
  const { lang } = useLang();
  const en = lang === "en";
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useAutosize(text);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await call("/api/comments", "POST", { post: postIdOf(), body: text });
    setBusy(false);
    if (!r.ok) return setErr(String(r.data.error ?? ""));
    setText("");
    onDone();
  };
  const toggleMail = async () => {
    const r = await call("/api/me", "POST", { mailReplies: !me.mailReplies });
    if (r.ok) onMe({ ...me, mailReplies: !me.mailReplies });
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-line-strong bg-panel py-3 pl-3.5 pr-2 pb-2 transition-colors duration-150 focus-within:border-accent">
      {/* Jessi의 쓰는 칸에는 이름 줄을 두지 않는다 — 쓰는 사람이 늘 Jessi이고, 로그아웃할 일도 없다 */}
      {!me.isAdmin && <div className="flex items-center gap-2 border-b border-line pb-2 pr-1.5">
        <PersonIcon icon={me.icon} color={me.color} />
        <NameMenu
          name={me.name}
          label={en ? "My account" : "내 계정 메뉴"}
          items={[
            { label: me.mailReplies ? (en ? "Stop reply emails" : "답글 메일 받지 않기") : en ? "Get reply emails" : "답글 메일 받기", onSelect: toggleMail },
            { label: en ? "Sign out" : "로그아웃", onSelect: () => logout(location.pathname) },
          ]}
        />
      </div>}
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={en ? "Comment" : "댓글"}
        placeholder={en ? "Leave a comment" : "댓글을 남겨 보세요"}
        rows={2}
        className="block w-full resize-none bg-transparent pr-1.5 text-base leading-relaxed text-ink placeholder:text-muted"
        // 칸 전체가 포커스를 보여 준다 — 사이트 공통 :focus-visible 테두리가 글 칸에 한 겹 더 그려졌다
        style={{ outline: "none", boxShadow: "none" }}
      />
      <div className="flex items-center justify-end gap-2.5">
        <Count n={text.length} />
        <SubmitButton busy={busy} disabled={!text.trim() || text.length > MAX}>
          {en ? "Post" : "올리기"}
        </SubmitButton>
      </div>
      <p aria-live="polite" className="m-0 text-xs text-danger empty:hidden">
        {err}
      </p>
    </form>
  );
}

function Gate() {
  const { lang } = useLang();
  const en = lang === "en";
  return (
    <form action={() => login(location.pathname + "#comments")}>
      <button
        type="submit"
        aria-label={en ? "Sign in with Google to comment" : "Google로 로그인하고 댓글 쓰기"}
        className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl border border-line pl-3.5 pr-3 text-left transition-colors duration-150 hover:border-line-strong"
      >
        <span className="flex-1 text-base text-muted">{en ? "Write a comment" : "댓글 쓰기"}</span>
        <span className="inline-flex items-center gap-1.5 text-xs leading-[14px] text-ink-soft">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" />
            <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8z" />
            <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
          </svg>
          <Lift by={-1.5}>{en ? "Sign in with Google" : "Google로 로그인"}</Lift>
        </span>
      </button>
    </form>
  );
}

/* ---------- 전체 ---------- */

export function Comments({ postId }: { postId: string }) {
  const { lang } = useLang();
  const en = lang === "en";
  const [state, setState] = useState<{ enabled: boolean; me: Me | null; comments: C[] } | null>(null);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [flash, setFlash] = useState("");
  currentPostId = postId;

  const load = useCallback(async () => {
    const r = await call(`/api/comments?post=${encodeURIComponent(postId)}`, "GET");
    if (r.ok) setState(r.data as unknown as { enabled: boolean; me: Me | null; comments: C[] });
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  // 알림·메일에서 #c-12로 들어오면 그 댓글로 내려가 잠깐 밝힌다. 밝히는 판은 글자보다 사방 12px 넓다 —
  // 글자 끝에 딱 맞춰 칠하면 선택이 아니라 잘못 그려진 상자처럼 보였다 (10/11)
  useEffect(() => {
    if (!state || !location.hash.startsWith("#c-")) return;
    const el = document.getElementById(location.hash.slice(1));
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.dataset.flash = "1";
    const t = setTimeout(() => delete el.dataset.flash, 2400);
    return () => clearTimeout(t);
  }, [state]);

  if (!state?.enabled) return null;
  const { me, comments } = state;
  const tops = comments.filter((c) => c.parentId === null);
  const replies = (id: number) => comments.filter((c) => c.parentId === id);

  const hide = async (c: C) => {
    const r = await call(`/api/comments/${c.id}`, "PATCH", { hidden: !c.hidden });
    setFlash(r.ok ? (c.hidden ? (en ? "Shown again" : "다시 보이게 했습니다") : en ? "Hidden" : "숨겼습니다") : String(r.data.error ?? ""));
    load();
  };
  const del = async (c: C) => {
    const r = await call(`/api/comments/${c.id}`, "DELETE");
    setFlash(r.ok ? (en ? "Deleted" : "지웠습니다") : String(r.data.error ?? ""));
    load();
  };

  return (
    <section id="comments" aria-labelledby="comments-h" className="flex scroll-mt-24 flex-col gap-5">
      <h2 id="comments-h" className="m-0 px-1 text-md font-bold text-ink">
        {en ? "Comments" : "댓글"} {tops.length > 0 && <span className="font-normal text-muted">{tops.length}</span>}
      </h2>
      {tops.length > 0 && (
        <ol className="m-0 flex list-none flex-col gap-5 p-0">
          {tops.map((c) => {
            const rs = replies(c.id);
            return (
              <li key={c.id} id={`c-${c.id}`} className="-mx-3 -my-2.5 flex scroll-mt-24 flex-col gap-1.5 rounded-xl px-3 py-2.5 transition-colors duration-700 data-[flash]:bg-accent-soft">
                <Who c={c} me={me} onHide={hide} onDelete={del} />
                <Body c={c} />
                {rs.map((r) => (
                  <div key={r.id} id={`c-${r.id}`} className="mt-1.5 flex scroll-mt-24 flex-col gap-1.5 rounded-xl bg-panel px-3.5 py-3 transition-colors duration-700 data-[flash]:bg-accent-soft">
                    <Who c={r} me={me} onHide={hide} onDelete={del} />
                    <Body c={r} />
                  </div>
                ))}
                {me?.isAdmin && !c.author.admin && (
                  replyTo === c.id ? (
                    <div className="mt-1.5">
                      <ReplyBox
                        comment={c}
                        onDone={() => {
                          setReplyTo(null);
                          load();
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReplyTo(c.id)}
                      className="hit self-start py-1.5 text-xs text-muted transition-colors duration-150 hover:text-ink"
                    >
                      {rs.length ? (en ? "Reply again" : "답글 더 달기") : en ? "Reply" : "답글"}
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ol>
      )}
      {/* Jessi도 댓글을 쓴다 — 처음엔 답글만 달게 했는데, 자기 블로그에 먼저 한마디 남길 자리가 없었다 (10/11) */}
      {me ? <Writer me={me} onDone={load} onMe={(m) => setState({ ...state, me: m })} /> : <Gate />}
      <p aria-live="polite" className="sr-only">
        {flash}
      </p>
    </section>
  );
}
