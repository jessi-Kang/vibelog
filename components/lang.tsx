"use client";
/**
 * 사이트 전역 언어 설정 (Jessi 지시 — 페이지마다 흩어진 토글을 하나로).
 * 선택은 localStorage("vibelog-lang")에 저장되어 다음 방문에도 유지된다.
 * 서버 렌더는 항상 ko — 마운트 후 저장값으로 전환한다 (hydration 불일치 방지).
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "ko" | "en";
const KEY = "vibelog-lang";

const LangContext = createContext<{
  lang: Lang;
  setLang: (v: Lang) => void;
}>({ lang: "ko", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored === "en") setLangState("en");
    } catch {
      // 저장소가 막힌 환경 — ko 유지
    }
  }, []);
  useEffect(() => {
    // <html lang>에 반영 — 스크린리더·검색엔진용이자, 쇼츠 녹화(record.ts)가
    // "영어 전환이 끝났다"를 확인하는 신호. SSR은 ko라 전환 전 화면이 영문
    // 녹화에 섞이는 문제가 있었다 (Jessi 지적).
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (v: Lang) => {
    setLangState(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      // 저장 실패해도 이번 세션은 동작
    }
  };
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/** 서버 컴포넌트 안에서도 쓸 수 있는 언어별 텍스트 리프 */
export function T({ ko, en }: { ko: ReactNode; en: ReactNode }) {
  const { lang } = useLang();
  return <>{lang === "ko" ? ko : en}</>;
}

/** 헤더의 전역 KO/EN 스위치 */
export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div
      className="flex gap-0.5 rounded-md border border-line bg-panel p-0.5"
      aria-label="site language"
    >
      {(["ko", "en"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={lang === v}
          onClick={() => setLang(v)}
          className={`hit min-h-7 cursor-pointer rounded-[6px] px-2 font-mono text-xs font-bold transition-colors duration-150 ${
            lang === v ? "bg-panel2 text-ink" : "text-muted hover:text-ink-soft"
          }`}
        >
          {v.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
