"use server";
/**
 * 로그인·로그아웃 — 화면의 버튼이 부르는 서버 함수.
 * 돌아올 곳은 이 사이트 안의 경로만 받는다 (남의 사이트로 튕겨 보내는 통로가 되지 않게).
 */
import { signIn, signOut } from "@/auth";

function safePath(p: string): string {
  return p.startsWith("/") && !p.startsWith("//") ? p : "/";
}

export async function login(back: string) {
  await signIn("google", { redirectTo: safePath(back) });
}

export async function logout(back: string) {
  await signOut({ redirectTo: safePath(back) });
}
