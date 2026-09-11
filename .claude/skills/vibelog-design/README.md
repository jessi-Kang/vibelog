# Handoff: Vibelog 디자인 시스템 + 블로그 화면

## Overview
Vibelog(바이브 로그) — 바이브 코딩 프로젝트들의 제작기·현황을 자동 발행하는 블로그(Next.js App Router + Tailwind + MDX, Vercel) + 쇼츠(Remotion) + 승인 봇(텔레그램). 이 패키지는 그 세 표면의 디자인 시스템과 블로그 화면 5종(홈·프로젝트 상세·데브로그 피드·데브로그 본문·쇼츠 탭)의 목업이다. 레포의 `CLAUDE.md` · `docs/01~04`가 제품 원본이고, 이 패키지는 그 위에 얹는 **시각 규격**이다.

## About the Design Files
여기 든 파일은 **HTML/React(JSX, Babel standalone)로 만든 디자인 레퍼런스**다. 의도한 모양·동작을 보여주는 프로토타입이며, 그대로 배포하는 코드가 아니다. 할 일은 이 디자인을 **vibelog 레포의 Next.js + Tailwind 환경에 다시 구현**하는 것. 컴포넌트 JSX는 인라인 스타일로 쓰여 있으니 값(색·크기·간격)은 그대로 가져가고, 표현은 Tailwind 유틸리티 / `@theme` 토큰으로 옮긴다.

## Fidelity
**High-fidelity.** 색·타이포·간격·라운드·상태·빈 상태·반응형 규칙이 전부 확정값이다. 픽셀 단위로 재현할 것. 단, 데이터(프로젝트 3개, 데브로그 3편)는 `ui_kits/blog/Data.jsx`의 샘플 — 실제 값은 `content/projects.json`, `content/devlog/<repo>/<date>.md`에서 온다.

## 어디부터 읽나
1. `DESIGN_SYSTEM.md` — 원칙·토큰·컴포넌트·**손맛 규칙(AI 티 빼기)**·**프로젝트가 많아질 때**·**Empty states 표**. 이 문서가 1차 진실.
2. `tokens/*.css` — CSS 변수 원본. Tailwind `@theme`으로 1:1 매핑 (아래 표).
3. `components/**/*.jsx` + `.d.ts` + `.prompt.md` — 컴포넌트별 구현·props·사용 규칙.
4. `ui_kits/blog/*.jsx` — 화면 조립. `App.jsx`(라우팅) → `Shell.jsx`(헤더·푸터·폭) → `Home / ProjectDetail / Feed / DevlogPost / ShortsTab`.
5. 브라우저로 열어 보려면 `ui_kits/blog/index.html`(모바일) · `desktop.html` · `empty.html`(첫 실행 전) · `many.html`(프로젝트 13개). 로컬 HTTP 서버가 필요하다(`npx serve .`) — fetch로 JSX를 읽는다.

## Screens / Views

### 공통 — Shell (`ui_kits/blog/Shell.jsx`)
- 페이지 배경 `#0A0E14`, 텍스트 `#F3EFE6`, Noto Sans KR. 헤더 sticky, 하단 1px `#26313F`.
- **모바일(<720)**: 헤더·본문·푸터 모두 max-width 430, 패딩 20. 헤더 2줄 — 1줄 워드마크(`vibelog` 18px/900) ｜ 모노 12px muted "다음 실행 23:00", 2줄 풀폭 Tabs(프로젝트 / 데브로그 / 쇼츠). 상세 화면에서는 1줄이 ← 뒤로 + 모노 경로(`projects / vibelog`)로 바뀌고 Tabs는 숨김.
- **태블릿(720–1023)**: 패딩 24. 헤더 한 줄 — 워드마크 ｜ Tabs + "다음 실행 23:00 KST". 본문 폭 1120(홈·쇼츠·상세) / 680(데브로그 본문).
- **데스크톱(≥1024)**: 패딩 32, 나머지 태블릿과 같음. 상세 화면은 헤더 아래 별도 줄에 ← 뒤로.
- main: flex 1, 섹션 사이 gap `--section-gap` 40(모바일) / 48(데스크톱). 푸터는 항상 화면 하단(`min-height: 100vh` + flex column).
- 푸터: 모노 12 muted, 좌 `© 2026 Jessi` 우 `github ↗`. 슬로건 없음.

