# Vibelog Design System

**Vibelog(바이브 로그)** — 바이브 코딩 프로젝트들의 제작기·현황을 *자동 발행*하는 블로그 + 쇼츠 파이프라인. 원칙은 "커밋이 곧 콘텐츠": 사람(Jessi)은 코딩과 승인 탭만 하고, GitHub Action → Claude → ElevenLabs → Remotion이 데브로그·쇼츠를 만든다.

이 디자인 시스템은 세 표면을 덮는다:
1. **블로그 (Next.js, 모바일 우선)** — 프로젝트 카드 그리드(홈) · 프로젝트 상세 + 타임라인 · 전체 데브로그 피드 · 데브로그 본문 · 쇼츠 탭
2. **쇼츠 (1080×1920, Remotion)** — 템플릿 3종: Ship it · 오늘의 삽질 · Before / After
3. **승인 봇 (텔레그램)** — 글 + 영상 미리보기 → ✅ ✏️ ❌

## Sources

- `uploads/vibelog-docs/CLAUDE.md` — 원칙·스택·컨벤션
- `uploads/vibelog-docs/docs/01-concept.md` · `02-pipeline-and-setup.md` · `04-roadmap-sessions.md` — 컨셉, 파이프라인, 로드맵
- `uploads/vibelog-docs/docs/03-shorts-spec.md` — **색·타이포 원본**. 배경 #0A0E14, 패널 #141B24/#1B2430, 라인 #26313F, 텍스트 #F3EFE6/#8C98A8, 민트 #5EE1C3, 경고 #FFB454, Noto Sans KR + JetBrains Mono
- `uploads/vibelog-docs/docs/shorts-prototype.html` — 승인된 Ship it 샘플 (컴포넌트 치수의 원본)
- `samples/A · B · C` — 이 세션에서 제안한 블로그 방향 3종. **C(현황판)** 채택. A(로그형)·B(에디토리얼)는 참고용으로 남김.

로고 없음 — 제공된 소스에 마크가 없어 만들지 않았다. 워드마크(소문자 `vibelog`, Noto Sans KR 900)가 마크 역할.

## 손맛 규칙 (AI 생성 티 빼기)

- **숫자는 글자로.** 현황판 숫자 타일·진행바를 기본으로 깔지 않는다. "3 projects · 오늘 움직인 레포 1" 같은 모노 한 줄이 기본. StatPanel·ProgressBar는 4단계 현황판(조회수 추이)처럼 숫자가 주인공일 때만.
- **칩 대신 문장.** 메타는 `커밋 4 · PR 1 · day 06` 처럼 가운뎃점으로 이은 모노 한 줄. Tag/Badge는 상태(live/building)와 쇼츠 템플릿 pill 정도에만.
- **대문자 eyebrow 남발 금지.** 섹션 제목은 한국어 Sans 700 소문자 톤("뭘 했다", "지난 실행"). 모노 대문자는 상태(● LIVE)와 쇼츠 eyebrow에만.
- **글로우·펄스 없음.** 헤더의 "다음 실행 23:00"은 평범한 모노 텍스트. 살아있는 점·pill 배지 없음. 민트 글로우는 쇼츠 폰 하이라이트·포커스 링에만.
- **900은 워드마크와 쇼츠에만.** 웹 제목은 전부 700. 카드 라운드는 12(16 아님), 카드에 그림자·좌측 컬러 바 없음. 상태는 상단 3px 띠 하나로.
- **첫 화면은 무엇을 하는 곳인지.** 홈 상단은 지표가 아니라 제목 한 줄("만들고 있는 것들의 기록") + 설명 한 문장. 자동 생성은 설명 뒤에 붙는 사실이지 헤드라인이 아니다. 태그라인·슬로건("글은 AI가 · 코드는 Jessi가") 푸터에 넣지 않는다.
- **로드 시 토스트·환영 배너 없음.** 알림은 사용자가 뭔가 했을 때만.
- **날짜는 사람이 읽는 형태.** `2026-09-14 · 일` (SUN 아님), 리스트는 `09.14`.

## Content fundamentals

