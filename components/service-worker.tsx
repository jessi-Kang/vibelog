"use client";
/**
 * 서비스 워커 등록 — 설치한 앱이 주소창 없는 창으로 열리게 하는 조건
 * (없으면 안드로이드가 바로가기만 만든다. public/sw.js 주석 참고).
 * 첫 화면을 그리는 동안 네트워크를 뺏지 않도록 load 이후에 등록한다.
 */
import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // 사설 모드·권한 차단 등 — 앱 설치 품질만 낮아지고 사이트는 그대로 돈다
      });
    };
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
