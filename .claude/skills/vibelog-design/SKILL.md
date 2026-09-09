---
name: vibelog-design
description: Use this skill to generate well-branded interfaces and assets for Vibelog (바이브 로그 — 바이브 코딩 제작기 자동 발행 블로그 + 쇼츠), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the readme.md file within this skill, and explore the other available files (tokens/, components/, ui_kits/, guidelines/).
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code (Next.js + Tailwind), map the tokens in tokens/*.css to the Tailwind theme and re-implement components/ with the same values — do not invent new colors, radii, or type sizes.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Hard rules: dark only; one accent (mint #5EE1C3); orange only for building/삽질, red only for failure; Noto Sans KR 700 headings (900 only for the wordmark and shorts) + JetBrains Mono meta as lowercase one-liners (no chip rows, no stat tiles, no progress bars by default, no glow); never leave an empty area — use EmptyState with the three-line rule from readme "## Empty states"; no icon set (unicode glyphs); no emoji outside the approval bot keyboard; 존댓말; every devlog shows its raw material ("AI가 커밋 N개로 작성").
