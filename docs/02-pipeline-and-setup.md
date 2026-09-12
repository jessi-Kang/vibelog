# 바이브 로그 (Vibelog) — Claude Code 개발 시작 준비

컨셉은 `docs/01-concept.md` 참고. 이 문서는 "코딩 시작 전에 뭘 갖춰둘지" 체크리스트.
(2026-09-09 개정: 데브로그 수집을 로컬 훅 푸시 → **GitHub 레포 pull 방식**으로 변경)

## 0. 동작 원리 한 장

```
[각 프로젝트 레포]  ← 별도 Claude Code 세션에서 평소처럼 코딩 + push
  ├─ 커밋 메시지 / PR 본문
  ├─ README, description, homepage(배포 URL), language
  ├─ (선택) devlog/*.md   ← 전역 Stop 훅이 세션 요약을 레포 안에 남김
  └─ (선택) vibelog.json  ← 카드 정보 덮어쓰기용

[vibelog GitHub Action]  ← 밤 23:00 KST 자동 (백업 23:45·01:00·03:00) + workflow_dispatch 수동
  1. GitHub API: topic `vibelog` 달린 내 레포 전부 조회
  2. 레포별 체크포인트(state.json) 이후의 커밋·PR·devlog 파일 수집
  3. 활동 있는 레포만 Claude API → 데브로그 생성 (KR 원본 + EN)
  4. content/devlog/<repo>/<date>.md 저장, content/projects.json 갱신, state.json 갱신
  5. 쇼츠 생성 (대본 → 음성 → 화면 녹화 → Remotion 렌더 → Blob 업로드)
  6. 커밋 → Vercel 자동 배포

[이 Cowork 채팅]  ← 기획·설계만. 파이프라인에 관여하지 않음.
```

새 프로젝트 등록 = 레포에 topic `vibelog` 하나 달기. 그 외 Jessi가 하는 일 없음.

## 1. 계정 · 키

1단계(블로그)에 당장 필요한 것:
- GitHub 레포 `vibelog` (public 추천 — 도그푸딩 콘텐츠)
- Vercel 계정 + GitHub 연동
- 레포 Secrets:
  - `ANTHROPIC_API_KEY` — 데브로그 생성
  - `GH_PAT` — fine-grained PAT (Contents: read, Metadata: read, 대상: 모든 내 레포). private 프로젝트 레포까지 읽으려면 필수. public만이면 생략 가능하나 rate limit 때문에 권장.

2단계 이후 (지금은 안 해도 됨):
- ElevenLabs: 보이스 클론 **완료** → `ELEVENLABS_VOICE_ID=pwjMkbtUbj1hBa0RkN5N` (설정값은 docs/03-shorts-spec.md)
- 텔레그램: BotFather로 봇 생성 → 토큰 + 내 chat_id
- YouTube: Google Cloud 프로젝트 → YouTube Data API v3 → OAuth 클라이언트 → refresh token 1회
- Instagram: 비즈니스/크리에이터 전환 → Facebook 페이지 연결 → Meta 개발자 앱 → 장기 토큰
- Neon: 승인 큐·게시 이력 DB (이미 연결됨)

## 2. vibelog 레포 구조