### 1. 홈 (`Home.jsx`)
1. **마스트헤드**: h1 "만들고 있는 것들의 **기록**"(기록만 `#5EE1C3`) 24/28/34px 700 lh1.25 ls -.015em; 설명 p 15/16px muted lh1.65 — 태블릿↑ nowrap, 모바일만 줄바꿈; **사실 줄** 모노 12 muted — 모바일·태블릿은 상단 1px 선 + 패딩 14 아래 가로 나열(숫자 15px sans 700 민트), 데스크톱은 오른쪽 열(숫자 22px). 항목: `{N} projects · {N} 만드는 중 · {N} 오늘 움직임 · {N} 데브로그`. 0은 muted.
2. **프로젝트** — SectionHeader "프로젝트" (5개↑면 aside "최근 활동순 · N"). ProjectCard 스택(모바일 1열, 태블릿 2열, 데스크톱 1열 / 7개↑ 2열). **5개 이상이면 building·live만 카드**, paused·idea는 카드 아래 Card(padding 0) 안 접힌 목록(이름 sans 14/700 soft · StatusBadge · 마지막 활동, 행 패딩 12/18) + ghost 버튼 "쉬는 프로젝트 N개 카드로 펼치기".
3. **지난 실행** — aside `09-14 23:00`. RunLog.
4. **최근 데브로그** — aside 링크 `전체 →`. Card(padding 0) 안 DevlogEntry compact 최대 5편.
- 태블릿: 3·4를 2열 grid(gap 24). 데스크톱: 2 ｜ (3+4) 2컬럼 grid(gap 40).

### 2. 프로젝트 상세 (`ProjectDetail.jsx`)
- 헤더: h1 이름 22/26px 700 · 설명 15 soft · 링크 `{slug}.vercel.app ↗` 모노 13 민트 · **dl 사실 목록**(모노 12, dt muted / dd ink, grid `auto 1fr` gap 8/16): 상태(StatusBadge) · 스택 · 이번 주 커밋 · 마지막 활동 · 데브로그 N편 · 시작 day NN. 스택 비면 `—`, idea면 EmptyState compact "아직 레포 정보가 비어 있습니다".
- 태블릿: 헤더를 설명 ｜ dl 2열(1.4fr 1fr). 데스크톱: 340px sticky(top 90) 사이드 ｜ 타임라인(gap 48).
- 타임라인: SectionHeader "데브로그" aside "N편 · 하루 한 글" → DevlogEntry(timeline) gap 28. 글 0이면 EmptyState(문구는 Empty states 표).

### 3. 데브로그 피드 (`Feed.jsx`)
- SectionHeader "데브로그" → **ProjectFilter**(전체 + 프로젝트, 글 수 표시; ≤8 스크롤 칩, >8 Select) → DevlogEntry timeline(repo 표시) 10편 → secondary full 버튼 "이전 글 N편 더". 필터 결과 0이면 EmptyState + "전체 보기" 버튼.

### 4. 데브로그 본문 (`DevlogPost.jsx`) — 읽기폭 680
- 상단: 모노 12 muted `2026-09-14 · 일  vibelog →` ｜ Tabs KO/EN. h1 22/28px 700 lh1.3. 모노 12 muted `AI가 커밋 4개 · PR 1개로 작성 · day 06 · 쇼츠 있음`.
- 본문 섹션(gap 32): h2 15px 700("뭘 했다" / "왜" / "삽질 포인트"(`#FFB454`) / "다음 할 것" / "스크린샷") + p 15 soft lh1.75. 삽질 없으면 muted "오늘은 없었습니다. 커밋 N개가 한 번에 붙었습니다." 스크린샷은 390:260 패널(homepage 없으면 EmptyState).
- 쇼츠 카드(있으면) / EmptyState(없으면). **원료 · git log**: inset Card, 행마다 모노 12 muted sha + soft 메시지, 행 구분 1px.
- EN 탭은 번역 준비 전이면 EmptyState + "한국어로 읽기 →".
- 하단 링크 `{repo}의 다른 날 →` 모노 13 민트.

### 5. 쇼츠 탭 (`ShortsTab.jsx`)
- 9:16 썸네일 grid 2/3/4열(gap 12/20). 썸네일: `#05080C` + 상단 민트 halo, eyebrow 모노 8px, 훅 17px 900, 하단 템플릿명·길이 모노 9px. 아래 제목 13/700, 모노 11 meta.
- **렌더 대기** 섹션: 모노 12 행 목록(제목 ｜ 템플릿 · 대본 대기).

## Interactions & Behavior
- 카드/행 클릭 → 상세·본문 라우트. 뒤로는 히스토리 pop. 탭 전환 시 스택 초기화, 스크롤 top.
- hover: Card 라인 `#26313F → #3A4656`, DevlogEntry 제목 민트, Button opacity .85 / press scale .98. 전부 150ms `cubic-bezier(.4,0,.2,1)`. 그림자·글로우·바운스 없음.
- reveal(Dialog·Toast) 280ms `vl-rise`(12px 위로 + fade). RunLog 커서 `▍` 1s steps blink.
- 로딩: 스켈레톤 대신 모노 한 줄 "불러오는 중…" 권장. 로드 시 토스트·배너 없음.
- 반응형 breakpoint 720 / 1024 (`useBreakpoint.jsx` → Tailwind `md:720 lg:1024`로 재정의).

