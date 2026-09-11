import type { Metadata } from "next";
import { AboutClient } from "@/components/about-client";

export const metadata: Metadata = {
  title: "소개",
  description: "vibelog는 커밋에서 데브로그 글과 쇼츠를 자동 발행하는 파이프라인입니다.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutClient />;
}