```
vibelog/
├─ CLAUDE.md                     # 작업 규칙 (세션 시작 전 필독)
├─ app/                          # Next.js App Router
│   ├─ page.tsx                  #   프로젝트 카드 그리드
│   ├─ projects/[slug]/          #   프로젝트 상세 + 데브로그 타임라인
│   ├─ log/                      #   전체 피드 + 글 상세
│   ├─ shorts/                   #   쇼츠 그리드
│   ├─ offline/                  #   연결 없음 화면 (서비스 워커가 꺼낸다)
│   ├─ manifest.ts · icon.svg    #   PWA — 설치하면 주소창 없는 앱 창
│   └─ sitemap.ts · robots.ts · feed.xml/
├─ components/                   # UI. 다크 기본, 모바일은 하단 탭바
├─ lib/                          # content 로더 · 포맷 · SITE_URL
├─ public/sw.js                  # 서비스 워커 (없으면 안드로이드가 앱 대신 바로가기를 만든다)
├─ content/                      # 파이프라인 산출물 — 손으로 고치지 않는다
│   ├─ projects.json             #   레포 메타 기반 카드
│   ├─ devlog/<repo>/<date>.md   #   frontmatter manual: true면 보호
│   ├─ shorts/<repo>/<date>.*    #   대본 · 타이밍 · 화면 구간 (mp4는 Vercel Blob)
│   └─ state.json                #   레포별 마지막 처리 SHA · 시각 · 날짜 버킷
├─ scripts/
│   ├─ collect.ts                # GitHub API → 레포별 활동 수집 (Octokit)
│   ├─ generate.ts               # 수집 결과 → 데브로그 MDX (KR/EN)
│   ├─ script.ts                 # 데브로그 → 쇼츠 대본 (템플릿·다이어그램 선택)
│   ├─ audio.ts                  # TTS + 발음 교정 + 단어 타이밍
│   ├─ record.ts                 # 배포 사이트 화면 녹화 (문장↔화면 매칭)
│   ├─ render.ts · mux.ts        # Remotion 렌더 + 오디오 믹스
│   ├─ shorts.ts · poster.ts     # 쇼츠 전체 / 썸네일만 재생성 진입점
│   └─ run.ts                    # 전체 실행 (collect → generate → shorts → 커밋)
├─ video/src/                    # Remotion 컴포넌트 — 템플릿 3종 · 테마 5종 · 다이어그램 5종
└─ .github/workflows/
    ├─ devlog.yml                # 밤 발행 (23:00 + 백업 23:45·01:00·03:00) + workflow_dispatch
    ├─ projects.yml              # 30분마다 새 프로젝트 인식만
    └─ deploy-guard.yml          # Vercel 웹훅 누락 자가 복구
```

### 글 날짜는 "그 밤"이다

날짜 버킷은 실행 시각의 벽시계 KST 날짜가 **아니라** 거기서 6시간을 뺀 날이다
(`publishDateKST`). GitHub cron이 제때 안 돌기 때문이다 — 회차를 통째로
건너뛰거나(2026-09-11 23:00) 3시간 넘게 밀려서 돈다(예정 14:00 UTC → 실행 17:27).
벽시계로 잡으면 23:00 회차가 자정을 넘겨 돌 때 그날 글이 다음 날짜로 찍힌다
(실제로 9/11 글이 02:52에 발행돼 그날 낮 작업이 통째로 빠졌다).
경계는 KST 06:00 — 03:00까지 밀린 회차도 같은 날 글로 들어가고, 낮에 수동으로
돌리면 그날 날짜 그대로다. 먼저 돈 회차가 발행을 끝내면 뒤 회차는
`SCHEDULE_GUARD`가 바로 종료해 이중 발행·TTS 중복 비용이 없다.

## 3. 각 프로젝트 레포 쪽 규약 (최소)

- topic `vibelog` (필수)
- description 채우기 (카드에 그대로 씀)
- homepage(About Website)는 **안 채워도 된다** — 자동 감지 순서:
  ① About Website (채우면 언제나 우선 — 커스텀 도메인 의도용)
  ② Vercel API — 시크릿 `VERCEL_TOKEN`(+`VERCEL_TEAM_ID`)이 있으면, GitHub 연결이
     걸린 Vercel 프로젝트의 고정 production 도메인을 읽는다. **CLI로 올린 배포까지
     잡히는 유일한 경로**라 이게 기본. 토큰 발급: vercel.com/account/settings/tokens
  ③ GitHub Deployments 기록 — Vercel git 연동 배포가 남기는 기록의 environment_url
     (배포별 해시 주소라 배포마다 바뀌는 게 흠, 토큰 없을 때의 폴백)
- (선택) `vibelog.json` — `{ "name": "...", "status": "live", "stack": ["Next.js"], "hide": false }`
- (선택) `devlog/YYYY-MM-DD.md` — Stop 훅이 남기는 세션 요약

상태 자동 판정 기본값: 배포 주소가 있으면 **preview**(가배포), GitHub **Release를
1개 이상 발행**하면 **live** — "정식 공개" 선언은 Release 발행 하나뿐이다.
About Website는 주소 지정용일 뿐 상태와 무관 (주소만 채워도 live가 되던 사고의 교훈).
배포가 없으면 30일 내 커밋 building, 넘으면 paused. `vibelog.json`의 status가
있으면 언제나 그게 우선 — 예외적 강제 지정용 (vibelog 자신이 이걸로 live 고정).

### 커밋 메시지 규약 문구 (프로젝트 레포 CLAUDE.md에 복붙)

없어도 파이프라인은 돌지만, 글·쇼츠 품질이 커밋 메시지 품질을 그대로 따라간다.
새 프로젝트 레포의 CLAUDE.md에 아래 블록을 그대로 붙인다:

