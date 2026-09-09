import type { Metadata } from "next";
import { AboutClient } from "@/components/about-client";

export const metadata: Metadata = { title: "소개" };

export default function AboutPage() {
  return <AboutClient />;
}