## State Management
- 라우트 `{screen: home|feed|shorts|project|post, id}` + 히스토리 스택 → Next.js에서는 `app/page.tsx`, `app/projects/[slug]`, `app/log`, `app/log/[repo]/[date]`, `app/shorts`로 매핑.
- Home: `showRest`(쉬는 프로젝트 펼침). Feed: `filter`(slug|'all'), `page`(10 단위). DevlogPost: `lang`(ko|en).
- 데이터: `content/projects.json`(status 자동 판정 idea/building/live/paused), `content/devlog/<repo>/<date>.md`(frontmatter: title, commits, prs, fails, short, shas), `content/state.json`(지난 실행). 이번 주 커밋·오늘 움직임은 collect 단계에서 계산해 projects.json에 넣는다.

## Design Tokens → Tailwind 매핑
`tokens/colors.css` · `typography.css` · `spacing.css` · `motion.css` 그대로 `@theme`에 등록. 핵심:

| 토큰 | 값 | 용도 |
|---|---|---|
| bg-deep / bg / panel / panel-2 | #05080C / #0A0E14 / #141B24 / #1B2430 | 스테이지 밖 / 페이지·inset / 카드 / raised |
| line / line-strong | #26313F / #3A4656 | 1px 라인 / hover·paused 띠 |
| ink / ink-soft / muted | #F3EFE6 / #C9CFD8 / #8C98A8 | 본문 / 보조 / 메타 |
| accent / accent-ink | #5EE1C3 / #06261F | 민트(유일한 강조) / 민트 위 글자 |
| warn / danger | #FFB454 / #FF6B6B | building·삽질 / 실패·반려만 |
| text 11 12 13 14 15 18 22 34 | px | 2xs xs sm base md lg xl 2xl |
| weight | 400/500/700 · 900은 워드마크·쇼츠만 | |
| radius | 4 6 10 **12** pill · 쇼츠 20/28/70 | 체크박스 · Tag · 버튼 · 카드 |
| section-gap / head-gap | 40(모바일) 48(데스크톱) / 14 | 섹션 사이 / 제목↔내용 |
| content-max / mobile / reading | 1120 / 430 / 680 | |
| dur fast / base / slow | 150 / 280 / 450 ms | |

폰트: Google Fonts `Noto Sans KR 400 500 700 900` + `JetBrains Mono 500 700` (`tokens/fonts.css`). 렌더 환경(Remotion/Playwright)에는 Noto Sans CJK KR 로컬 설치.

## Assets
- 로고 없음. 워드마크는 텍스트(`vibelog` **JetBrains Mono 700** — 코드 느낌, Jessi 지시. 쇼츠 타이포의 Noto Sans KR 900은 별개). 파비콘·OG도 같은 터미널 톤(`v_` 글리프 / 모노 워드마크).
- 아이콘 세트 없음. 모노 유니코드 글리프만: ● ✓ ✗ → ↗ × ⋯ ▾ ▍ $ ▶ ·
- 이모지는 텔레그램 인라인 키보드 ✅ ✏️ ❌ 에서만.
- 이미지는 Playwright 캡처만. 자리표시는 EmptyState.

## Files
- `DESIGN_SYSTEM.md` — 전체 가이드 (원본 readme)
- `SKILL.md` — Claude Code 스킬 파일. 레포 `.claude/skills/vibelog-design/`에 이 폴더를 통째로 넣으면 스킬로 동작
- `styles.css`, `tokens/` — CSS 변수
- `components/{core,forms,navigation,feedback,vibelog}/` — 컴포넌트 JSX · d.ts · prompt.md · `*.card.html` 데모
- `ui_kits/blog/` — 블로그 화면(App·Shell·Home·ProjectDetail·Feed·DevlogPost·ShortsTab·Data·useBreakpoint) + html 진입점 7개
- `ui_kits/shorts/` — 쇼츠 템플릿 3종 키프레임(Remotion 포팅 기준)
- `ui_kits/telegram/` — 승인 봇 미리보기
- `guidelines/` — 스펙 카드 15장(html)
- `tools/ds-loader.js` — 데모 전용 JSX 로더. 프로덕션에 가져가지 않는다
- `source/` — 색·타이포 원본인 `03-shorts-spec.md`와 승인된 `shorts-prototype.html`
