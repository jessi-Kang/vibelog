/**
 * 댓글 로그인 — Google 계정 하나만 받는다 (Auth.js).
 *
 * 세션은 서명한 쿠키(JWT)에만 둔다 — 세션 표를 따로 두지 않는다.
 * 메일 주소는 두 가지에만 쓴다: 관리자인지 확인하는 것(`ADMIN_EMAILS`, Vercel 환경변수)과
 * 답글 알림 메일을 보내는 것. 화면·응답·로그 어디에도 내보내지 않는다 — 세션에서 지운다.
 * 프로필 사진도 받지 않는다 (사람 아이콘은 lib/avatar.ts가 정한다).
 */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db, hasDb } from "@/lib/db";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && adminEmails().includes(email!.toLowerCase());
}

declare module "next-auth" {
  interface Session {
    user: { id: string; name: string; isAdmin: boolean };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !profile?.email_verified || !user.email) return false;
      if (hasDb()) {
        const sql = await db();
        const name = (user.name ?? "방문자").slice(0, 40);
        await sql`
          insert into users (id, name, email) values (${account.providerAccountId}, ${name}, ${user.email})
          on conflict (id) do update set name = excluded.name, email = excluded.email, seen_at = now()`;
      }
      return true;
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        token.uid = account.providerAccountId;
        token.admin = isAdminEmail(user.email);
      }
      return token;
    },
    async session({ session, token }) {
      return {
        expires: session.expires,
        user: {
          id: String(token.uid ?? ""),
          name: String(token.name ?? ""),
          isAdmin: token.admin === true,
        },
      } as typeof session;
    },
  },
});
