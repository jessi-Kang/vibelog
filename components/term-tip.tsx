"use client";
/**
 * 글 속 용어 말풍선 — `[[용어|설명]]` 표시를 점선 밑줄 낱말로 그리고, 누르면 그 낱말 위에
 * 설명을 띄운다 (시안 docs/post-term-tooltip.html, 10/11).
 *
 * - 마우스를 올리는 것만으로는 열지 않는다. 폰에서 안 되는 동작이다 — 누르기로 연다.
 *   다시 누르기·바깥 누르기·Esc로 닫는다. 열린 말풍선은 페이지에 하나.
 * - 밑줄은 글자에 붙인다. border-bottom은 줄 높이(1.75) 아래에 그어져 글자에서 멀리
 *   떨어졌다.
 * - 말풍선은 화면 밖으로 나가지 않는다. 낱말이 화면 가장자리에 있으면 말풍선을 안쪽으로
 *   밀고 꼬리만 낱말을 가리킨다. 위에 자리가 없으면(고정 머리글 바로 아래) 아래로 띄운다.
 *   좌표는 낱말의 첫 줄 상자로 잡는다 — 낱말이 두 줄로 갈리면 전체 상자의 가운데가
 *   낱말 밖이 된다.
 * - 본문 칼럼의 overflow에 잘리지 않게 body에 띄우고(fixed), 스크롤하면 따라간다.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const OPEN_EVENT = "vl-term-open";
/** 화면 가장자리에서 띄울 거리 — 페이지 여백과 같다 */
const EDGE = 16;
const GAP = 7;

interface Pos {
  left: number;
  top: number;
  arrow: number;
  below: boolean;
}

export function TermTip({ note, children }: { note: string; children?: ReactNode }) {
  const id = useId();
  const btn = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);

  const place = useCallback(() => {
    const b = btn.current;
    const t = tip.current;
    if (!b || !t) return;
    // 버튼 상자는 줄 높이(1.75)만큼 위아래가 비어 있어서, 그 상자에 붙이면 말풍선이 글자에서 한참 떴다.
    // 글자 범위(Range)는 글꼴의 글자 높이만 차지하므로 그 위에 붙인다 (10/11).
    const rg = document.createRange();
    rg.selectNodeContents(b);
    const r = rg.getClientRects()[0] ?? b.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const w = t.offsetWidth;
    const h = t.offsetHeight;
    const center = r.left + r.width / 2;
    const left = Math.max(EDGE, Math.min(center - w / 2, vw - EDGE - w));
    const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    const below = r.top - GAP - h < Math.max(headerBottom, 0) + 4;
    setPos({
      left,
      top: below ? r.bottom + GAP : r.top - GAP - h,
      // 꼬리는 말풍선 모서리의 둥근 부분에 걸리지 않게 안쪽 12px까지만
      arrow: Math.max(12, Math.min(center - left, w - 12)),
      below,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!btn.current?.contains(n) && !tip.current?.contains(n)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    window.addEventListener(OPEN_EVENT, onOther);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOther);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [open, id, place]);

  const toggle = () => {
    if (!open) window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
    setOpen(!open);
  };

  return (
    <>
      {/* button이 아니라 글자 — button은 한 덩어리라 줄 안에서 끊기지 않아, 용어 앞 줄 끝이
          통째로 비었다 (10/20). 그래서 button의 역할(키보드 열기·포커스)을 직접 단다 */}
      <span
        ref={btn}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className={`cursor-pointer underline decoration-dotted decoration-1 underline-offset-[3px] transition-colors duration-150 ${
          open ? "text-accent decoration-accent" : "text-ink decoration-muted hover:decoration-ink"
        }`}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <span
            ref={tip}
            id={id}
            role="tooltip"
            style={{
              left: pos?.left ?? 0,
              top: pos?.top ?? 0,
              visibility: pos ? "visible" : "hidden",
            }}
            className="fixed z-40 block w-max max-w-[min(280px,calc(100vw-32px))] rounded-md border border-line-strong bg-panel2 px-3 py-2 text-sm leading-normal text-ink-soft shadow-[0_8px_20px_rgba(5,8,12,.5)] [overflow-wrap:anywhere] [word-break:keep-all]"
          >
            <b className="mb-0.5 block text-xs font-bold text-accent">{children}</b>
            {note}
            <span
              aria-hidden
              style={{ left: pos?.arrow ?? 0 }}
              className={`absolute block size-0 -translate-x-1/2 border-[6px] border-transparent ${
                pos?.below ? "bottom-full border-b-line-strong" : "top-full border-t-line-strong"
              }`}
            />
          </span>,
          document.body,
        )}
    </>
  );
}