```markdown
## 커밋 규칙

이 레포의 커밋 메시지는 vibelog가 매일 밤 읽어 데브로그 글과 쇼츠 영상을
자동 생성하는 원료다. 커밋 메시지가 얇으면 글도 얇아진다.

- 한국어로 쓴다. 형식: `타입: 한 줄 요약` + 빈 줄 + 본문.
- 타입은 feat / fix / docs / chore / design / asset 중 하나. fix는 실제로
  깨졌던 것을 고쳤을 때만 쓴다 — 영상의 커밋 그래프가 타입별로 색을 입히고,
  fix 커밋은 글의 "삽질 포인트" 재료가 된다.
- 본문에 **"왜"**를 반드시 한 문장 이상 쓴다. 뭘 바꿨는지는 diff가 말해주니,
  왜 그렇게 했는지·뭘 시도하다 왜 버렸는지를 남긴다.
- 버그를 고친 커밋은 증상 → 원인 → 해결을 본문에 남긴다.
- 작업 단계가 끝날 때마다 커밋한다. 하루치를 한 커밋에 뭉치지 않는다.
- 커밋 메시지는 공개 블로그에 그대로 노출된다. 비밀 키·내부 URL·개인정보를
  쓰지 않는다.
```

### 운영 노트 — Vercel이 푸시를 놓칠 때

Vercel의 GitHub 웹훅이 드물게 푸시를 놓쳐 배포가 아예 생성되지 않는 일이
있다 (2026-09-11 관측 — 단발 누락뿐 아니라, 연속 푸시 4개가 1시간 넘게
전부 누락되는 장기 중단도 있었다. 커밋은 브랜치에 있는데 배포 목록에 없음).
파이프라인 문제가 아니고, **다음 아무 커밋이나 푸시되면 밀린 변경까지
통째로 배포되어 자가 복구**된다 (밤 23:00 발행 커밋이 자연 복구 지점).
급하면 Vercel 대시보드에서 최신 배포의 Redeploy 한 번이면 된다.
판별법: 사이트가 낡았는데 `git log origin/<branch>` 헤드 커밋이 Vercel
배포 목록(githubCommitSha)에 없으면 웹훅 누락이다.
**자가 복구 워크플로를 붙였다** — `deploy-guard.yml`이 푸시 3분 뒤 Vercel API로
배포 존재를 확인하고, 없으면 배포를 직접 만든다.

### 시계는 Vercel Cron이 쥔다

GitHub 예약은 못 믿는다. 30분 주기인 `projects.yml`이 실제로는 4시간 간격으로
돌았고(2026-09-12 실측: 22:21 → 00:26 → 04:51 → 08:59 → 12:47 UTC),
`devlog.yml`의 23:00 KST 회차는 통째로 안 떴다. 백업 회차를 더 깔아도 같이
밀리므로 슬롯으로는 못 이긴다.

그래서 **시각은 Vercel Cron이 재고, 실행은 그대로 Actions에서** 한다 —
ffmpeg·Playwright·Remotion을 45분까지 돌리는 일이라 서버리스로 옮길 것이 아니다.

```
vercel.json crons ──▶ /api/cron/devlog   ──▶ workflow_dispatch devlog.yml (guard: true)
                  └─▶ /api/cron/projects ──▶ workflow_dispatch projects.yml
```

- Vercel 환경변수 둘: `GH_PAT`(Actions: write)와 `CRON_SECRET`. 시크릿이 없으면
  라우트가 403으로 거절한다 — 아무나 부르면 Actions 분을 태울 수 있다.
- `guard: true`는 워크플로의 `SCHEDULE_GUARD`를 켠다. 이 밤에 이미 발행했으면
  조용히 끝나므로 백업 회차가 겹쳐도 이중 발행·TTS 중복 비용이 없다. Jessi가
  손으로 돌리는 Run workflow는 가드가 없다 (일부러 다시 돌리는 경우다).
- 워크플로의 `schedule:`은 지우지 않았다 — Vercel 쪽이 죽었을 때의 예비다.

### 운영 노트 — GitHub cron이 안 돌 때

정기 회차가 제때 안 도는 일이 잦다 (2026-09 관측: 예정 14:00 UTC → 실행 17:27,
그리고 23:00·23:45 두 회차가 통째로 누락된 날). 그래서 회차를 밤새 넉넉히 깔고
(23:00·23:45·01:00·03:00 KST) 날짜를 "그 밤"으로 잡는다 — 위 §2 참고.
그래도 아침까지 아무 회차도 안 떴으면 Run workflow로 수동 실행한다 (입력 비움).
확인: Actions → devlog → 목록에서 `event: schedule` 실행이 있는지.