- **존댓말, 담담하게.** 데브로그 본문과 쇼츠 내레이션 톤 통일. "밤 11시에 깃헙 액션이 돌아서 그날 커밋으로 데브로그를 씁니다."
- **원료를 드러낸다.** 모든 글에 `AI가 커밋 4개 + PR 1개로 작성` 같은 메타를 붙인다. 사람이 쓴 척하지 않는다.
- **구조는 고정:** 뭘 했다 / 왜 / 삽질 포인트 / 다음 할 것 / 스크린샷. 삽질은 warn(주황)으로 따로 보인다 — 반응 제일 좋은 포맷.
- **UI 라벨은 두 층:** 한국어 사람말(프로젝트, 데브로그, 지난 실행)은 Sans, 시스템 메타(status board, active today, ko · en, 09.14)는 **소문자/대문자 모노**. 레포명·스택은 원문 그대로 소문자(`job-board`, `next.js`).
- **한국어 원본 + EN 자동 번역.** EN 뷰에는 "자동 번역본입니다" 한 줄.
- **이모지 없음.** 예외: 텔레그램 인라인 키보드 ✅ ✏️ ❌ (컨셉 문서의 승인 UX).
- **금지:** 느낌표, 마케팅 어휘("혁신적인"), 반말, 손으로 쓰는 UI 제안.
- 쇼츠 대본: 훅(3~4초) → 뭘 만들었나 → 화면 데모 → 삽질 → 다음 할 것 → 엔드카드. 문장당 키워드 1~3개를 `^단어`로 마킹.

## Visual foundations

