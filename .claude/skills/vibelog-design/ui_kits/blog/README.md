# Blog UI kit (mobile-first, responsive)

vibelog 블로그의 화면 4종 + 쇼츠 탭. 하나의 컴포넌트 트리가 `useBreakpoint()`(mobile <720 / tablet <1024 / desktop)로 레이아웃을 바꾼다.

| 화면 | mobile | tablet | desktop |
|---|---|---|---|
| Shell 헤더 | 워드마크 + 다음 실행 / 풀폭 Tabs (2줄), 폭 430 | 한 줄: 워드마크 · Tabs · 다음 실행, 패딩 24 | 같음, 패딩 32 |
| 컨텐츠 폭 | 430 | 680 (본문) · 1120 (홈·쇼츠·상세) | 같음 |
| Home | 제목·설명 → 사실 줄(구분선 위) → 카드 스택 → RunLog → 최근 5편 | 카드 2열, RunLog ｜ 최근 2열 | 제목 ｜ 숫자 열, **2컬럼**(카드 ｜ RunLog + 최근) |
| ProjectDetail | 세로 (dl 사실 목록) | 헤더 2열(설명 ｜ dl) → 타임라인 | 340px sticky 헤더 ｜ 타임라인 |
| DevlogPost | 680 읽기폭, h1 22 | h1 30 | 같음 |
| ShortsTab | 2열 + 렌더 대기 목록 | 3열 | 4열 |

- `index.html` 모바일 홈 · `desktop.html` 데스크톱 홈 · `feed.html` · `shorts.html` · `empty.html`(첫 실행 전, `App empty` prop). 뷰포트를 바꾸면 같은 파일이 반응한다.
- 많은 프로젝트: `many.html` · `many-feed.html` (`App many` prop → `MANY_PROJECTS` 13개). 홈은 building/live만 카드 + 접힌 목록, 피드 필터는 ProjectFilter(칩 ≤8 → Select).
- 빈 상태: 홈 3곳 · 상세 타임라인(wallet-notes) · 피드 필터 · 본문(삽질/스크린샷/쇼츠/EN) · 쇼츠 탭. 문구는 readme.md '## Empty states' 표가 원본.
- 라우팅은 `App.jsx` 상태(뒤로 = 스택 pop). 데이터는 `Data.jsx`.
- 프로덕션(Tailwind)에서는 breakpoint를 `md:720 lg:1024`로 매핑.