## 4. 전역 Stop 훅 (`~/.claude/settings.json`)

한 번만 설치. 모든 Claude Code 세션 종료 시 실행되어 **현재 레포의** `devlog/YYYY-MM-DD.md`에 세션 요약을 append. 형식: 뭘 했다 / 왜 / 삽질 포인트 / 다음 할 것.
- 현재 폴더가 git 레포가 아니거나 topic이 없어도 그냥 파일만 남김 (해가 없음)
- 커밋은 안 함. 다음 push 때 코드와 같이 올라감.
- 첫 vibelog 세션에서 Claude Code에게 이 훅 스크립트를 만들게 하면 됨.

## 5. CLAUDE.md

초안은 이 문서에 있었으나 지금은 레포 루트의 [`CLAUDE.md`](../CLAUDE.md)가
실물이자 최신이다 — 원칙·스택·컨벤션·쇼츠 규칙·하지 말 것이 거기 모여 있다.
세션을 시작할 때 그 파일부터 읽는다. (여기에 사본을 두면 반드시 갈라진다.)

## 6. 1단계 스코프 (첫 주말) — 완료

- [x] Next.js 블로그가 Vercel에 배포됨 (지금은 커스텀 도메인 [vibelog.space](https://vibelog.space))
- [x] `scripts/collect.ts`가 topic `vibelog` 레포들의 커밋·PR·devlog를 가져옴
- [x] `scripts/generate.ts`가 Claude API로 데브로그 MDX 생성 (KR/EN)
- [x] `devlog.yml`이 매일 밤 + 수동 실행되며 content/ 를 커밋
- [x] 프로젝트 카드 그리드 + 프로젝트 상세 타임라인 렌더
- [x] 전역 Stop 훅 설치
- [x] vibelog 레포 자체에 topic `vibelog` 달고, 첫 데브로그가 자동 생성되어 블로그에 뜸

2단계(쇼츠)도 끝났다 — 대본·음성·녹화·렌더·업로드가 밤 실행에 붙어 있다.
남은 것은 3단계(승인 큐·텔레그램 게시)와 4단계(현황판). `docs/04-roadmap-sessions.md`.

## 7. 첫 세션 프롬프트 (복붙용)

세션 1 — 블로그 뼈대:
```
vibelog 레포를 초기화하자. CLAUDE.md를 먼저 읽어.
1. Next.js App Router + TS + Tailwind + MDX 셋업
2. content/projects.json → 메인 프로젝트 카드 그리드
3. content/devlog/<repo>/<date>.md → 프로젝트 상세 타임라인 + 전체 피드
4. 샘플 데이터(vibelog 프로젝트 + 데브로그 2개)로 화면 확인
디자인은 심플, 다크 기본, 모바일 우선. 단계마다 커밋. 커밋 본문에 "왜" 포함.
```

세션 2 — 수집·생성 파이프라인:
```
scripts/collect.ts: Octokit으로 내 계정에서 topic "vibelog" 레포를 모두 찾고,
content/state.json의 체크포인트 이후 커밋(메시지·변경 파일), 머지된 PR, devlog/*.md,
README, description, homepage, language, 루트의 vibelog.json을 수집해.
scripts/generate.ts: 수집 결과를 Claude API에 넘겨 레포별로 하루치 데브로그를
존댓말 한국어로 쓰고 영어 번역도 붙여 content/devlog/<repo>/<date>.md로 저장.
활동 없는 레포는 건너뛰어. projects.json과 state.json 갱신.
.github/workflows/devlog.yml: cron 0 14 * * * + workflow_dispatch, 실행 후 변경분 커밋.
Secrets: ANTHROPIC_API_KEY, GH_PAT.
```

세션 3 — 전역 Stop 훅:
```
~/.claude/settings.json에 Stop 훅을 추가해. 세션 종료 시 현재 폴더가 git 레포면
devlog/YYYY-MM-DD.md에 "뭘 했다 / 왜 / 삽질 포인트 / 다음 할 것" 요약을 append.
커밋은 하지 마. 레포가 아니면 아무것도 하지 마.
```

## 8. 시작 전 소소한 결정

- 도메인: 처음엔 vibelog.vercel.app으로 충분. 나중에 vibelog.* 가용 확인.
- 데브로그 톤: 존댓말 (확정)
- 하루 단위 묶음 vs push 단위: 하루 단위로 시작 (글 수가 적당하고 cron 하나로 끝남)