- **색.** 근검한 다크. 배경 4단(bg-deep → bg → panel → panel-2)으로 깊이를 만들고, 그림자는 쓰지 않는다. 잉크는 따뜻한 아이보리(#F3EFE6) — 순백 없음. 강조색은 **민트 하나**(#5EE1C3): 키워드, live, 완료 ✓, 링크, 진행바. 주황(#FFB454)은 building과 삽질에만, 빨강(#FF6B6B)은 실패·반려에만. 민트 위 글자는 진녹 #06261F.
- **상태 색 매핑.** idea 아이보리 / building 주황 / live 민트 / paused muted(띠는 line-strong). 카드 상단 3px 스트라이프 + `● LIVE` 모노 텍스트로 같은 색을 두 번 말한다.
- **타이포.** Noto Sans KR — 웹 제목 700, 본문 400/500, 900은 워드마크·쇼츠 디스플레이만. JetBrains Mono — 메타·상태·로그, 대문자 라벨은 상태·쇼츠 eyebrow에만(자간 .08em), 그 외 모노는 소문자 사실 한 줄. 웹 스케일 11 / 12 / 13 / 14 / 15 / 18 / 22 / 34. 쇼츠 스케일 훅 132 / 삽질 110 / 자막 62(900) / eyebrow 30 / 푸터 24. 34px 이상만 자간 -.02em. `word-break: keep-all`, `text-wrap: pretty`.
- **간격.** 4px 기반. 카드 안 gap 10, 카드 패딩 18/20, 카드 사이 12(모바일)·20(데스크톱). **섹션 사이 40(모바일)/48(데스크톱), 섹션 제목↔내용 14** — `--section-gap`, `--section-head-gap`. 섹션 경계는 여백으로만, 구분선 없음. 페이지 패딩 20. 모바일 컬럼 430, 데스크톱 1120 → `grid(auto-fit, minmax(320px,1fr))`.
- **라운드.** 웹 6(태그) / 10(버튼·인풋·탭) / 12(카드·패널) / pill. 쇼츠 20/28(카드) / 70(폰). 쇼츠 프레임 안에서는 라인 2px, 웹은 1px.
- **카드.** panel 배경 + 1px line + 12 라운드 + (상태가 있으면) 상단 3px 띠. 안에 진행바·칩 없음, 메타는 모노 한 줄. hover는 라인이 line-strong으로, 그림자 없음. 포커스/하이라이트는 `0 0 0 6px accent-glow`. paused는 opacity .8.
- **배경.** 단색. 이미지·패턴·그레인 없음. 유일한 장식은 쇼츠 스테이지 상단의 민트 halo(radial-gradient 10%). 웹에는 글로우 없음.
- **모션.** ease cubic-bezier(.4,0,.2,1). hover/press 150ms(opacity .85, scale .98) · 단어 켜짐/reveal 280ms(vl-rise 12px) · 쇼츠 씬 크로스페이드 450ms · 폰 자동 스크롤 1400ms. 바운스·스프링 없음. 커서는 ▍ 1s steps 블링크.
- **투명·블러.** 오버레이 rgba(5,8,12,.72)만. backdrop blur 없음. soft 배경은 15% 알파(accent-soft, warn-soft).
- **이미지.** 실제 배포 사이트의 Playwright 캡처만. 생성 이미지·일러스트 없음. 자리표시는 dashed line-strong 박스 + 모노 설명.
- **반응형.** 모바일 우선. <720 단일 컬럼 430 · 720~1024 태블릿(헤더 한 줄, 카드 2열) · ≥1024 데스크톱(홈 2컬럼, 상세 360px sticky 사이드, 쇼츠 4열). 본문(데브로그)은 어느 폭에서도 읽기폭 680. 헤더 sticky. Toast는 하단 fixed 430 max.

## 프로젝트가 많아질 때

topic 하나로 등록되므로 프로젝트 수는 통제 밖이다. 3개에서 30개까지 같은 화면이 버텨야 한다.

- **홈 카드는 "만드는 중"만.** 프로젝트 5개 이상이면 building·live만 카드, paused·idea는 카드 아래 접힌 한 줄 목록(이름 · 상태 · 마지막 활동) + "카드로 펼치기". 정렬은 항상 최근 활동순. 데스크톱은 7개부터 카드 2열.
- **상단 내비는 고정 3탭.** 프로젝트 / 데브로그 / 쇼츠 — 프로젝트별 탭을 만들지 않는다.
- **피드 필터는 Tabs가 아니라 ProjectFilter.** ≤8개: 가로 스크롤 모노 pill('전체'가 첫 칩, 글 수 회색 숫자). >8개: 같은 옵션을 Select로. 글 많은 순 정렬.
- **리스트는 10편씩.** 피드는 "이전 글 N편 더" 버튼(무한 스크롤 없음). 홈 최근 데브로그는 5편 + "전체 →".
- **긴 이름·빈 메타.** 카드 제목은 한 줄 말줄임, 스택이 비면 '—', idea 프로젝트 상세엔 "레포 정보가 비어 있습니다" EmptyState.
- 재현: `ui_kits/blog/many.html`(홈 13개) · `many-feed.html`(필터 Select 전환).

## Empty states

비워두지 않는다. 모든 빈 자리는 `EmptyState`(dashed line-strong 박스)로 세 줄을 말한다: **무엇이 없고 왜** / **언제 채워지는지(파이프라인 관점)** / **할 수 있는 한 가지(모노 코드)**. 일러스트·아이콘·이모지 없음. 액션은 Jessi의 손품이 늘지 않는 것만.

| 자리 | 제목 | 본문 | hint |
|---|---|---|---|
| 홈 · 프로젝트 0 | 아직 등록된 프로젝트가 없습니다 | GitHub 레포에 topic 하나를 달면 다음 23:00 실행에 카드가 생깁니다. | `gh repo edit --add-topic vibelog` |
| 홈 · 실행 기록 0 | 아직 실행 기록이 없습니다 | 매일 23:00 KST에 자동으로 돌고, 지금 바로 돌릴 수도 있습니다. | `gh workflow run devlog.yml` |
| 홈 · 글 0 | 아직 글이 없습니다 | 커밋이 생기면 그날 밤 첫 글이 올라옵니다. 활동 없는 날은 건너뜁니다. | — |
| 상세 · paused 프로젝트 | {N주 전}부터 조용해서 글이 없습니다 | 커밋이 생기면 다음 23:00 실행에 첫 글이 올라옵니다. 커밋 본문에 '왜'를 쓰면 글이 덜 밍밍해집니다. | `git log --since=today {repo}` |
| 피드 · 필터 결과 0 | {repo}에는 아직 글이 없습니다 | (paused면) {N주 전}부터 커밋이 없습니다. | action: 전체 보기 |
| 본문 · 삽질 없음 | (섹션 유지) 오늘은 없었습니다. 커밋 N개가 한 번에 붙었습니다. | — | — |
| 본문 · 스크린샷 없음 | 스크린샷이 없습니다 | 레포에 homepage가 없어 캡처를 건너뛰었습니다. | `gh repo edit --homepage https://…` |
| 본문 · 쇼츠 없음 | 이 글의 쇼츠는 아직 없습니다 | 쇼츠는 배포 커밋이 있거나 삽질이 뚜렷한 날만 만듭니다. | — |
| 본문 · EN 없음 | 영어 번역이 아직 없습니다 | 번역은 한국어 글이 승인된 뒤 같은 실행에서 만들어집니다. | action: 한국어로 읽기 |
| 쇼츠 탭 · 0 | 아직 쇼츠가 없습니다 | 데브로그가 승인된 뒤 같은 밤에 렌더됩니다. 첫 편은 배포 커밋이 있는 날. | `content/shorts/<repo>/<date>.json` |
| 승인 봇 · 큐 0 | 대기 중인 글이 없습니다 | 오늘 밤 23:00에 다시 옵니다. 반려한 글은 다음 실행에 다시 생성합니다. | — |
| 실행 실패 | (RunLog에 ✗ 줄) + Toast danger | 실패해도 데브로그 발행은 막지 않는다 — 쇼츠 단계만 건너뜀 | action: 재시도 |

`ui_kits/blog/empty.html`이 첫 실행 전 상태(프로젝트 0)를 통째로 보여준다. 상세·본문의 빈 자리는 `wallet-notes`·`job-board` 데이터로 재현된다.

## Iconography

아이콘 세트 없음(SVG·아이콘 폰트 모두). 모노 폰트의 유니코드 글리프가 아이콘: `●` 상태 · `✓` 완료 · `✗` 실패 · `→` 다음/링크 · `↗` 외부 링크 · `×` 닫기 · `⋯` 더보기 · `▾` 셀렉트 · `▍` 커서 · `$` 명령 · `▶` 재생 · `·` 구분. 이모지는 승인 봇 키보드에서만. 새 아이콘이 필요하면 글리프에서 먼저 찾고, 없으면 텍스트 라벨.

## Index

- `styles.css` — 진입점 (@import만). `tokens/fonts.css`(Google Fonts) · `colors.css` · `typography.css` · `spacing.css` · `motion.css`
- `guidelines/` — 스펙 카드 15장 (Colors 4 · Type 3 · Spacing 3 · Motion 1 · Brand 3 · Patterns 1)
- `components/`
  - `core/` Button · IconButton · Badge · Tag · Card
  - `forms/` Input · Select · Checkbox · Radio · Switch
  - `navigation/` Tabs · ProjectFilter · SectionHeader · Wordmark
  - `feedback/` Dialog · Toast · Tooltip · ProgressBar · EmptyState
  - `vibelog/` StatusBadge(+STATUS 맵) · StatPanel · ProjectCard · RunLog · DevlogEntry · Eyebrow · Caption
- `ui_kits/blog/` — 반응형 블로그 (index 모바일 홈 · desktop 데스크톱 홈 · feed · shorts · empty 첫 실행 전 · many/many-feed 13개 프로젝트; 홈 → 상세 → 본문 클릭스루). breakpoint 720 / 1024
- `ui_kits/shorts/` — 9:16 템플릿 3종 키프레임 (Stage · Phone · AppScreen)
- `ui_kits/telegram/` — 승인 봇 미리보기 (인터랙티브 3분기)
- `samples/` — 방향 제안 A/B/C (Design Component)
- `tools/ds-loader.js` — 카드·킷 로더: 번들 네임스페이스가 있으면 쓰고, 없으면 .jsx를 직접 트랜스파일
- `SKILL.md` — Claude Code용 스킬

### Intentional additions
- **Wordmark** — 로고 부재를 대신하는 타입 마크.
- **RunLog · Eyebrow · Caption** — 쇼츠 프로토타입에 있던 패턴을 컴포넌트화. **StatPanel**은 4단계 현황판용으로 남겨두되 기본 홈에서는 쓰지 않는다.
- **EmptyState** — 빈 자리 규칙. 소스에 없음.
- **Dialog · Toast · Tooltip · 폼 세트** — 소스에 없음. 사용자 요청("표준 세트까지")으로 추가. 3단계 승인 봇·설정 화면용.

### Caveats
- 폰트는 Google Fonts @import. 렌더 환경(Remotion/Playwright)에는 Noto Sans CJK KR 로컬 설치 필수 (spec 문서 그대로). 폰트 바이너리는 포함하지 않았다.
- 쇼츠 킷은 키프레임(정지 화면). 타임라인·오디오 규칙은 `docs/03-shorts-spec.md`와 `docs/shorts-prototype.html`이 원본.
