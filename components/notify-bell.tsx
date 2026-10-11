"use client";
/**
 * 머리글의 알림 종 — 로그인한 사람에게만 (시안 docs/post-comments.html ④).
 *
 * 뱃지 규칙: 숫자는 읽지 않은 알림 수. 0이면 지우고, 10개부터 9+. 목록을 열기만 해서는 줄지 않고,
 * 그 알림을 누르거나 "모두 읽음"을 눌러야 읽음이 된다 — 열었다 닫는 것만으로 사라지면 놓친다.
 * 페이지를 열 때, 그리고 탭을 보고 있는 동안 2분마다 새로 센다.
 * 크기는 옆 KO/EN 묶음과 같은 30px (라이브에서 잰 높이).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "./lang";
import { PersonIcon } from "./person-icon";

interface Note {
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

const EVERY = 2 * 60 * 1000;

/**
 * 머리글에 종이 두 번 들어간다(모바일 줄·데스크톱 줄 — 하나는 숨겨진다). 같은 순간의 요청은
 * 하나로 합쳐 DB에 두 번 묻지 않게 한다.
 */
let inflight: Promise<{ signedIn: boolean; unread: number; items: Note[] } | null> | null = null;
function fetchNotes(fresh = false) {
  if (fresh) inflight = null;
  inflight ??= fetch("/api/notifications")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .finally(() => setTimeout(() => (inflight = null), 1000));
  return inflight;
}

function ago(iso: string, en: boolean): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return en ? `${Math.max(1, m)}m` : `${Math.max(1, m)}분`;
  const h = Math.round(m / 60);
  if (h < 24) return en ? `${h}h` : `${h}시간`;
  const d = Math.round(h / 24);
  return d === 1 ? (en ? "1d" : "어제") : en ? `${d}d` : `${d}일`;
}

export function NotifyBell() {
  const { lang } = useLang();
  const en = lang === "en";
  const router = useRouter();
  const [data, setData] = useState<{ signedIn: boolean; unread: number; items: Note[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number; width: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  // 목록은 화면에 고정해 띄운다 — 모바일에선 종 오른쪽에 KO/EN이 있어서, 종에 붙여 오른쪽 맞춤을 하면
  // 목록이 화면 왼쪽 밖으로 나갔다. 종의 오른쪽 끝에 맞추되 화면 가장자리 16px 안으로 민다.
  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const vw = document.documentElement.clientWidth;
    const width = Math.min(340, vw - 32);
    const right = Math.min(Math.max(16, vw - r.right), vw - 16 - width);
    setPos({ top: r.bottom + 10, right, width });
  }, []);

  const load = useCallback(async (fresh = false) => {
    const d = await fetchNotes(fresh);
    if (d) setData(d);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), EVERY);
    const v = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", v);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", v);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    const down = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open, place]);

  if (!data?.signedIn) return null;
  const n = data.unread;
  const badge = n > 9 ? "9+" : String(n);
  const label = n ? (en ? `Notifications, ${n} unread` : `알림 ${n}개`) : en ? "Notifications" : "알림";

  const markRead = async (body: unknown) => {
    await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    // 읽음 표시 직후에는 합쳐 둔 지난 요청을 쓰지 않고 새로 센다
    load(true);
  };

  return (
    <div ref={box} className="relative">
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`hit relative grid size-[30px] cursor-pointer place-items-center rounded-md border border-line text-ink-soft transition-colors duration-150 hover:text-ink ${open ? "bg-panel2 text-ink" : "bg-panel"}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
          <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
        </svg>
        {n > 0 && (
          <span aria-hidden className="absolute -right-[5px] -top-[5px] grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold leading-none text-accent-ink">
            {badge}
          </span>
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {label}
      </span>
      {open && pos && (
        <div
          role="region"
          aria-label={en ? "Notifications" : "알림"}
          style={{ top: pos.top, right: pos.right, width: pos.width }}
          className="fixed z-40 overflow-hidden rounded-xl border border-line-strong bg-panel2 shadow-[0_12px_28px_rgba(5,8,12,.6)]"
        >
          <div className="flex items-center justify-between border-b border-line px-3.5">
            <b className="text-sm text-ink">{en ? "Notifications" : "알림"}</b>
            {n > 0 && (
              <button type="button" onClick={() => markRead({ all: true })} className="hit cursor-pointer py-2.5 text-xs text-muted hover:text-ink">
                {en ? "Mark all read" : "모두 읽음"}
              </button>
            )}
            {n === 0 && <span className="py-2.5 text-xs">&nbsp;</span>}
          </div>
          {data.items.length === 0 ? (
            <p className="m-0 px-3.5 py-6 text-center text-sm text-muted">{en ? "No notifications yet" : "아직 알림이 없습니다"}</p>
          ) : (
            <ul className="m-0 max-h-[min(420px,60vh)] list-none overflow-y-auto p-0">
              {data.items.map((it) => (
                <li key={it.id} className="border-b border-line last:border-b-0">
                  <a
                    href={`/p/${it.postId}#c-${it.commentId}`}
                    onClick={async (e) => {
                      e.preventDefault();
                      setOpen(false);
                      if (!it.read) await markRead({ ids: [it.id] });
                      router.push(`/p/${it.postId}#c-${it.commentId}`);
                    }}
                    className="grid grid-cols-[24px_1fr_auto] items-start gap-2.5 px-3.5 py-3 transition-colors duration-150 hover:bg-line"
                  >
                    <PersonIcon icon={it.who.icon} color={it.who.color} />
                    <span className={`min-w-0 text-sm leading-normal ${it.read ? "text-muted" : "text-ink-soft"}`}>
                      <b className={it.read ? "font-bold text-muted" : "text-ink"}>{it.who.name}</b> · {it.post}
                      <span className="mt-0.5 block truncate text-muted">{it.excerpt}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1.5">
                      <time dateTime={it.createdAt} className="font-mono text-2xs text-muted">
                        {ago(it.createdAt, en)}
                      </time>
                      {!it.read && <span aria-label={en ? "unread" : "읽지 않음"} className="size-2 rounded-full bg-accent" />}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
